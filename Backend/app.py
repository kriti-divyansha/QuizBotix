from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room # Added join_room, leave_room
import requests
import os
from dotenv import load_dotenv
import json
import uuid
import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)

_secret_key = os.getenv("FLASK_SECRET_KEY")

if not _secret_key:
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print("!! ERROR: FLASK_SECRET_KEY environment variable NOT SET!         !!")
    print("!! Sessions will NOT WORK and will be INSECURE.                  !!")
    print("!! Please set FLASK_SECRET_KEY in your .env file                 !!")
    print("!! (e.g., FLASK_SECRET_KEY='a_very_long_and_random_string')      !!")
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    app.secret_key = 'a_fallback_dev_key_if_not_set_but_avoid_this_in_prod'
else:
    app.secret_key = _secret_key

print(f"🔑 Flask app.secret_key set to: '{app.secret_key[:5]}...' (truncated for security, ensure it's long and from .env)")

socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# --- Live Leaderboard Data Store (In-memory for simplicity) ---
# In a real application, this would be a database.
# Using a dictionary to map player_id to their details for easy updates
global_leaderboard_players = {} # {player_id: {"username": ..., "score": ..., "total_questions": ..., "timestamp": ..., "topic": ...}}

# Function to get sorted leaderboard for emission
def get_sorted_leaderboard_for_frontend():
    # Convert dict values to a list and simplify for frontend
    players_list = []
    for player_id, data in global_leaderboard_players.items():
        players_list.append({
            "id": player_id, # Frontend expects 'id'
            "username": data["username"],
            "score": data["score"],
            "total_questions": data.get("total_questions", 0), # Include total_questions
            "topic": data.get("topic", "General Knowledge") # Include topic
        })
    # Sort by score in descending order
    players_list.sort(key=lambda x: x['score'], reverse=True)
    return players_list[:10] # Keep only top 10 for display

# --- SocketIO Event Handlers ---
@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)
    # When a new client connects, send them the current leaderboard state
    emit('updateLeaderboard', get_sorted_leaderboard_for_frontend())

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)
    # Optional: Remove player from leaderboard if disconnected, though typically not done for leaderboards
    # unless you want to track active players. For scores, they persist.

@socketio.on('joinRoom')
def handle_join_room(data):
    # For a global leaderboard, the room concept might be less critical.
    # However, if you plan to extend to quiz-specific leaderboards, keep this.
    room_id = data.get('roomId')
    username = data.get('username')
    join_room(room_id)
    print(f"Client {request.sid} ({username}) joined room: {room_id}")
    # Immediately send the current leaderboard to the newly joined client
    emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room=room_id)

@socketio.on('updateScore')
def handle_update_score(data):
    # This handler is mainly for your frontend's "Simulate Score" button.
    # In a real app, the score update for the leaderboard would come from /submit-quiz
    room_id = data.get('roomId', 'quiz123') # Default room_id
    score_change = data.get('score', 0)
    
    # You'll need a way to identify the player uniquely. For simulation, use sid
    player_id = request.sid
    username = data.get('username', f"Player_{request.sid[:4]}") # Use provided username or generate one

    if player_id not in global_leaderboard_players:
        global_leaderboard_players[player_id] = {
            "username": username,
            "score": 0,
            "total_questions": 0, # Not relevant for simulated score
            "topic": "Simulated"
        }
    
    global_leaderboard_players[player_id]["score"] += score_change
    print(f"Simulated score update for {username} (ID: {player_id}): new score {global_leaderboard_players[player_id]['score']}")

    # Emit the updated leaderboard to all clients in the room (or globally if no room)
    socketio.emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room=room_id)


# --- Existing Groq API and Quiz Generation Logic ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY environment variable not set. Please set it in your .env file or environment.")
    exit(1)


