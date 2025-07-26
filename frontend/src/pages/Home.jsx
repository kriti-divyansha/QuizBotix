import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from './Leaderboard';
import LoginModal from './LoginModal';
import QuizQuestions from './QuizQuestions';
import QuizResults from './QuizResults';

const Home = () => {
  console.log('Home component rendering...');

  // User/Auth States
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false); // Controls visibility of the modal

  // Quiz Setup States
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(5);

  // Quiz Game States
  const [questions, setQuestions] = useState([]);
  const [quizId, setQuizId] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);

  // UI/Loading States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginInfo, setShowLoginInfo] = useState(false); // Keep this for the info box toggle

  const navigate = useNavigate();

  // Load user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        setLoggedInUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user data from localStorage", e);
        localStorage.removeItem('loggedInUser');
      }
    }
  }, []);

  // Login/Logout Callbacks
  const handleLoginSuccess = useCallback((user) => {
    setLoggedInUser(user);
    setShowLoginForm(false); // Close the modal
    setError(null);
    console.log("Logged in user:", user);
  }, []);

  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    localStorage.removeItem('loggedInUser');
    setShowLoginForm(false);
    setQuestions([]);
    setQuizId(null);
    setUserAnswers({});
    setQuizResults(null);
    setTopic('');
    setError(null);
  }, []);

  // Quiz Generation Logic
  const handleGenerate = async () => {
    if (!topic) {
      setError('Please enter a quiz topic.');
      return;
    }
    if (!loggedInUser) {
      setError('Please enter your name and email to play the quiz and join the leaderboard.');
      setShowLoginForm(true); // Show login form if not logged in
      return;
    }

    setLoading(true);
    setError(null);
    setQuestions([]);
    setQuizId(null);
    setUserAnswers({});
    setQuizResults(null);
    setSubmitting(false);

    try {
      const res = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count }),
      });

      const data = await res.json();
      console.log('Frontend received data:', data);

      if (res.ok && data.questions && data.quiz_id) {
        setQuestions(data.questions);
        setQuizId(data.quiz_id);
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

  // Quiz Answer Handling
  const handleOptionChange = useCallback((questionIndex, selectedOptionLetter) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionIndex]: selectedOptionLetter,
    }));
  }, []);

  // Quiz Submission Logic
  const handleSubmitQuiz = async () => {
    if (!quizId) {
      setError('No quiz to submit.');
      return;
    }
    if (!loggedInUser || !loggedInUser.name) {
      setError('User information missing. Please log in again.');
      setShowLoginForm(true);
      return;
    }

    const answersToSend = Object.keys(userAnswers).map(index => ({
      question_index: parseInt(index),
      selected_option_letter: userAnswers[index],
    }));

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
          username: loggedInUser.name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.score !== undefined && data.total_questions !== undefined) {
        setQuizResults(data);
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

  // Reset function for QuizResults to generate a new quiz
  const handleGenerateNewQuiz = useCallback(() => {
    setQuestions([]);
    setQuizId(null);
    setUserAnswers({});
    setQuizResults(null);
    setTopic('');
    setError(null);
  }, []);

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
          {loggedInUser ? (
            <button
              onClick={handleLogout}
              className="bg-red-700 hover:bg-red-900 py-2 px-4 rounded-lg text-white font-medium transition"
            >
              Logout ({loggedInUser.name})
            </button>
          ) : (
            // FIX IS HERE: This button should now show the LoginModal
            <button
              onClick={() => setShowLoginForm(true)} // Correctly sets showLoginForm to true
              className="bg-blue-900 hover:bg-black py-2 px-4 rounded-lg text-white font-medium transition"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Login Info Box */}
      <div className="max-w-md mx-auto bg-gray-950 border border-indigo-600 rounded-xl p-4 mb-6 text-sm text-gray-200 shadow-lg cursor-pointer"
           onClick={() => setShowLoginInfo(!showLoginInfo)} // Clickable to show/hide the info
      >
        <h3 className="text-lg font-bold text-indigo-400 mb-2">🔐 Login Info</h3>
        {showLoginInfo && ( // Only show details if showLoginInfo is true
          <>
            <p>This is a demo login system. Authentication is not active yet.</p>
            <p className="mt-2">✨ New users can simply click "Generate Quiz" after providing their name/email.</p>
            <p className="mt-1">🔧 In future versions, we’ll add Google sign-in and user quiz history.</p>
          </>
        )}
        {!showLoginInfo && <p className="text-gray-400">Click to read about login status...</p>}
      </div>


      {/* Login Modal */}
      {showLoginForm && !loggedInUser && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginForm(false)}
        />
      )}

      {/* Main Quiz Content */}
      {loggedInUser ? ( // Render quiz content ONLY if loggedInUser
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

            {/* Conditionally render Quiz Questions or Quiz Results */}
            {questions.length > 0 && !quizResults ? (
              <QuizQuestions
                questions={questions}
                userAnswers={userAnswers}
                onOptionChange={handleOptionChange}
                onSubmitQuiz={handleSubmitQuiz}
                submitting={submitting}
              />
            ) : quizResults ? (
              <QuizResults
                results={quizResults}
                onGenerateNewQuiz={handleGenerateNewQuiz}
              />
            ) : null}

          </div>
        </div>
      ) : (
        // If not logged in, show a friendly message prompting login
        <div className="text-center mt-12 p-6 rounded-lg bg-gray-900 max-w-md mx-auto shadow-xl">
            <p className="text-xl font-semibold text-indigo-200 mb-4">Welcome to QuizBotix!</p>
            <p className="text-gray-300 mb-6">Please log in to generate and play quizzes, and see your rank on the leaderboard.</p>
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-blue-600 hover:bg-blue-800 py-3 px-8 rounded-lg text-white font-bold text-lg transition transform hover:scale-105"
            >
              Log In Now
            </button>
        </div>
      )}


      {/* Leaderboard Section */}
      {loggedInUser && (
        <div className="mt-8 max-w-md mx-auto">
          <Leaderboard username={loggedInUser.name} />
        </div>
      )}
    </div>
  );
};

export default Home;