import React from 'react';

export default function QuizQuestions({ questions, userAnswers, onOptionChange, onSubmitQuiz, submitting }) {
  const allQuestionsAnswered = Object.keys(userAnswers).length === questions.length;

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-bold text-center text-indigo-400">Quiz Questions</h2>
      {questions.map((q, i) => (
        <div key={i} className="bg-gray-800 p-4 rounded-lg">
          <p className="mb-2">{i + 1}. {q.question}</p>
          {q.options.map((opt, j) => {
            const optionLetter = opt.split('. ')[0];
            return (
              <div key={j} className="ml-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`q${i}`}
                    value={optionLetter}
                    checked={userAnswers[i] === optionLetter}
                    onChange={() => onOptionChange(i, optionLetter)}
                    className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  {opt}
                </label>
              </div>
            );
          })}
        </div>
      ))}
      <button
        onClick={onSubmitQuiz}
        disabled={submitting || !allQuestionsAnswered}
        className="w-full bg-blue-600 hover:bg-blue-800 transition-all py-3 rounded-lg font-semibold text-white mt-6"
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
      {!allQuestionsAnswered && (
        <p className="text-red-400 text-sm text-center mt-2">Please answer all questions before submitting.</p>
      )}
    </div>
  );
}