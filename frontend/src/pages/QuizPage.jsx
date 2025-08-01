import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuizQuestions from './QuizQuestions';
import QuizResults from './QuizResults';

const QuizPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Retrieve data passed from Home component
    const { questions: initialQuestions, quizId: initialQuizId, loggedInUser, topic, difficulty, count } = location.state || {};

    // Quiz Game States (now managed in QuizPage)
    const [questions, setQuestions] = useState(initialQuestions || []);
    const [quizId, setQuizId] = useState(initialQuizId);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizResults, setQuizResults] = useState(null);

    // UI/Loading States
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Redirect if no quiz data found (e.g., direct access or refresh without data)
    useEffect(() => {
        if (!initialQuestions || !initialQuizId || !loggedInUser) {
            setError("No quiz data found. Please generate a new quiz.");
            // Optionally redirect back to home after a delay
            const timer = setTimeout(() => navigate('/'), 3000);
            return () => clearTimeout(timer);
        }
    }, [initialQuestions, initialQuizId, loggedInUser, navigate]);

    // Quiz Answer Handling (moved from Home)
    const handleOptionChange = useCallback((questionIndex, selectedOptionLetter) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionIndex]: selectedOptionLetter,
        }));
    }, []);

    // Quiz Submission Logic (moved from Home)
    const handleSubmitQuiz = async () => {
        if (!quizId) {
            setError('No quiz to submit.');
            return;
        }
        if (!loggedInUser || !loggedInUser.name || !loggedInUser.email) { // Ensure email is present
            setError('User information missing. Please log in again.');
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
                credentials: 'include'
            });

            const data = await res.json();
            if (res.ok && data.score !== undefined && data.total_questions !== undefined) {
                setQuizResults(data);

                // --- NEW: Save quiz to user history in localStorage ---
                const quizResultForHistory = {
                    topic: topic,
                    difficulty: difficulty,
                    score: data.score,
                    totalQuestions: data.total_questions,
                    date: new Date().toISOString(), // Store as ISO string for easy parsing
                    quizId: quizId,
                    // You can add more details like specific answers if needed
                };

                // Get existing history for this user
                const userHistoryKey = `quizHistory_${loggedInUser.email}`;
                const existingHistory = JSON.parse(localStorage.getItem(userHistoryKey) || '[]');
                // Add the new quiz result to the history
                const updatedHistory = [quizResultForHistory, ...existingHistory]; // Add new quiz at the top
                localStorage.setItem(userHistoryKey, JSON.stringify(updatedHistory));
                // --- END NEW ---

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

    // Reset function to go back to generate a new quiz
    const handleGenerateNewQuiz = useCallback(() => {
        // This will take the user back to the Home page to start a new quiz
        navigate('/', { state: { loggedInUser } }); // Pass loggedInUser back to Home if needed
    }, [navigate, loggedInUser]);


    if (!questions.length && !error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-300 to-indigo-900 text-white py-9">
                <p className="text-xl text-center">Loading quiz or redirecting...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-300 to-indigo-900 text-white py-9">
            {/* Inner content container */}
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-3xl w-full mx-auto flex flex-col h-full">
                <h1 className="text-3xl font-extrabold mb-6 text-center text-purple-950 drop-shadow-lg">
                    {topic ? `${topic} Quiz` : "Your Quiz"}
                </h1>
                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                {quizResults ? (
                    <QuizResults
                        results={quizResults}
                        onGenerateNewQuiz={handleGenerateNewQuiz}
                    />
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto pr-2">
                            <QuizQuestions
                                questions={questions}
                                userAnswers={userAnswers}
                                onOptionChange={handleOptionChange}
                                submitting={submitting}
                            />
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={handleSubmitQuiz}
                                disabled={submitting || Object.keys(userAnswers).length !== questions.length}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all py-3 rounded-lg font-semibold text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Submitting...' : 'Submit Quiz'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QuizPage;