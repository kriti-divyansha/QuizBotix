import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  // Add a console log here to confirm the component is attempting to load
  console.log('Home component rendering...');

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [quizId, setQuizId] = useState(null); // New state to store quiz_id
  const [userAnswers, setUserAnswers] = useState({}); // New state for user selections {questionIndex: 'A'}
  const [quizResults, setQuizResults] = useState(null); // New state for quiz results
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // New state for submission loading
  const [error, setError] = useState(null);
  const [showLoginInfo, setShowLoginInfo] = useState(false);

  const navigate = useNavigate();

  // Function to handle generating the quiz
  const handleGenerate = async () => {
    if (!topic) {
      setError('Please enter a quiz topic.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuestions([]);
    setQuizId(null); // Reset quiz ID for new quiz
    setUserAnswers({}); // Clear user answers for new quiz
    setQuizResults(null); // Clear previous results
    setSubmitting(false); // Reset submitting state

    try {
      // Send difficulty and count to backend (Flask can use them in prompt if modified)
      const res = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count }),
      });

      const data = await res.json();
      console.log('Frontend received data:', data); // <-- KEEP THIS LINE FOR DEBUGGING
      
      if (res.ok && data.questions && data.quiz_id) {
        setQuestions(data.questions);
        setQuizId(data.quiz_id); // Store the quiz_id received from backend
      } else {
        setError(data.error || 'Invalid response from server. No questions or quiz ID received.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to connect to the quiz generation service. Please ensure the backend is running and accessible.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user selecting an answer
  const handleOptionChange = (questionIndex, selectedOptionLetter) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionIndex]: selectedOptionLetter,
    }));
  };

  // Function to handle submitting the quiz
  const handleSubmitQuiz = async () => {
    if (!quizId) {
      setError('No quiz to submit.');
      return;
    }

    // Prepare answers in the format expected by Flask backend
    const answersToSend = Object.keys(userAnswers).map(index => ({
      question_index: parseInt(index),
      selected_option_letter: userAnswers[index],
    }));

    // Basic validation: ensure all questions have been answered
    if (answersToSend.length !== questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5000/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          user_answers: answersToSend,
        }),
      });

      const data = await res.json();
      if (res.ok && data.score !== undefined && data.total_questions !== undefined) {
        setQuizResults(data); // Store quiz results
        // Optionally, clear questions and quizId if you want a fresh start
        // setQuestions([]); 
        // setQuizId(null);
      } else {
        setError(data.error || 'Failed to get quiz results from server.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit quiz. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-300 to-indigo-900 text-white px-4 py-6">
      {/* Navbar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 px-4">
        <div>
          <h2 className="text-2xl font-bold text-white">🤖 QuizBotix</h2>
          <p className="text-sm text-yellow-50 italic">Smart Quizzing for Curious Minds</p>
        </div>

        <div className="mt-4 sm:mt-0 space-x-4">
          <button onClick={() => navigate('/about')} className="text-blue-800 hover:text-black font-medium transition">
            About
          </button>
          <button
            onClick={() => setShowLoginInfo(!showLoginInfo)}
            className="bg-blue-900 hover:bg-black py-2 px-4 rounded-lg text-white font-medium transition"
          >
            Login
          </button>
        </div>
      </div>

      {/* Login Info Box */}
      {showLoginInfo && (
        <div className="max-w-md mx-auto bg-gray-950 border border-indigo-600 rounded-xl p-4 mb-6 text-sm text-gray-200 shadow-lg">
          <h3 className="text-lg font-bold text-indigo-400 mb-2">🔐 Login Info</h3>
          <p>This is a demo login system. Authentication is not active yet.</p>
          <p className="mt-2">✨ New users can simply click "Generate Quiz" without signing in.</p>
          <p className="mt-1">🔧 In future versions, we’ll add Google sign-in and user quiz history.</p>
        </div>
      )}

      {/* Quiz Form */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-950 p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-4xl font-extrabold mb-6 text-center text-indigo-300 drop-shadow-lg">
            Create Your Quiz
          </h1>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter quiz topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} Questions</option>
              ))}
            </select>

            <button
              onClick={handleGenerate}
              disabled={!topic || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-800 transition-all py-3 rounded-lg font-semibold text-white "
            >
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>

            {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
          </div>

          {/* Display quiz questions */}
          {questions.length > 0 && !quizResults && ( // Only show questions if no results yet
            <div className="mt-8 space-y-6">
              <h2 className="text-2xl font-bold text-center text-indigo-400">Quiz Questions</h2>
              {questions.map((q, i) => (
                <div key={i} className="bg-gray-800 p-4 rounded-lg">
                  <p className="mb-2">{i + 1}. {q.question}</p>
                  {q.options.map((opt, j) => {
                    const optionLetter = opt.split('. ')[0]; // Extract 'A', 'B', 'C', 'D'
                    return (
                      <div key={j} className="ml-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`q${i}`} // Unique name for each question's radio group
                            value={optionLetter} // Use the extracted letter as value
                            checked={userAnswers[i] === optionLetter} // Check if this option is selected
                            onChange={() => handleOptionChange(i, optionLetter)} // Call handler
                            className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          {opt}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* --- NEW: Submit Quiz Button --- */}
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting || Object.keys(userAnswers).length !== questions.length}
                className="w-full bg-blue-600 hover:bg-blue-800 transition-all py-3 rounded-lg font-semibold text-white mt-6"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          )}

          {/* --- NEW: Display Quiz Results --- */}
          {quizResults && (
            <div className="mt-8 space-y-6 text-center">
              <h2 className="text-3xl font-bold text-indigo-300 mb-4">Quiz Complete!</h2>
              <p className="text-xl">You scored <span className="text-yellow-400 font-extrabold">{quizResults.score}</span> out of <span className="text-yellow-400 font-extrabold">{quizResults.total_questions}</span>!</p>
              
              <div className="text-left space-y-4 mt-6">
                {quizResults.results.map((qResult, i) => (
                  <div key={i} className={`p-4 rounded-lg ${qResult.is_correct ? 'bg-green-900 border-2 border-green-700' : 'bg-red-900 border-2 border-red-700'}`}>
                    <p className="font-semibold mb-1">{qResult.question_index + 1}. {qResult.question_text}</p>
                    <p>Your answer: <span className="font-bold">{qResult.user_selected}</span></p>
                    <p>Correct answer: <span className="font-bold">{qResult.correct_answer}</span></p>
                    {qResult.is_correct ? (
                      <span className="text-green-300">✅ Correct!</span>
                    ) : (
                      <span className="text-red-300">❌ Incorrect.</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setQuestions([]);
                  setQuizId(null);
                  setUserAnswers({});
                  setQuizResults(null);
                  setTopic(''); // Clear topic for new quiz generation
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-800 transition-all py-3 rounded-lg font-semibold text-white mt-6"
              >
                Generate New Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;