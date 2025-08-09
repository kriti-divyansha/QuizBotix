import React from 'react';

export default function QuizQuestions({ questions, userAnswers, onOptionChange }) {
    return (
        <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-center text-indigo-400">Quiz Questions</h2>
            {questions.map((q, i) => (
                <div key={i} className="bg-gray-800 p-4 rounded-lg">
                    <p className="mb-2 text-white">{i + 1}. {q.question_text}</p>
                    {/*
                      We now use Object.entries() to correctly iterate over the key-value pairs
                      of the options object sent from the updated backend.
                    */}
                    {Object.entries(q.options).map(([letter, text]) => (
                        <div key={letter} className="ml-4">
                            <label className="flex items-center cursor-pointer text-gray-200">
                                <input
                                    type="radio"
                                    name={`q${i}`}
                                    value={letter}
                                    checked={userAnswers[i] === letter}
                                    onChange={() => onOptionChange(i, letter)}
                                    className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                {letter}. {text}
                            </label>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}