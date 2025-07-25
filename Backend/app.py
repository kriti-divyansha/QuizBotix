from flask import Flask, request, jsonify, session
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json
import uuid

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CRITICAL: Ensure FLASK_SECRET_KEY is loaded ONCE and is PERSISTENT ---
_secret_key = os.getenv("FLASK_SECRET_KEY")

if not _secret_key:
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print("!! ERROR: FLASK_SECRET_KEY environment variable NOT SET!         !!")
    print("!! Sessions will NOT WORK and will be INSECURE.                  !!")
    print("!! Please set FLASK_SECRET_KEY in your .env file                 !!")
    print("!! (e.g., FLASK_SECRET_KEY='a_very_long_and_random_string')       !!")
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    app.secret_key = 'a_fallback_dev_key_if_not_set_but_avoid_this_in_prod'
else:
    app.secret_key = _secret_key

# --- ADD THIS DEBUG PRINT ---
print(f"🔑 Flask app.secret_key set to: '{app.secret_key[:5]}...' (truncated for security, ensure it's long and from .env)")
# --- END DEBUG PRINT ---

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
        "  {\n"
        "    \"question\": \"What is the capital of France?\",\n"
        "    \"options\": [\"A. Berlin\", \"B. Paris\", \"C. Rome\", \"D. Madrid\"],\n"
        "    \"answer\": \"B\"\n"
        "  },\n"
        "  {\n"
        "    \"question\": \"Which planet is known as the Red Planet?\",\n"
        "    \"options\": [\"A. Earth\", \"B. Mars\", \"C. Jupiter\", \"D. Venus\"],\n"
        "    \"answer\": \"B\"\n"
        "  }\n"
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
        session[quiz_id] = questions # Store the full quiz data, including answers

        questions_for_frontend = []
        for q in questions:
            q_copy = q.copy()
            if 'answer' in q_copy:
                del q_copy['answer'] # Remove the answer before sending to frontend
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

    if not quiz_id:
        print("❌ Submit error: Quiz ID missing in frontend payload.")
        return jsonify({"error": "Quiz ID missing"}), 400
    
    stored_quiz = session.get(quiz_id)
    print(f"🔍 Checking session for quiz_id '{quiz_id}': Found = {stored_quiz is not None}")

    if not stored_quiz:
        print("❌ Error: Quiz not found in session for given ID. Session might have reset.")
        return jsonify({"error": "Quiz not found or expired. Please generate a new quiz."}), 404

    score = 0
    results = []

    for user_ans_obj in user_answers:
        q_index = user_ans_obj.get('question_index')
        selected_option = user_ans_obj.get('selected_option_letter')

        if q_index is None or selected_option is None:
            results.append({"error": "Invalid user answer format", "user_input": user_ans_obj})
            continue

        if 0 <= q_index < len(stored_quiz):
            correct_question = stored_quiz[q_index]
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
            
    print(f"✅ Quiz submitted successfully for quiz_id '{quiz_id}'. Score: {score}/{len(stored_quiz)}")
    return jsonify({"score": score, "total_questions": len(stored_quiz), "results": results})

if __name__ == '__main__':
    app.run(debug=False)