@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    topic = data.get('topic', 'General Knowledge')

    print(f"📩 Topic received from frontend: '{topic}'")

    prompt = (
        f"Generate 5 multiple choice quiz questions on the topic '{topic}'. "
        "Each question should have 4 options (A, B, C, D) and clearly specify the correct answer using the option letter (e.g., 'A', 'B'). "
        "Respond strictly in a JSON array format. Each object in the array should have 'question' (string), 'options' (array of strings), and 'answer' (string, the correct option letter). "
        "Example JSON structure:\n"
        "[\n"
        "   {\n"
        "     \"question\": \"What is the capital of France?\",\n"
        "     \"options\": [\"A. Berlin\", \"B. Paris\", \"C. Rome\", \"D. Madrid\"],\n"
        "     \"answer\": \"B\"\n"
        "   },\n"
        "   {\n"
        "     \"question\": \"Which planet is known as the Red Planet?\",\n"
        "     \"options\": [\"A. Earth\", \"B. Mars\", \"C. Jupiter\", \"D. Venus\"],\n"
        "     \"answer\": \"B\"\n"
        "   }\n"
        "]\n"
        "Note: Ensure the response is pure JSON, without any preceding or trailing text like markdown code blocks (```json) or conversational phrases."
    )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama3-70b-8192",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2000
    }

    try:
        print("📤 Sending payload to Groq API:")
        print(json.dumps(payload, indent=2))

        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        groq_response_json = response.json()
        content = groq_response_json["choices"][0]["message"]["content"]
        
        print("🧠 Raw Groq response content (before JSON parsing):")
        print(content)

        questions = json.loads(content)
        
        if not isinstance(questions, list) or not all(isinstance(q, dict) and 'question' in q and 'options' in q and 'answer' in q for q in questions):
            print("⚠️ Warning: Groq response was JSON, but didn't match expected quiz structure.")
            return jsonify({"error": "AI generated response in unexpected format"}), 500

        quiz_id = str(uuid.uuid4())
        session[quiz_id] = {"questions": questions, "topic": topic}
        print(f"📝 Quiz stored in session with ID: {quiz_id} and topic: {topic}")


        questions_for_frontend = []
        for q in questions:
            q_copy = q.copy()
            if 'answer' in q_copy:
                del q_copy['answer']
            questions_for_frontend.append(q_copy)

        response_data_to_send = {"quiz_id": quiz_id, "questions": questions_for_frontend}
        print("💡 Flask sending this JSON data to frontend:", json.dumps(response_data_to_send, indent=2))

        return jsonify(response_data_to_send)

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        reason = e.response.reason
        error_details = "No specific details from Groq."
        try:
            groq_error_data = e.response.json()
            if "error" in groq_error_data and "message" in groq_error_data["error"]:
                error_details = groq_error_data["error"]["message"]
            print(f"❌ Groq API HTTP Error ({status_code} {reason}): {error_details}")
            print(f"Groq Raw Error Response Body: {e.response.text}")
        except json.JSONDecodeError:
            print(f"❌ Groq API HTTP Error ({status_code} {reason}): Non-JSON error response from Groq.")
            print(f"Groq Raw Error Response Body: {e.response.text}")

        return jsonify({"error": "Failed to communicate with AI service", "details": error_details}), 500

    except json.JSONDecodeError as e:
        print(f"❌ Error parsing Groq response as JSON: {e}")
        print(f"Content that caused JSON error:\n{content}")
        return jsonify({"error": "AI response was not valid JSON. Please try again or refine the prompt."}), 500

    except Exception as e:
        print(f"❌ An unexpected server error occurred: {str(e)}")
        return jsonify({"error": "An unexpected server error occurred"}), 500

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    quiz_id = data.get('quiz_id')
    user_answers = data.get('user_answers', [])
    username = data.get('username', 'Anonymous') # Assume frontend sends a username

    if not quiz_id:
        print("❌ Submit error: Quiz ID missing in frontend payload.")
        return jsonify({"error": "Quiz ID missing"}), 400
    
    stored_quiz_data = session.get(quiz_id)
    print(f"🔍 Checking session for quiz_id '{quiz_id}': Found = {stored_quiz_data is not None}")

    if not stored_quiz_data or "questions" not in stored_quiz_data:
        print("❌ Error: Quiz not found in session for given ID or malformed. Session might have reset.")
        return jsonify({"error": "Quiz not found or expired. Please generate a new quiz."}), 404

    stored_questions = stored_quiz_data["questions"]
    quiz_topic = stored_quiz_data.get("topic", "General Knowledge")

    score = 0
    results = []

    for user_ans_obj in user_answers:
        q_index = user_ans_obj.get('question_index')
        selected_option = user_ans_obj.get('selected_option_letter')

        if q_index is None or selected_option is None:
            results.append({"error": "Invalid user answer format", "user_input": user_ans_obj})
            continue

        if 0 <= q_index < len(stored_questions):
            correct_question = stored_questions[q_index]
            correct_answer_letter = correct_question['answer']

            is_correct = (selected_option.upper() == correct_answer_letter.upper())
            
            if is_correct:
                score += 1
            
            results.append({
                "question_index": q_index,
                "user_selected": selected_option,
                "correct_answer": correct_answer_letter,
                "is_correct": is_correct,
                "question_text": correct_question['question']
            })
        else:
            results.append({"error": "Question index out of bounds", "question_index": q_index})
            
    total_questions = len(stored_questions)
    print(f"✅ Quiz submitted successfully for quiz_id '{quiz_id}'. Score: {score}/{total_questions} by {username}")

    # --- Update global leaderboard and emit ---
    player_id = request.sid # Use socket ID as unique player ID for this session
    global_leaderboard_players[player_id] = {
        "username": username,
        "score": score,
        "total_questions": total_questions,
        "topic": quiz_topic,
        "timestamp": datetime.datetime.now().isoformat()
    }

    # Emit the updated leaderboard to all clients (or a specific room if you decide to use rooms)
    # For now, we'll emit to a common room 'quiz123' if the frontend is always joining it.
    socketio.emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room='quiz123')


    return jsonify({"score": score, "total_questions": total_questions, "results": results})

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    # Provide the globally sorted leaderboard for initial fetch
    return jsonify(get_sorted_leaderboard_for_frontend())

if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)