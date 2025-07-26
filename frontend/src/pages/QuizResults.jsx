import React from 'react';

export default function QuizResults({ results, onGenerateNewQuiz }) {
  if (!results) {
    return null; // Don't render if no results
  }

  return (
    <div className="mt-8 space-y-6 text-center">
      <h2 className="text-3xl font-bold text-indigo-300 mb-4">Quiz Complete!</h2>
      <p className="text-xl">You scored <span className="text-yellow-400 font-extrabold">{results.score}</span> out of <span className="text-yellow-400 font-extrabold">{results.total_questions}</span>!</p>

      <div className="text-left space-y-4 mt-6">
        {results.results.map((qResult, i) => (
          <div key={i} className={`p-4 rounded-lg ${qResult.is_correct ? 'bg-green-900 border-2 border-green-700' : 'bg-red-900 border-2 border-red-700'}`}>
            <p className="font-semibold mb-1">{qResult.question_index + 1}. {qResult.question_text}</p>
            <p>Your answer: <span className="font-bold">{qResult.user_selected}</span></p>
            <p>Correct answer: <span className="font-bold">{qResult.correct_answer}</span></p>
            {qResult.is_correct ? (
              <span className="text-green-300">✅ Correct!</span>
            ) : (
              <span className="text-red-300">❌ Incorrect.</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onGenerateNewQuiz}
        className="w-full bg-indigo-600 hover:bg-indigo-800 transition-all py-3 rounded-lg font-semibold text-white mt-6"
      >
        Generate New Quiz
      </button>
    </div>
  );
}