import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginInfo, setShowLoginInfo] = useState(false);

  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!topic) return;

    setLoading(true);
    setError(null);
    setQuestions([]);

    try {
      const res = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count }),
      });

      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
      } else {
        setError('Invalid response from server.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch quiz. Please try again.');
    } finally {
      setLoading(false);
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

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>

          {/* Display quiz questions */}
          {questions.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-2xl font-bold text-center text-indigo-400">Quiz Questions</h2>
              {questions.map((q, i) => (
                <div key={i} className="bg-gray-800 p-4 rounded-lg">
                  <p className="mb-2">{i + 1}. {q.question}</p>
                  {q.options.map((opt, j) => (
                    <div key={j} className="ml-4">
                      <label>
                        <input type="radio" name={`q${i}`} value={opt} className="mr-2" />
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
