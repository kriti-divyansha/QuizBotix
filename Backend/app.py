from gevent import monkey
monkey.patch_all()

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import requests
import os
from dotenv import load_dotenv
import json
import uuid
import datetime
import re

load_dotenv()
app = Flask(__name__)

# ✅ FIX 1: SameSite must be 'None' (not 'Lax') for cross-site cookies
# Vercel frontend + Render backend = two different domains = cross-site
# Browsers block cookies with SameSite=Lax across different domains
FRONTEND_URLS = [
    "https://quiz-botix-kritis-projects-208ee7c8.vercel.app",
    "https://quiz-botix.vercel.app",
    "http://localhost:5173",  # Local dev (Vite default port)
    "http://localhost:3000",  # Local dev (CRA default port)
]

CORS(app,
     supports_credentials=True,
     origins=FRONTEND_URLS)  # ✅ FIX 2: Specify exact origins, not wildcard
                              # Wildcard '*' + credentials=True is rejected by browsers

_secret_key = os.getenv("FLASK_SECRET_KEY")
if not _secret_key:
    print("❌ ERROR: FLASK_SECRET_KEY not set in environment variables!")
    app.secret_key = 'a_fallback_dev_key_DO_NOT_USE_IN_PROD'
else:
    app.secret_key = _secret_key

print(f"🔑 Secret key loaded: '{app.secret_key[:5]}...'")

# ✅ FIX 3: SameSite='None' is required for cross-site cookie to work
# Without this, the session cookie from /generate-quiz is never sent
# back by the browser on the /submit-quiz call → "No player session found"
app.config['SESSION_COOKIE_SECURE'] = True      # Required when SameSite=None
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # ✅ Was 'Lax' — this was the bug
app.config['SESSION_PERMANENT'] = False

socketio = SocketIO(app,
                    cors_allowed_origins=FRONTEND_URLS,  # ✅ FIX 4: Match CORS origins
                    logger=False,
                    engineio_logger=False)

global_leaderboard_players = {}
server_side_quiz_store = {}


def get_sorted_leaderboard_for_frontend():
    players_list = [
        {
            "id": pid,
            "username": d["username"],
            "score": d["score"],
            "total_questions": d.get("total_questions", 0),
            "topic": d.get("topic", "General Knowledge"),
        }
        for pid, d in global_leaderboard_players.items()
    ]
    players_list.sort(key=lambda x: x['score'], reverse=True)
    return players_list[:10]


