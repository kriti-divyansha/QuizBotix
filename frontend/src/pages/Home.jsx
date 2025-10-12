import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from './login'; 
import ProfileSidePanel from './ProfileSidePanel';

const Home = () => {
    // === 1. State Management ===
    
    // User/Auth States
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [quizHistory, setQuizHistory] = useState([]); 
    const [showSidePanel, setShowSidePanel] = useState(false); 

    // Quiz Setup States
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [count, setCount] = useState(5);
    const [quizType, setQuizType] = useState('self');
    // UI/Loading States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    // === 2. Initialization & Data Loading ===
    
    // Load user and quiz history from localStorage on component mount
    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setLoggedInUser(user);
                // Load history specific to the logged-in user
                const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
                if (storedHistory) {
                    setQuizHistory(JSON.parse(storedHistory));
                }
            } catch (e) {
                console.error("Failed to parse stored user or history data from localStorage", e);
                localStorage.removeItem('loggedInUser');
            }
        }
        // Handle navigation state if user was redirected back from QuizPage
        if (location.state && location.state.loggedInUser) {
            const userFromState = location.state.loggedInUser;
            setLoggedInUser(userFromState);
            // Ensure history is loaded if coming back from quiz page
            const storedHistory = localStorage.getItem(`quizHistory_${userFromState.email}`);
            if (storedHistory) {
                setQuizHistory(JSON.parse(storedHistory));
            }
        }
    }, [location.state]);

    // === 3. Authentication Callbacks ===
    
    const handleLoginSuccess = useCallback((user) => {
        setLoggedInUser(user);
        setShowLoginForm(false);
        setError(null);
        // Load history when login is successful
        const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
        if (storedHistory) {
            setQuizHistory(JSON.parse(storedHistory));
        } else {
            setQuizHistory([]);
        }
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

    // === 4. Quiz Generation Logic ===
    
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
            // NOTE: This call relies on your backend server running on port 5000
            const res = await fetch('http://localhost:5000/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, difficulty, count }),
                credentials: 'include'
            });

            const data = await res.json();

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

    // === 5. Rendered JSX (Expanded Layout) ===

    return (
        <div className="min-h-screen bg-gray-800 text-white"> 
            
            {/* Navbar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-5 px-10 border-b border-gray-800 sticky top-0 z-20 bg-gray-900 shadow-lg">
                 <div>
                     <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-400 to-pink-400">🤖 QuizBotix</h2>
                     <p className="text-sm text-yellow-50 italic">Smart Quizzing for Curious Minds</p>
                 </div>
                 <div className="mt-4 sm:mt-0 space-x-4">
                     <button onClick={() => navigate('/about')} className="text-white hover:text-blue-400 font-medium transition">
                         About
                     </button>
                     {loggedInUser ? (
                         <>
                             <button
                                 onClick={() => setShowSidePanel(true)}
                                 className="bg-blue-600 hover:bg-pink-700 py-2 px-3 rounded-lg text-white font-medium transition"
                             >
                                 Profile
                             </button>
                             <button
                                 onClick={handleLogout}
                                 className="bg-blue-600 hover:bg-pink-700 py-2 px-3 rounded-lg text-white font-medium transition"
                             >
                                 Logout 
                             </button>
                         </>
                     ) : (
                         <button
                             onClick={() => setShowLoginForm(true)}
                             className="bg-blue-600 hover:bg-blue-800 py-2 px-4 rounded-lg text-white font-bold transition"
                         >
                             Login
                         </button>
                     )}
                 </div>
            </div>

            {/* Modals and Side Panels */}
            {showLoginForm && (
                <LoginModal
                    onLoginSuccess={handleLoginSuccess}
                    onClose={() => setShowLoginForm(false)}
                />
            )}
            {loggedInUser && ( 
                <ProfileSidePanel
                    isOpen={showSidePanel}
                    onClose={() => setShowSidePanel(false)}
                    user={loggedInUser}
                    quizHistory={quizHistory}
                />
            )}

            {/* === 1. Hero Section === */}
            <div className="pt-20 pb-24 bg-gradient-to-b from-gray-700 to-gray-900">
                <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between">
                    <div className="lg:w-1/2 mb-10 lg:mb-0 text-center lg:text-left">
                        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-white mb-4">
                            The Fastest Way to <span className="text-blue-400">Generate</span> Any Quiz.
                        </h1>
                        <p className="text-xl text-gray-300 mb-8">
                            Instantly create custom trivia on any topic, challenge your friends, and track your performance with our AI-powered platform.
                        </p>
                        {!loggedInUser && (
                            <button
                                onClick={() => setShowLoginForm(true)}
                                className="bg-pink-600 hover:bg-pink-700 py-3 px-8 rounded-full text-white font-bold text-lg shadow-lg transition transform hover:scale-105"
                            >
                                Get Started - It's Free!
                            </button>
                        )}
                    </div>
                    
                    {/* Quiz Creation Form (Primary CTA for logged-in users) */}
                    <div className="lg:w-5/12 bg-gray-800 p-8 rounded-3xl shadow-2xl border border-blue-400">
                        <h2 className="text-3xl font-extrabold mb-6 text-center text-blue-300">
                            {loggedInUser ? 'Create Your Quiz' : 'Log In to Start'}
                        </h2>
                        {loggedInUser ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter quiz topic (e.g., 'Ancient Rome' or 'React Hooks')"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    {[5, 10, 15, 20].map((n) => (<option key={n} value={n}>{n} Questions</option>))}
                                </select>
                                <select
                                  value={quizType}
                                  onChange={(e) => setQuizType(e.target.value)}
                                  className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-400">
                                    <option value="self">Create for Myself</option>
                                    <option value="classroom">Create for Classroom/Community</option>
                                </select>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!topic || loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-lg font-bold text-white shadow-md disabled:opacity-50"
                                >
                                    {loading ? 'Generating...' : 'Generate Quiz'}
                                </button>

                                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-300 mb-6">Log in or sign up now to create unlimited custom quizzes!</p>
                                <button
                                    onClick={() => setShowLoginForm(true)}
                                    className="bg-pink-600 hover:bg-blue-600 py-3 px-8 rounded-lg text-white font-bold text-lg transition transform hover:scale-105"
                                >
                                    Log In / Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === 2. How It Works Section === */}
            <div className="py-20 px-6 md:px-20 bg-gray-900">
                <h2 className="text-4xl font-extrabold text-center mb-12 text-blue-400">How QuizBotix Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
                    {/* Step 1 */}
                    <div className="text-center p-6 rounded-xl border border-gray-700 hover:border-blue-400 transition-all">
                        <div className="text-5xl mb-4 text-pink-500">1️⃣</div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Input Your Topic</h3>
                        <p className="text-gray-400">Type any topic, set the difficulty, and choose the number of questions you want.</p>
                    </div>
                    {/* Step 2 */}
                    <div className="text-center p-6 rounded-xl border border-gray-700 hover:border-blue-400 transition-all">
                        <div className="text-5xl mb-4 text-pink-500">2️⃣</div>
                        <h3 className="text-2xl font-bold mb-2 text-white">AI Generates Quiz</h3>
                        <p className="text-gray-400">Our powerful LLM backend instantly creates unique, high-quality quiz questions.</p>
                    </div>
                    {/* Step 3 */}
                    <div className="text-center p-6 rounded-xl border border-gray-700 hover:border-blue-400 transition-all">
                        <div className="text-5xl mb-4 text-pink-500">3️⃣</div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Play and Compete</h3>
                        <p className="text-gray-400">Start the quiz, answer fast, and see your rank climb the **real-time leaderboard**!</p>
                    </div>
                </div>
            </div>

            {/* === 3. Features Section === */}
            <div className="px-6 md:px-20 py-20 bg-gray-800">
                <h2 className="text-4xl font-extrabold text-center mb-10 text-white">Platform Capabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    
                    {/* Card 1 */}
                    <div className="bg-gray-700 p-6 rounded-2xl shadow-xl border-t-4 border-blue-400">
                        <h3 className="text-xl font-bold mb-2 text-blue-400">🎯 AI-Generated Quizzes</h3>
                        <p className="text-gray-300">
                            Generate topic-based quizzes instantly using powerful Large Language Models (LLMs).
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-gray-700 p-6 rounded-2xl shadow-xl border-t-4 border-pink-500">
                        <h3 className="text-xl font-bold mb-2 text-pink-500">⚡ Real-Time Leaderboard</h3>
                        <p className="text-gray-300">
                            Compete live with other users through our Socket.IO-powered leaderboard and see scores update instantly.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-gray-700 p-6 rounded-2xl shadow-xl border-t-4 border-yellow-400">
                        <h3 className="text-xl font-bold mb-2 text-yellow-400">📊 Personalized History</h3>
                        <p className="text-gray-300">
                            Track your quiz attempts and performance through your own saved history, unique to your account.
                        </p>
                    </div>
                </div>
            </div>

            {/* === 4. Final Call to Action (CTA) Section === */}
            <div className="py-20 text-center bg-gray-900 border-t border-gray-700">
                <h2 className="text-4xl font-extrabold mb-4 text-white">Ready to Test Your Knowledge?</h2>
                <p className="text-xl text-gray-400 mb-8">Join thousands of users challenging themselves with QuizBotix.</p>
                <button
                    onClick={() => loggedInUser ? navigate('/') : setShowLoginForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 py-4 px-12 rounded-full text-white font-bold text-xl transition transform hover:scale-105 shadow-2xl"
                >
                    Start Your Quiz Now!
                </button>
            </div>

            {/* === 5. Footer === */}
            <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-20 border-t border-gray-700 z-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-lg font-bold text-blue-400">QuizBotix</h3>
                        <p className="text-sm">© 2025 All Rights Reserved.</p>
                    </div>
                    <div className="flex space-x-6">
                        <a href="/about" className="hover:text-white transition">About</a>
                        <a href="/contact" className="hover:text-white transition">Contact</a>
                        <a href="/privacy" className="hover:text-white transition">Privacy Policy</a>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default Home;
