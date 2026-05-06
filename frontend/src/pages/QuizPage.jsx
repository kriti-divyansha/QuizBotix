import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuizQuestions from './QuizQuestions';
import QuizResults from './QuizResults';

const QuizPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { questions: initialQuestions, quizId: initialQuizId, loggedInUser, topic, difficulty, count } = location.state || {};

    const TOTAL_TIME_SECONDS = (count && count > 0) ? count * 30 : 150;

    // ✅ FIX #1: All state
    const [questions] = useState(initialQuestions || []);
    const [quizId] = useState(initialQuizId);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizResults, setQuizResults] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_SECONDS);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // ✅ FIX #2: Refs to always have latest values inside closures (fixes stale closure bugs)
    const userAnswersRef = useRef(userAnswers);
    const timeRemainingRef = useRef(timeRemaining);
    const submittingRef = useRef(submitting);
    const quizResultsRef = useRef(quizResults);

    // Keep refs in sync with state
    useEffect(() => { userAnswersRef.current = userAnswers; }, [userAnswers]);
    useEffect(() => { timeRemainingRef.current = timeRemaining; }, [timeRemaining]);
    useEffect(() => { submittingRef.current = submitting; }, [submitting]);
    useEffect(() => { quizResultsRef.current = quizResults; }, [quizResults]);

    const answeredCount = Object.keys(userAnswers).length;
    const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    // ✅ FIX #3: Redirect if no quiz data (handles page refresh)
    useEffect(() => {
        if (!initialQuestions || !initialQuizId || !loggedInUser) {
            setError("No quiz data found. Redirecting to home...");
            const timer = setTimeout(() => navigate('/'), 3000);
            return () => clearTimeout(timer);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // Empty deps is intentional — only run once on mount

    // ✅ FIX #4: Stable submit function that reads from refs, not stale closure values
    const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
        // Prevent double submission
        if (submittingRef.current) return;
        // Don't submit if results already shown
        if (quizResultsRef.current) return;

        const currentAnswers = userAnswersRef.current;
        const currentTimeRemaining = timeRemainingRef.current;
        const currentAnsweredCount = Object.keys(currentAnswers).length;

        if (!isAutoSubmit && currentAnsweredCount < questions.length) {
            setError('Please answer all questions before submitting.');
            return;
        }

        // ✅ FIX #5: Build answers to send directly from ref (not from stale state)
        // No need to call setUserAnswers first — just build the payload directly
        const answersToSend = questions.map((_, index) => ({
            question_index: index,
            selected_option_letter: currentAnswers[index] || null,
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
                    username: loggedInUser?.name || 'Anonymous',
                    // ✅ FIX #6: Use ref for accurate time, not stale closure
                    time_taken_seconds: TOTAL_TIME_SECONDS - currentTimeRemaining,
                }),
                credentials: 'include',
            });

            const data = await res.json();

            if (res.ok && data.score !== undefined) {
                setQuizResults(data);

                // Save to localStorage history
                const quizResultForHistory = {
                    topic,
                    difficulty,
                    score: data.score,
                    totalQuestions: data.total_questions,
                    date: new Date().toISOString(),
                    quizId,
                };
                const userHistoryKey = `quizHistory_${loggedInUser?.email}`;
                const existingHistory = JSON.parse(localStorage.getItem(userHistoryKey) || '[]');
                localStorage.setItem(userHistoryKey, JSON.stringify([quizResultForHistory, ...existingHistory]));
            } else {
                setError(data.error || 'Failed to get quiz results from server.');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to submit quiz. Please check your network connection and ensure the backend is running.');
        } finally {
            setSubmitting(false);
        }
    }, [questions, quizId, loggedInUser, topic, difficulty, TOTAL_TIME_SECONDS]);
    // ✅ These deps are all stable (useState initial values, props) — no stale closure risk

    // ✅ FIX #7: Timer effect now uses stable handleSubmitQuiz (no stale closure)
    useEffect(() => {
        if (!initialQuestions || !initialQuizId) return; // Don't start timer without quiz data

        let timerInterval;
        if (!quizResults && questions.length > 0) {
            timerInterval = setInterval(() => {
                setTimeRemaining(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerInterval);
                        // ✅ handleSubmitQuiz is now stable (useCallback with stable deps)
                        handleSubmitQuiz(true);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerInterval);
    }, [quizResults, questions.length, handleSubmitQuiz, initialQuestions, initialQuizId]);

    const handleOptionChange = useCallback((questionIndex, selectedOptionLetter) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: selectedOptionLetter,
        }));
    }, []);

    const handleGenerateNewQuiz = useCallback(() => {
        navigate('/', { state: { loggedInUser } });
    }, [navigate, loggedInUser]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Show loading/error if no quiz data (e.g. after page refresh)
    if (!questions.length && !error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-xl text-white">Loading quiz...</p>
            </div>
        );
    }

    if (error && !questions.length) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center flex-col gap-4">
                <p className="text-xl text-red-400">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-blue-600 hover:bg-blue-700 py-2 px-6 rounded-lg text-white font-bold"
                >
                    Go Home
                </button>
            </div>
        );
    }

    const timerColor =
        timeRemaining <= 10 ? 'text-red-500' :
        timeRemaining <= 60 ? 'text-yellow-500' :
        'text-green-500';

    return (
        <div className="min-h-screen bg-gray-900 text-white py-9">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-auto flex flex-col h-full text-gray-900">
                <h1 className="text-3xl font-extrabold mb-2 text-center text-blue-800 drop-shadow-sm">
                    {topic ? topic.toUpperCase() : 'QUIZ'}
                </h1>
                <div className={`text-sm text-center font-medium mb-6 ${quizResults ? 'hidden' : ''}`}>
                    Difficulty: <span className="text-indigo-600 capitalize">{difficulty}</span> • Total Questions: {questions.length}
                </div>

                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                {!quizResults && (
                    <div className="mb-6 space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-medium text-gray-600">Time Left</span>
                            <span className={`text-2xl font-bold ${timerColor}`}>{formatTime(timeRemaining)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                                title={`${answeredCount} of ${questions.length} Answered`}
                            />
                        </div>
                        <div className="text-right text-xs text-gray-500 font-medium">
                            {answeredCount}/{questions.length} Answered
                        </div>
                    </div>
                )}

                {quizResults ? (
                    <QuizResults
                        results={quizResults}
                        onGenerateNewQuiz={handleGenerateNewQuiz}
                        topic={topic}
                        difficulty={difficulty}
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
                                onClick={() => handleSubmitQuiz(false)}
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
        </div>
    );
};

export default QuizPage;