def strip_markdown_fences(text):
    """Robustly strip ```json ... ``` fences from Groq responses."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


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
    print("❌ ERROR: GROQ_API_KEY not set in environment variables!")


@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    if 'player_id' not in session:
        session['player_id'] = str(uuid.uuid4())
        print(f"👋 New player. Assigned ID: {session['player_id']}")

    data = request.get_json()
    topic = data.get('topic', 'General Knowledge')
    num_questions = data.get('count', 5)
    difficulty = data.get('difficulty', 'easy')

    print(f"📩 Topic: '{topic}', Questions: {num_questions}, Difficulty: {difficulty}")

    difficulty_hint = {
        "easy": "Make them relatively straightforward and widely known.",
        "medium": "Include some common and some slightly less common facts.",
        "hard": "Challenge the user with more obscure or detailed questions.",
    }.get(difficulty, "")

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
        "Respond with PURE JSON only. No markdown, no extra text."
    )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2000,
    }

    content = None
    try:
        print("📤 Sending request to Groq API...")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        groq_response_json = response.json()
        choices = groq_response_json.get("choices", [])

        if not choices:
            print("❌ No choices returned by Groq:", groq_response_json)
            return jsonify({"error": "Groq API returned no choices"}), 500

        content = (
            choices[0].get("message", {}).get("content") or
            choices[0].get("delta", {}).get("content")
        )

        if not content:
            print("❌ No content in Groq response:", groq_response_json)
            return jsonify({"error": "Groq API returned no content"}), 500

        print("🧠 Raw Groq response:")
        print(content)

        # ✅ Robust markdown stripping (handles \n variations)
        content = strip_markdown_fences(content)

        questions_raw = json.loads(content)

        if not isinstance(questions_raw, list) or not all(
            isinstance(q, dict) and 'question' in q and 'options' in q and 'answer' in q
            for q in questions_raw
        ):
            print("⚠️ Groq response JSON doesn't match expected quiz structure.")
            return jsonify({"error": "AI generated response in unexpected format"}), 500

        full_questions_for_server_store = []
        questions_for_frontend = []

        for q_raw in questions_raw:
            options_obj = {}
            for i, opt_str in enumerate(q_raw['options']):
                if len(opt_str) >= 3 and opt_str[1] == '.' and opt_str[0].isalpha():
                    letter = opt_str[0].upper()
                    text = opt_str[3:].strip()
                else:
                    letter = chr(65 + i)
                    text = opt_str.strip()
                options_obj[letter] = text

            full_questions_for_server_store.append({
                'question_text': q_raw['question'],
                'options': options_obj,
                'correct_option_letter': q_raw['answer'].upper(),
            })
            questions_for_frontend.append({
                'question_text': q_raw['question'],
                'options': options_obj,
            })

        quiz_id = str(uuid.uuid4())
        server_side_quiz_store[quiz_id] = {
            "questions": full_questions_for_server_store,
            "topic": topic,
            "generated_at": datetime.datetime.now(),
        }
        print(f"📝 Quiz stored: id='{quiz_id}', topic='{topic}'")

        if 'active_quizzes' not in session:
            session['active_quizzes'] = {}
        session['active_quizzes'][quiz_id] = {"topic": topic}
        session.modified = True

        response_data = {"quiz_id": quiz_id, "questions": questions_for_frontend}
        return jsonify(response_data)

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        error_details = "No specific details from Groq."
        try:
            groq_error_data = e.response.json()
            if "error" in groq_error_data:
                error_details = groq_error_data["error"].get("message", error_details)
        except json.JSONDecodeError:
            pass
        print(f"❌ Groq HTTP Error ({status_code}): {error_details}")
        return jsonify({"error": "Failed to communicate with AI service", "details": error_details}), 500

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}\nContent: {content}")
        return jsonify({"error": "AI response was not valid JSON. Please try again."}), 500

    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected server error occurred"}), 500


@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    quiz_id = data.get('quiz_id')
    user_answers_list = data.get('user_answers', [])
    username = data.get('username', 'Anonymous')

    if 'player_id' not in session:
        print("❌ Submit error: No player_id in session.")
        return jsonify({"error": "No player session found. Please generate a new quiz to start."}), 400

    player_id = session['player_id']

    if not quiz_id:
        return jsonify({"error": "Quiz ID missing"}), 400

    if 'active_quizzes' not in session or quiz_id not in session['active_quizzes']:
        print(f"❌ Quiz ID '{quiz_id}' not in session.")
        return jsonify({"error": "Quiz session reference not found. Please generate a new quiz."}), 404

    stored_quiz_data = server_side_quiz_store.get(quiz_id)
    print(f"🔍 Quiz lookup '{quiz_id}': Found = {stored_quiz_data is not None}")

    if not stored_quiz_data or "questions" not in stored_quiz_data:
        print("❌ Quiz not in server store — may have expired or server restarted.")
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

        if q_index is None:
            print(f"⚠️ Invalid answer format: {user_ans_obj}")
            continue

        if 0 <= q_index < len(stored_questions):
            correct_question_data = stored_questions[q_index]
            correct_answer_letter = correct_question_data['correct_option_letter']
            all_options = correct_question_data['options']

            user_selected_text = (
                all_options.get(user_selected_letter.upper(), "Not answered")
                if user_selected_letter else "Not answered"
            )
            correct_answer_text = all_options.get(correct_answer_letter.upper(), f"Option {correct_answer_letter}")

            is_correct = (
                user_selected_letter is not None and
                user_selected_letter.upper() == correct_answer_letter.upper()
            )

            if is_correct:
                score += 1

            results_for_frontend.append({
                "question_index": q_index,
                "question_text": correct_question_data['question_text'],
                "options": all_options,
                "user_selected_letter": user_selected_letter.upper() if user_selected_letter else None,
                "user_selected_text": user_selected_text,
                "correct_letter": correct_answer_letter.upper(),
                "correct_text": correct_answer_text,
                "is_correct": is_correct,
            })
        else:
            print(f"⚠️ Question index {q_index} out of bounds.")
            results_for_frontend.append({"error": "Question index out of bounds", "question_index": q_index})

    total_questions = len(stored_questions)
    print(f"✅ Quiz submitted. Player '{player_id}' ({username}). Score: {score}/{total_questions}")

    global_leaderboard_players[player_id] = {
        "username": username,
        "score": score,
        "total_questions": total_questions,
        "topic": quiz_topic,
        "timestamp": datetime.datetime.now().isoformat(),
    }

    # ✅ FIX 5: Broadcast to ALL clients, not hardcoded room 'quiz123'
    socketio.emit('updateLeaderboard', get_sorted_leaderboard_for_frontend())

    if quiz_id in server_side_quiz_store:
        del server_side_quiz_store[quiz_id]
        print(f"🗑️ Quiz {quiz_id} removed from store.")

    if 'active_quizzes' in session and quiz_id in session['active_quizzes']:
        del session['active_quizzes'][quiz_id]
        session.modified = True

    return jsonify({
        "score": score,
        "total_questions": total_questions,
        "results": results_for_frontend,
    })


@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    return jsonify(get_sorted_leaderboard_for_frontend())


if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
