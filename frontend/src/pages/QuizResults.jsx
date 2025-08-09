import React from 'react';

export default function QuizResults({ results, onGenerateNewQuiz }) {
    // Correctly reference results.results to match the backend's data structure
    if (!results || !results.results) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <p className="text-lg">Error: Could not load quiz results details. Please generate a new quiz.</p>
                <button
                    onClick={onGenerateNewQuiz}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-800 transition-all py-3 px-6 rounded-lg font-semibold text-white"
                >
                    Generate New Quiz
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full text-gray-800">
            {/* Score Summary */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
                <h2 className="text-3xl font-extrabold text-center text-purple-700 drop-shadow-md">
                    Quiz Complete!
                </h2>
                <p className="text-2xl text-center text-gray-700 mt-2">
                    Your Score: <span className="text-purple-600 font-extrabold">{results.score}</span> /{' '}
                    <span className="text-purple-600 font-extrabold">{results.total_questions}</span>
                </p>
            </div>

            {/* Scrollable Results Breakdown */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pt-4">
                {results.results.map((item, index) => (
                    <div key={index} className={`p-6 rounded-lg shadow-md border 
                        ${item.is_correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>

                        <p className="text-lg font-semibold text-gray-900 mb-3">
                            <span className="font-bold mr-2 text-indigo-600">{index + 1}.</span>
                            {item.question_text}
                        </p>

                        <div className="space-y-2 mb-4">
                            {Object.entries(item.options).map(([letter, text]) => {
                                const isUserSelected = letter === item.user_selected_letter;
                                const isCorrectAnswer = letter === item.correct_letter;

                                let optionClasses = "p-3 rounded-md border text-gray-800 ";

                                if (isUserSelected && isCorrectAnswer) {
                                    optionClasses += "bg-green-200 border-green-600 text-green-900 font-medium";
                                } else if (isUserSelected && !isCorrectAnswer) {
                                    optionClasses += "bg-red-200 border-red-600 text-red-900 font-medium";
                                } else if (isCorrectAnswer) {
                                    optionClasses += "bg-green-100 border-green-400 text-green-800 font-medium";
                                } else {
                                    optionClasses += "bg-white border-gray-300";
                                }

                                return (
                                    <div key={letter} className={optionClasses}>
                                        <span className="font-semibold mr-2">{letter}.</span> {text}
                                        {isUserSelected && (
                                            <span className="ml-2 text-sm font-bold">
                                                {isCorrectAnswer ? ' (Your Answer)' : ' (Your Answer)'}
                                            </span>
                                        )}
                                        {!isUserSelected && isCorrectAnswer && (
                                            <span className="ml-2 text-sm font-bold text-green-700"> (Correct Answer)</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {item.is_correct ? (
                            <p className="text-green-700 text-md italic mt-2">✅ You got this one correct!</p>
                        ) : (
                            <p className="text-red-700 text-md italic mt-2">
                                ❌ Your answer was incorrect. The correct answer was:{' '}
                                <span className="font-semibold">{item.correct_letter}. {item.correct_text}</span>
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex-shrink-0">
                <button
                    onClick={onGenerateNewQuiz}
                    className="w-full bg-indigo-600 hover:bg-indigo-800 transition-all py-3 rounded-lg font-semibold text-white"
                >
                    Generate New Quiz
                </button>
            </div>
        </div>
    );
}
