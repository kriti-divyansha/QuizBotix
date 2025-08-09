import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const loggedInUser = { username: 'QuizMaster123' };

const LiveQuizPage = () => {
  const navigate = useNavigate();
  const [isHosting, setIsHosting] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [quizId, setQuizId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinQuiz = () => {
    if (quizId.trim()) {
      // Navigate to the participant page, passing the session ID
      navigate(`/live-join/${quizId.trim()}`, { state: { loggedInUser } });
    }
  };

  // Handle a user hosting a new quiz
  const handleHostQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Make a POST request to your backend to create a live quiz session
      const response = await axios.post('http://localhost:5000/api/quizzes/live', {
        topic,
        difficulty,
        count: 10, // Assuming 10 questions for a live quiz
      });

      const { sessionId } = response.data;
      
      // Navigate to the host dashboard, passing the session ID and quiz details
      navigate(`/live-host/${sessionId}`, { state: { sessionId, loggedInUser, topic } });
    } catch (err) {
      console.error('Error creating live quiz:', err);
      setError('Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-xl w-full p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Live Quiz</h1>
        
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setIsHosting(true)}
            className={`py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
              isHosting ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Host a Quiz
          </button>
          <button
            onClick={() => setIsHosting(false)}
            className={`py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
              !isHosting ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Join a Quiz
          </button>
        </div>

        {/* Form for HOSTING a quiz */}
        {isHosting ? (
          <form onSubmit={handleHostQuiz} className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">Quiz Topic</label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Python, World History, etc."
                className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create & Host Quiz'}
            </button>
          </form>
        ) : (
          /* Form for JOINING a quiz */
          <div className="space-y-4">
            <div>
              <label htmlFor="quizId" className="block text-sm font-medium text-gray-300 mb-1">Enter Session ID</label>
              <input
                type="text"
                id="quizId"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                placeholder="Enter the 8-digit session ID"
                className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
                required
              />
            </div>
            <button
              onClick={handleJoinQuiz}
              className="w-full py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              Join Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveQuizPage;