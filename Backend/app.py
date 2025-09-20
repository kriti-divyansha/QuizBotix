from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import requests
import os
from dotenv import load_dotenv
import json
import uuid
import datetime
import traceback

# Load environment variables
load_dotenv()

# Flask app
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Secret key for sessions
_secret_key = os.getenv("FLASK_SECRET_KEY")
if not _secret_key:
    print("⚠️ FLASK_SECRET_KEY not set! Using fallback key (not safe for production).")
    app.secret_key = 'fallback_dev_key'
else:
    app.secret_key = _secret_key

# Session config
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_PERMANENT'] = False

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Global stores
global_leaderboard_players = {}
server_side_quiz_store = {}

# Groq API config
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
if not GROQ_API_KEY:
    print("❌ GROQ_API_KEY not set! Quiz generation will fail.")

# ---------------- Helper Functions ----------------
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

# ---------------- SocketIO Events ----------------
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

# ---------------- API Routes ----------------
@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    try:
        if 'player_id' not in session:
            session['player_id'] = str(uuid.uuid4())
            print(f"👋 New player detected. ID: {session['player_id']}")

        data = request.get_json()
        topic = data.get('topic', 'General Knowledge')
        num_questions = data.get('count', 5)
        difficulty = data.get('difficulty', 'easy')

        difficulty_hint = {
            "easy": "Make them relatively straightforward and widely known.",
            "medium": "Include some common and some slightly less common facts.",
            "hard": "Challenge the user with more obscure or detailed questions."
        }.get(difficulty, "")

        prompt = (
            f"Generate {num_questions} multiple choice quiz questions on the topic '{topic}'. "
            f"{difficulty_hint} Each question should have 4 options (A, B, C, D) and clearly specify the correct answer. "
            "Respond strictly in a JSON array with 'question', 'options' (array of strings), and 'answer' (correct letter)."
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

        print("📤 Sending request to Groq API...")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        groq_response_json = response.json()
        content = groq_response_json["choices"][0]["message"]["content"]

        if content.startswith("```json") and content.endswith("```"):
            content = content[7:-3].strip()

        questions_raw = json.loads(content)
        if not isinstance(questions_raw, list):
            return jsonify({"error": "AI response invalid format"}), 500

        full_questions = []
        questions_frontend = []

        for q_raw in questions_raw:
            options_obj = {}
            for opt_str in q_raw['options']:
                if len(opt_str) >= 3 and opt_str[1] == '.' and opt_str[0].isalpha():
                    options_obj[opt_str[0].upper()] = opt_str[3:].strip()
                else:
                    options_obj[chr(65 + list(q_raw['options']).index(opt_str))] = opt_str.strip()

            full_questions.append({
                "question_text": q_raw['question'],
                "options": options_obj,
                "correct_option_letter": q_raw['answer'].upper()
            })
            questions_frontend.append({
                "question_text": q_raw['question'],
                "options": options_obj
            })

        quiz_id = str(uuid.uuid4())
        server_side_quiz_store[quiz_id] = {
            "questions": full_questions,
            "topic": topic,
            "generated_at": datetime.datetime.now()
        }

        if 'active_quizzes' not in session:
            session['active_quizzes'] = {}
        session['active_quizzes'][quiz_id] = {"topic": topic}
        session.modified = True

        return jsonify({"quiz_id": quiz_id, "questions": questions_frontend})

    except Exception as e:
        print("❌ Error in /generate-quiz:")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred", "details": str(e)}), 500

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    try:
        data = request.get_json()
        quiz_id = data.get('quiz_id')
        user_answers_list = data.get('user_answers', [])
        username = data.get('username', 'Anonymous')

        if 'player_id' not in session:
            return jsonify({"error": "No player session found"}), 400
        player_id = session['player_id']

        stored_quiz = server_side_quiz_store.get(quiz_id)
        if not stored_quiz:
            return jsonify({"error": "Quiz not found or expired"}), 404

        score = 0
        results_frontend = []

        for user_ans in user_answers_list:
            q_index = user_ans.get('question_index')
            user_letter = user_ans.get('selected_option_letter')
            if q_index is None or user_letter is None:
                continue
            if 0 <= q_index < len(stored_quiz['questions']):
                q_data = stored_quiz['questions'][q_index]
                correct_letter = q_data['correct_option_letter']
                all_options = q_data['options']
                is_correct = user_letter.upper() == correct_letter.upper()
                if is_correct:
                    score += 1
                results_frontend.append({
                    "question_index": q_index,
                    "question_text": q_data['question_text'],
                    "options": all_options,
                    "user_selected_letter": user_letter.upper(),
                    "correct_letter": correct_letter.upper(),
                    "is_correct": is_correct
                })

        # Update leaderboard
        global_leaderboard_players[player_id] = {
            "username": username,
            "score": score,
            "total_questions": len(stored_quiz['questions']),
            "topic": stored_quiz.get("topic", "General Knowledge"),
            "timestamp": datetime.datetime.now().isoformat()
        }

        socketio.emit('updateLeaderboard', get_sorted_leaderboard_for_frontend(), room='quiz123')

        # Clean up
        server_side_quiz_store.pop(quiz_id, None)
        if 'active_quizzes' in session:
            session['active_quizzes'].pop(quiz_id, None)
            session.modified = True

        return jsonify({
            "score": score,
            "total_questions": len(stored_quiz['questions']),
            "results": results_frontend
        })

    except Exception as e:
        print("❌ Error in /submit-quiz:")
        traceback.print_exc()
        return jsonify({"error": "Unexpected error during quiz submission", "details": str(e)}), 500

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        return jsonify(get_sorted_leaderboard_for_frontend())
    except Exception as e:
        print("❌ Error in /leaderboard:")
        traceback.print_exc()
        return jsonify({"error": "Unexpected error fetching leaderboard", "details": str(e)}), 500

# ---------------- Main ----------------
if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
