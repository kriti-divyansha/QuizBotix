import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuizQuestions from './QuizQuestions';
import QuizResults from './QuizResults';

// const socket = io('http://localhost:5000'); // Connect to your backend socket

const QuizPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Retrieve data passed from Home component
    const { questions: initialQuestions, quizId: initialQuizId, loggedInUser, topic, difficulty, count } = location.state || {};

    // --- NEW: Timer Configuration ---
    // Assuming 30 seconds per question for 5 questions = 150 seconds (2:30)
    // You can adjust this based on the complexity of your AI-generated questions.
    const TOTAL_TIME_SECONDS = count * 30 || 300; 

    // Quiz Game States (now managed in QuizPage)
    const [questions] = useState(initialQuestions || []);
    const [quizId] = useState(initialQuizId);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizResults, setQuizResults] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_SECONDS); // NEW

    // UI/Loading States
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    // const [leaderboard, setLeaderboard] = useState([]); // NEW: For real-time updates

    // --- NEW: Calculate Progress ---
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    
    // --- NEW: Redirect if no quiz data or results are already present ---
    useEffect(() => {
        if (!initialQuestions || !initialQuizId || !loggedInUser) {
            setError("No quiz data found. Redirecting to home.");
            const timer = setTimeout(() => navigate('/', { state: { loggedInUser } }), 3000);
            return () => clearTimeout(timer);
        }
        
        // --- Socket.IO setup (Placeholder for multiplayer) ---
        // if (quizId && loggedInUser && !quizResults) {
        //     socket.emit('join_quiz', { quizId, userId: loggedInUser.email });
        //     socket.on('update_leaderboard', (newLeaderboard) => {
        //         setLeaderboard(newLeaderboard);
        //     });
        // }
        // return () => {
        //     socket.off('update_leaderboard');
        // };
    }, [initialQuestions, initialQuizId, loggedInUser, navigate, quizId, quizResults]);

    // --- NEW: Timer Effect ---
    useEffect(() => {
        let timerInterval;
        if (!quizResults && questions.length > 0) { // Start timer only when quiz is active
            timerInterval = setInterval(() => {
                setTimeRemaining(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerInterval);
                        handleSubmitQuiz(true); // Auto-submit when time runs out
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerInterval); // Cleanup on unmount or when quiz is finished
    }, [quizResults, questions.length]); 

    // Format time remaining for display (MM:SS)
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Quiz Answer Handling
    const handleOptionChange = useCallback((questionIndex, selectedOptionLetter) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionIndex]: selectedOptionLetter,
        }));
        
        // --- NEW: Emit answer to server for real-time scoring (if using Socket.IO) ---
        // if (socket.connected) {
        //     socket.emit('submit_answer', {
        //         quizId,
        //         userId: loggedInUser.email,
        //         questionIndex,
        //         answer: selectedOptionLetter,
        //         time: TOTAL_TIME_SECONDS - timeRemaining // Calculate speed bonus factor
        //     });
        // }
    }, [/* timeRemaining, loggedInUser.email, quizId, TOTAL_TIME_SECONDS */]); // dependencies for socket.io

    // Quiz Submission Logic
    const handleSubmitQuiz = async (timeOut = false) => {
        if (timeOut && answeredCount < questions.length) {
            // Fill in unanswered questions with a placeholder (e.g., null)
            const incompleteAnswers = questions.reduce((acc, _, index) => {
                if (!userAnswers.hasOwnProperty(index)) {
                    acc[index] = null; // Mark as unanswered
                }
                return acc;
            }, userAnswers);
            setUserAnswers(incompleteAnswers);
        }
        
        if (!quizId || !loggedInUser || (answeredCount < questions.length && !timeOut)) {
             if (!timeOut) setError('Please answer all questions before submitting.');
             return;
        }

        const answersToSend = questions.map((_, index) => ({
             question_index: index,
             selected_option_letter: userAnswers[index] || null, // Ensure all questions are accounted for
        }));
        
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
                    time_taken_seconds: TOTAL_TIME_SECONDS - timeRemaining, // NEW: Send time taken
                }),
                credentials: 'include'
            });

            const data = await res.json();
            if (res.ok && data.score !== undefined) {
                setQuizResults(data);

                // Save quiz to user history in localStorage
                const quizResultForHistory = {
                    topic: topic,
                    difficulty: difficulty,
                    score: data.score,
                    totalQuestions: data.total_questions,
                    date: new Date().toISOString(),
                    quizId: quizId,
                };
                const userHistoryKey = `quizHistory_${loggedInUser.email}`;
                const existingHistory = JSON.parse(localStorage.getItem(userHistoryKey) || '[]');
                const updatedHistory = [quizResultForHistory, ...existingHistory];
                localStorage.setItem(userHistoryKey, JSON.stringify(updatedHistory));

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

    const handleGenerateNewQuiz = useCallback(() => {
        navigate('/', { state: { loggedInUser } });
    }, [navigate, loggedInUser]);


    if (!questions.length && !error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-xl text-white">Loading quiz or redirecting...</p>
            </div>
        );
    }
    
    // Determine the color of the timer based on time remaining
    const timerColor = timeRemaining <= 10 ? 'text-red-500' : timeRemaining <= 60 ? 'text-yellow-500' : 'text-green-500';

    return (
        <div className="min-h-screen bg-gray-900 text-white py-9">
            {/* Inner content container */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-auto flex flex-col h-full text-gray-900">
                <h1 className="text-3xl font-extrabold mb-2 text-center text-blue-800 drop-shadow-sm">
                    {topic ? topic.toUpperCase() : "QUIZ"}
                </h1>
                <div className={`text-sm text-center font-medium mb-6 ${quizResults ? 'hidden' : ''}`}>
                    Difficulty: <span className="text-indigo-600 capitalize">{difficulty}</span> • Total Questions: {questions.length}
                </div>

                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                
                {/* Status Bar: Progress & Timer */}
                {!quizResults && (
                    <div className="mb-6 space-y-3">
                        {/* Timer */}
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-medium text-gray-600">Time Left</span>
                            <span className={`text-2xl font-bold ${timerColor}`}>{formatTime(timeRemaining)}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${progressPercentage}%` }}
                                title={`${answeredCount} of ${questions.length} Answered`}
                            ></div>
                        </div>
                        <div className="text-right text-xs text-gray-500 font-medium">
                            {answeredCount}/{questions.length} Answered
                        </div>
                    </div>
                )}
                

                {quizResults ? (
                    // === RESULTS VIEW ===
                    <QuizResults
                        results={quizResults}
                        onGenerateNewQuiz={handleGenerateNewQuiz}
                        topic={topic} // Pass topic for better results display
                        difficulty={difficulty} // Pass difficulty
                    />
                ) : (
                    // === QUIZ VIEW ===
                    <>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar"> {/* Added custom-scrollbar class for styling */}
                            <QuizQuestions
                                questions={questions}
                                userAnswers={userAnswers}
                                onOptionChange={handleOptionChange}
                                submitting={submitting}
                            />
                        </div>
                        
                        {/* Submission Button */}
                        <div className="mt-6">
                            <button
                                onClick={() => handleSubmitQuiz(false)} // Explicitly not a timeout submission
                                disabled={submitting || answeredCount !== questions.length}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all py-3 rounded-lg font-bold text-white text-lg disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                {submitting ? 'Submitting Score...' : 'Finish & See Results'}
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                You must answer all {questions.length} questions to submit.
                            </p>
                        </div>
                    </>
                )}
            </div>
            
            {/* Real-time Leaderboard Placeholder (Optional, highly recommended for myquiz.org style) */}
            {/*
            {!quizResults && (
                <div className="mt-8 max-w-xs mx-auto p-4 bg-gray-800 rounded-lg shadow-xl border border-blue-400">
                    <h3 className="text-xl font-bold text-blue-400 mb-4 text-center">Live Leaderboard</h3>
                    {leaderboard.length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-1 text-gray-300">
                            {leaderboard.slice(0, 5).map((player, index) => (
                                <li key={player.id} className={`${player.id === loggedInUser.email ? 'text-yellow-400 font-bold' : ''}`}>
                                    {player.name}: {player.score}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-gray-500 text-center">Start playing to see real-time scores!</p>
                    )}
                </div>
            )}
            */}
        </div>
    );
};

export default QuizPage;
