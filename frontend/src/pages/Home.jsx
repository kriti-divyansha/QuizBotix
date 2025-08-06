import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from './login'; // Assuming login.jsx is login.jsx
import ProfileSidePanel from './ProfileSidePanel'; 

const Home = () => {
  console.log('Home component rendering...');

  // User/Auth States
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]); // New state for quiz history
  const [showSidePanel, setShowSidePanel] = useState(false); // New state for side panel visibility

  // Quiz Setup States
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(5);

  // UI/Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Load user and quiz history from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setLoggedInUser(user);
        // Load quiz history for the logged-in user
        const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
        if (storedHistory) {
          setQuizHistory(JSON.parse(storedHistory));
        }
      } catch (e) {
        console.error("Failed to parse stored user or history data from localStorage", e);
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('quizHistory_'); // Clear any corrupted history
      }
    }
    if (location.state && location.state.loggedInUser) {
      const userFromState = location.state.loggedInUser;
      setLoggedInUser(userFromState);
      const storedHistory = localStorage.getItem(`quizHistory_${userFromState.email}`);
      if (storedHistory) {
        setQuizHistory(JSON.parse(storedHistory));
      }
    }
  }, [location.state]);

  // Login/Logout Callbacks
  const handleLoginSuccess = useCallback((user) => {
    setLoggedInUser(user);
    setShowLoginForm(false);
    setError(null);
    // Load history when login is successful
    const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
    if (storedHistory) {
      setQuizHistory(JSON.parse(storedHistory));
    } else {
      setQuizHistory([]); // No history yet for this user
    }
    console.log("Logged in user:", user);
  }, []);

  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    localStorage.removeItem('loggedInUser');
    setQuizHistory([]); // Clear history on logout
    setShowLoginForm(false);
    setShowSidePanel(false); // Close panel on logout
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
      setError('Please log in to play the quiz and join the leaderboard.');
      setShowLoginForm(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count }),
        credentials: 'include'
      });

      const data = await res.json();
      console.log('Frontend received data:', data);

      if (res.ok && data.questions && data.quiz_id) {
        navigate('/quiz', {
            state: {
              questions: data.questions,
              quizId: data.quiz_id,
              loggedInUser: loggedInUser,
              topic: topic,
              difficulty: difficulty,
              count: count
            }
        });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-023E8A via-blue-300 to-indigo-900 text-white py-9">
      {/* Navbar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-15 px-10">
        <div>
          <h2 className="text-2xl font-bold text-white">🤖 QuizBotix</h2>
          <p className="text-sm text-yellow-50 italic">Smart Quizzing for Curious Minds</p>
        </div>

        <div className="mt-4 sm:mt-0 space-x-4">
          <button onClick={() => navigate('/about')} className="text-white hover:text-black font-medium transition">
            About
          </button>
          {loggedInUser ? (
            <>
              {/* Profile/History Button */}
              <button
                onClick={() => setShowSidePanel(true)}
                className="bg-blue-900 hover:bg-pink-700 py-2 px-2 rounded-lg text-white font-medium transition"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="bg-blue-900 hover:bg-pink-700 py-2 px-2 rounded-lg text-white font-medium transition"
              >
                Logout 
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-blue-900 hover:bg-black py-2 px-4 rounded-lg text-white font-medium transition"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginForm && !loggedInUser && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginForm(false)}
        />
      )}

      {/* Profile Side Panel */}
      {loggedInUser && 
        <ProfileSidePanel
          isOpen={showSidePanel}
          onClose={() => setShowSidePanel(false)}
          user={loggedInUser}
          quizHistory={quizHistory}
        />
      )}


      {/* Main Quiz Content */}
      {loggedInUser ? (
        <div className="flex items-center justify-center">
          <div className="bg-black p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <h1 className="text-4xl font-extrabold mb-6 text-center text-blue-300 drop-shadow-lg">
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
          </div>
        </div>
      ) : (
        // If not logged in, show a friendly message prompting login
        <div className="text-center mt-12 p-6 rounded-lg bg-gray-900 max-w-md mx-auto shadow-xl">
            <p className="text-xl font-semibold text-indigo-200 mb-4">Welcome to QuizBotix!</p>
            <p className="text-gray-300 mb-6">Please log in to generate and play quizzes.</p>
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-blue-600 hover:bg-blue-800 py-3 px-8 rounded-lg text-white font-bold text-lg transition transform hover:scale-105"
            >
              Log In Now
            </button>
        </div>
      )}
      
    </div>
  );
};

export default Home;
