import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const LiveQuizHost = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Host connected to session: ${sessionId}`);
      newSocket.emit('join_live_quiz', { sessionId, username: location.state.loggedInUser.username });
    });

    newSocket.on('participant_joined', (participant) => {
      console.log('Participant joined:', participant);
      setParticipants(prev => [...prev, participant]);
    });

    newSocket.on('quiz_state_update', (data) => {
        setQuestions(data.questions);
        setCurrentQuestionIndex(data.current_question_index);
        setParticipants(data.participants);
        if (data.current_question_index !== -1) {
            setCurrentQuestion(data.questions[data.current_question_index]);
        }
    });

    newSocket.on('new_question', (data) => {
      console.log('New question received:', data);
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
    });

    newSocket.on('live_leaderboard_update', (leaderboard) => {
      setParticipants(leaderboard);
    });

    newSocket.on('quiz_ended', () => {
      console.log("Quiz ended.");
      navigate(`/live-results/${sessionId}`, { state: { participants } });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, location.state, navigate]);

  const handleStartQuiz = () => {
    if (socket && questions.length > 0) {
        socket.emit('start_quiz', { sessionId });
    }
  };

  const handleNextQuestion = () => {
    if (socket) {
        socket.emit('next_question', { sessionId });
    }
  };

  const currentQuestionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-indigo-400">Live Quiz Session</h1>
          <p className="mt-2 text-xl text-gray-300">Session ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded-md">{sessionId}</span></p>
          <p className="mt-1 text-sm text-gray-400">Share this ID with your friends to join!</p>
        </div>

        {currentQuestionIndex === -1 ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Waiting for players...</h2>
            <div className="bg-gray-700 p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold mb-2">Participants ({participants.length})</h3>
              <ul className="space-y-2 text-left p-4 max-h-60 overflow-y-auto">
                {participants.map(p => (
                  <li key={p.id} className="bg-gray-600 p-2 rounded-md">{p.username}</li>
                ))}
              </ul>
            </div>
            {participants.length > 0 && (
              <button
                onClick={handleStartQuiz}
                className="mt-6 py-3 px-8 bg-green-500 hover:bg-green-600 transition-colors rounded-lg font-bold text-lg"
              >
                Start Quiz
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
              <p className="text-indigo-400 font-bold mb-2">Question {currentQuestionNumber} of {totalQuestions}</p>
              <h2 className="text-2xl font-bold">{currentQuestion?.question_text}</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion?.options && Object.entries(currentQuestion.options).map(([letter, text]) => (
                  <div key={letter} className="bg-gray-600 p-4 rounded-md">
                    <p className="text-lg"><span className="font-bold text-indigo-300">{letter}.</span> {text}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleNextQuestion}
              className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg font-bold text-lg disabled:opacity-50"
              disabled={currentQuestionNumber >= totalQuestions}
            >
              {currentQuestionNumber < totalQuestions ? "Next Question" : "End Quiz"}
            </button>
            
            <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
              <h3 className="text-xl font-bold mb-4">Live Leaderboard</h3>
              <ul className="space-y-2">
                {participants.map((p, index) => (
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

export default LiveQuizHost;