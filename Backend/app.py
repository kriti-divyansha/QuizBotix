from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import requests
import os
from dotenv import load_dotenv
import json
import uuid
import datetime

load_dotenv()
app = Flask(__name__)

CORS(app, supports_credentials=True)

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

# For production with HTTPS, set this to True
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_PERMANENT'] = False

print(f"🔑 Flask app.secret_key set to: '{app.secret_key[:5]}...' (truncated for security, ensure it's long and from .env)")

socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

global_leaderboard_players = {}

# Server-side store for quiz data (cleared on server restart)
server_side_quiz_store = {}

def get_sorted_leaderboard_for_frontend():
    players_list = []
    for player_id, data in global_leaderboard_players.items():
        players_list.append({
            "id": player_id,
            "username": data["username"],
            "score": data["score"],
            "total_questions": data.get("total_questions", 0),
            "topic": data.get("topic", "General Knowledge")
        })
    players_list.sort(key=lambda x: x['score'], reverse=True)
    return players_list[:10]

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)
    emit('updateLeaderboard', get_sorted_leaderboard_for_frontend())

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

@socketio.on('joinRoom')
def handle_join_room(data):
    room_id = data.get('roomId')
    username = data.get('username')
    join_room(room_id)
    print(f"Client {request.sid} ({username}) joined room: {room_id}")
    emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room=room_id)


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY environment variable not set. Please set it in your .env file or environment.")
    pass

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    if 'player_id' not in session:
        session['player_id'] = str(uuid.uuid4())
        print(f"👋 New player detected. Assigned unique ID: {session['player_id']}")

    data = request.get_json()
    topic = data.get('topic', 'General Knowledge')
    num_questions = data.get('count', 5)
    difficulty = data.get('difficulty', 'easy')

    print(f"📩 Topic received: '{topic}', Questions: {num_questions}, Difficulty: {difficulty}")

    difficulty_hint = ""
    if difficulty == "easy":
        difficulty_hint = "Make them relatively straightforward and widely known."
    elif difficulty == "medium":
        difficulty_hint = "Include some common and some slightly less common facts."
    elif difficulty == "hard":
        difficulty_hint = "Challenge the user with more obscure or detailed questions."

    prompt = (
        f"Generate {num_questions} multiple choice quiz questions on the topic '{topic}'. "
        f"{difficulty_hint} "
        "Each question should have 4 options (A, B, C, D) and clearly specify the correct answer using the option letter (e.g., 'A', 'B'). "
        "The options should be formatted with the letter prefix (e.g., 'A. Option Text'). "
        "Respond strictly in a JSON array format. Each object in the array should have 'question' (string), "
        "'options' (an array of strings like ['A. Option1', 'B. Option2']), and 'answer' (string, the correct option letter). "
        "Example JSON structure:\n"
        "[\n"
        "  {\n"
        "    \"question\": \"What is the capital of France?\",\n"
        "    \"options\": [\"A. Berlin\", \"B. Paris\", \"C. Rome\", \"D. Madrid\"],\n"
        "    \"answer\": \"B\"\n"
        "  }\n"
        "]\n"
        "Note: Ensure the response is pure JSON, without any extra text or markdown."
    )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.3-70b-versatile",   # ✅ use a supported model
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2000
    }

    try:
        print("📤 Sending payload to Groq API...")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        groq_response_json = response.json()

        # ✅ Safe extraction to avoid recursion bug
        choices = groq_response_json.get("choices", [])
        if not choices:
            print("❌ No choices returned by Groq API:", groq_response_json)
            return jsonify({"error": "Groq API returned no choices"}), 500

        message = choices[0].get("message") or choices[0].get("delta") or {}
        content = message.get("content")

        if not content:
            print("❌ No content in Groq response:", groq_response_json)
            return jsonify({"error": "Groq API returned no content"}), 500

        print("🧠 Raw Groq response content (before JSON parsing):")
        print(content)

        if content.startswith("```json") and content.endswith("```"):
            content = content[7:-3].strip()
            print("✅ Cleaned markdown from Groq response.")

        # ✅ Protect JSON parsing
        try:
            questions_raw = json.loads(content)
        except Exception as e:
            print(f"❌ Failed to parse Groq response as JSON: {e}")
            print("Content received:\n", content)
            return jsonify({"error": "Groq response not valid JSON"}), 500

        if not isinstance(questions_raw, list) or not all(
            isinstance(q, dict) and 'question' in q and 'options' in q and 'answer' in q 
            for q in questions_raw
        ):
            print("⚠️ Warning: Groq response didn't match expected quiz structure.")
            return jsonify({"error": "AI generated response in unexpected format"}), 500

        # ✅ Transform into frontend + server store formats
        full_questions_for_server_store = []
        questions_for_frontend = []

        for q_raw in questions_raw:
            options_obj = {}
            for opt_str in q_raw['options']:
                if len(opt_str) >= 3 and opt_str[1] == '.' and opt_str[0].isalpha():
                    letter = opt_str[0].upper()
                    text = opt_str[3:].strip()
                    options_obj[letter] = text
                else:
                    letter = chr(65 + list(q_raw['options']).index(opt_str))
                    options_obj[letter] = opt_str.strip()

            full_questions_for_server_store.append({
                'question_text': q_raw['question'],
                'options': options_obj,
                'correct_option_letter': q_raw['answer'].upper()
            })

            questions_for_frontend.append({
                'question_text': q_raw['question'],
                'options': options_obj
            })

        quiz_id = str(uuid.uuid4())
        server_side_quiz_store[quiz_id] = {
            "questions": full_questions_for_server_store,
            "topic": topic,
            "generated_at": datetime.datetime.now()
        }
        print(f"📝 Quiz stored in server_side_quiz_store['{quiz_id}'] with topic: {topic}")

        if 'active_quizzes' not in session:
            session['active_quizzes'] = {}
        session['active_quizzes'][quiz_id] = {"topic": topic}
        session.modified = True

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
            print(f"❌ Groq API HTTP Error ({status_code} {reason}): Non-JSON error response.")
            print(f"Groq Raw Error Response Body: {e.response.text}")

        return jsonify({"error": "Failed to communicate with AI service", "details": error_details}), 500

    except Exception as e:
        print(f"❌ An unexpected server error occurred: {str(e)}")
        return jsonify({"error": "An unexpected server error occurred"}), 500

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    quiz_id = data.get('quiz_id')
    user_answers_list = data.get('user_answers', [])
    username = data.get('username', 'Anonymous')

    if 'player_id' not in session:
        print("❌ Submit error: Player ID not found in session.")
        return jsonify({"error": "No player session found. Please generate a new quiz to start."}), 400

    player_id = session['player_id'] # Use the persistent, unique ID from the session.

    if not quiz_id:
        print("❌ Submit error: Quiz ID missing in frontend payload.")
        return jsonify({"error": "Quiz ID missing"}), 400

    if 'active_quizzes' not in session or quiz_id not in session['active_quizzes']:
        print(f"❌ Error: Quiz ID '{quiz_id}' not found in browser session. Session might have reset or cookie ignored.")
        return jsonify({"error": "Quiz session reference not found. Please generate a new quiz."}), 404

    stored_quiz_data = server_side_quiz_store.get(quiz_id)

    print(f"🔍 Checking server_side_quiz_store for quiz_id '{quiz_id}': Found = {stored_quiz_data is not None}")

    if not stored_quiz_data or "questions" not in stored_quiz_data:
        print("❌ Error: Quiz not found in server-side store for given ID or malformed. Quiz might have expired or server restarted.")
        if 'active_quizzes' in session and quiz_id in session['active_quizzes']:
            del session['active_quizzes'][quiz_id]
            session.modified = True
        return jsonify({"error": "Quiz not found or expired. Please generate a new quiz."}), 404

    stored_questions = stored_quiz_data["questions"]
    quiz_topic = stored_quiz_data.get("topic", "General Knowledge")
    score = 0
    results_for_frontend = []

    for user_ans_obj in user_answers_list:
        q_index = user_ans_obj.get('question_index')
        user_selected_letter = user_ans_obj.get('selected_option_letter')

        if q_index is None or user_selected_letter is None:
            print(f"⚠️ Invalid user answer format received: {user_ans_obj}")
            continue

        if 0 <= q_index < len(stored_questions):
            correct_question_data = stored_questions[q_index]
            correct_answer_letter = correct_question_data['correct_option_letter']
            all_options_for_q = correct_question_data['options']
            user_selected_text = all_options_for_q.get(user_selected_letter.upper(), f"Option {user_selected_letter} (N/A)")
            correct_answer_text = all_options_for_q.get(correct_answer_letter.upper(), f"Option {correct_answer_letter} (N/A)")
            is_correct = (user_selected_letter.upper() == correct_answer_letter.upper())

            if is_correct:
                score += 1

            results_for_frontend.append({
                "question_index": q_index,
                "question_text": correct_question_data['question_text'],
                "options": all_options_for_q,
                "user_selected_letter": user_selected_letter.upper(),
                "user_selected_text": user_selected_text,
                "correct_letter": correct_answer_letter.upper(),
                "correct_text": correct_answer_text,
                "is_correct": is_correct,
            })
        else:
            print(f"⚠️ Question index {q_index} out of bounds for quiz {quiz_id}.")
            results_for_frontend.append({"error": "Question index out of bounds", "question_index": q_index})

    total_questions = len(stored_questions)
    print(f"✅ Quiz submitted successfully for player '{player_id}' ({username}). Score: {score}/{total_questions}")

    global_leaderboard_players[player_id] = {
        "username": username,
        "score": score,
        "total_questions": total_questions,
        "topic": quiz_topic,
        "timestamp": datetime.datetime.now().isoformat()
    }

    socketio.emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room='quiz123')

    if quiz_id in server_side_quiz_store:
        del server_side_quiz_store[quiz_id]
        print(f"DEBUG: Quiz {quiz_id} removed from server_side_quiz_store after submission.")

    if 'active_quizzes' in session and quiz_id in session['active_quizzes']:
        del session['active_quizzes'][quiz_id]
        session.modified = True
        print(f"DEBUG: Quiz {quiz_id} reference removed from session.")

    return jsonify({
        "score": score,
        "total_questions": total_questions,
        "results": results_for_frontend
    })

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    return jsonify(get_sorted_leaderboard_for_frontend())

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
