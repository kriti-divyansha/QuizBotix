import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const LiveQuizParticipant = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizState, setQuizState] = useState({
      questions: [],
      duration: null,
      startTime: null,
      participants: []
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setLoggedInUser(JSON.parse(storedUser));
    } else {
        // Redirect to a login page or show an error
        navigate('/live-quiz', { replace: true });
        return;
    }

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Participant connected to Socket.IO server with ID: ${newSocket.id}`);
      newSocket.emit('join_live_quiz', { sessionId, username: JSON.parse(localStorage.getItem('loggedInUser')).username });
    });

    newSocket.on('quiz_state_update', (data) => {
        console.log("Initial quiz state received:", data);
        setQuizState(data);
        setCurrentQuestionIndex(data.current_question_index);
        if (data.current_question_index !== -1) {
            setCurrentQuestion(data.questions[data.current_question_index]);
        }
    });

    newSocket.on('new_question', (data) => {
        console.log("New question received:", data);
        setCurrentQuestion(data.question);
        setCurrentQuestionIndex(data.questionIndex);
        setSelectedAnswer(null); // Reset answer selection
    });
    
    newSocket.on('live_leaderboard_update', (leaderboard) => {
        setQuizState(prev => ({ ...prev, participants: leaderboard }));
    });

    newSocket.on('quiz_ended', () => {
        console.log("Quiz ended.");
        navigate(`/live-results/${sessionId}`, { state: { participants: quizState.participants } });
    });

    newSocket.on('join_error', (error) => {
        console.error("Join error:", error);
        navigate('/live-quiz', { state: { error: error.error } });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, navigate]);

  const handleAnswerClick = (answerLetter) => {
      if (selectedAnswer) return; // Prevent multiple submissions
      setSelectedAnswer(answerLetter);
      if (socket) {
          socket.emit('submit_live_answer', {
              sessionId,
              questionIndex: currentQuestionIndex,
              answer: answerLetter
          });
      }
  };

  if (!loggedInUser) {
    return <div className="text-center text-white text-xl">Please log in to join the quiz.</div>;
  }

  const currentQuestionNumber = currentQuestionIndex + 1;
  const totalQuestions = quizState.questions.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl space-y-8">
            {currentQuestionIndex === -1 ? (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Waiting for the host to start the quiz...</h2>
                    <p className="mt-2 text-xl text-gray-300">Session ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded-md">{sessionId}</span></p>
                    <div className="bg-gray-700 p-4 rounded-lg shadow-inner mt-6">
                        <h3 className="text-xl font-semibold mb-2">Connected Participants ({quizState.participants.length})</h3>
                        <ul className="space-y-2 text-left p-4 max-h-60 overflow-y-auto">
                            {quizState.participants.map(p => (
                                <li key={p.id} className="bg-gray-600 p-2 rounded-md">{p.username}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-indigo-400 font-bold mb-2">Question {currentQuestionNumber} of {totalQuestions}</p>
                        <h2 className="text-2xl font-bold">{currentQuestion?.question_text}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion?.options && Object.entries(currentQuestion.options).map(([letter, text]) => (
                            <button
                                key={letter}
                                onClick={() => handleAnswerClick(letter)}
                                className={`p-4 rounded-lg text-left transition-colors font-semibold disabled:cursor-not-allowed
                                    ${selectedAnswer === letter ? 'bg-indigo-600 border-2 border-indigo-400' : 'bg-gray-700 hover:bg-gray-600'}
                                `}
                                disabled={selectedAnswer !== null}
                            >
                                <span className="font-bold text-indigo-300 mr-2">{letter}.</span> {text}
                            </button>
                        ))}
                    </div>
                    
                    <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
                        <h3 className="text-xl font-bold mb-4">Live Leaderboard</h3>
                        <ul className="space-y-2">
                            {quizState.participants.map((p, index) => (
                                <li key={p.id} className="flex justify-between items-center bg-gray-600 p-3 rounded-md">
                                    <span className="font-bold text-lg text-indigo-300">{index + 1}. {p.username}</span>
                                    <span className="text-xl font-bold text-green-400">{p.score}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default LiveQuizParticipant;