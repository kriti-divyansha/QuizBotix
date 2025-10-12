import React from 'react';

export default function QuizResults({ results, onGenerateNewQuiz, topic, difficulty }) {
    
    // Destructure results, and provide fallbacks for score metrics
    const { 
        score = 0, 
        total_questions = 0, 
        results: detailedResults = [], 
        time_taken_seconds = 0, // NEW: Expect this from backend submission
        // ranking = null, // NEW: Expect this from backend/leaderboard logic
    } = results || {};

    // Calculate percentage and performance message
    const percentage = total_questions > 0 ? (score / total_questions) * 100 : 0;
    
    const getPerformanceMessage = (percent) => {
        if (percent === 100) return { text: "Flawless Victory! 👑 Expert level.", color: 'text-green-600' };
        if (percent >= 80) return { text: "Excellent! You mastered the topic. 🌟", color: 'text-blue-600' };
        if (percent >= 50) return { text: "Good effort! Solid knowledge base. 👍", color: 'text-yellow-600' };
        return { text: "Keep practicing! Review the answers below. 📚", color: 'text-red-600' };
    };

    const performance = getPerformanceMessage(percentage);

    // Format time (if provided)
    const formatTime = (seconds) => {
        if (!seconds) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    };

    if (!results || !detailedResults.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <p className="text-lg">Error: Could not load quiz results details. Please generate a new quiz.</p>
                <button
                    onClick={onGenerateNewQuiz}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-800 transition-all py-3 px-6 rounded-lg font-semibold text-white shadow-lg"
                >
                    Generate New Quiz
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full text-gray-800">
            
            {/* === 1. Score Summary Header === */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-lg -mx-2 md:m-0 rounded-t-lg">
                <h2 className="text-4xl font-extrabold text-center text-purple-700 drop-shadow-md mb-2">
                    Quiz Complete!
                </h2>
                
                {/* Topic and Difficulty */}
                <p className="text-lg text-center text-gray-500 mb-4 font-medium">
                    Topic: <span className="text-indigo-600 font-bold capitalize">{topic || 'N/A'}</span> &middot; Difficulty: <span className="text-indigo-600 font-bold capitalize">{difficulty || 'N/A'}</span>
                </p>

                {/* Score Card Grid */}
                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <ResultCard label="Score" value={`${score}/${total_questions}`} color="text-purple-600" />
                    <ResultCard label="Time Taken" value={formatTime(time_taken_seconds)} color="text-blue-600" />
                    <ResultCard label="Accuracy" value={`${percentage.toFixed(1)}%`} color={performance.color} />
                    {/* {ranking !== null && <ResultCard label="Global Rank" value={`#${ranking}`} color="text-yellow-600" />} */}
                </div>
                
                {/* Performance Message */}
                <p className={`text-xl font-bold text-center mt-4 ${performance.color}`}>
                    {performance.text}
                </p>
                
                <div className="mt-6 w-full h-2 bg-gray-200 rounded-full">
                    <div 
                        className={`h-2 rounded-full transition-all duration-700`} 
                        style={{ width: `${percentage}%`, backgroundColor: percentage >= 50 ? '#10B981' : '#EF4444' }} // Green or Red
                    ></div>
                </div>
            </div>

            {/* === 2. Scrollable Results Breakdown === */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pt-6 custom-scrollbar">
                <h3 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">Your Answers Review</h3>

                {detailedResults.map((item, index) => {
                    const isCorrect = item.is_correct;
                    const containerClass = isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
                    const icon = isCorrect ? '✅' : '❌';

                    return (
                        <div key={index} className={`p-5 rounded-lg shadow-md border ${containerClass}`}>

                            <p className="text-lg font-semibold text-gray-900 mb-3">
                                <span className="font-bold mr-2 text-indigo-600">{index + 1}.</span>
                                {item.question_text}
                            </p>

                            <div className="space-y-2 mb-4">
                                {Object.entries(item.options).map(([letter, text]) => {
                                    const isUserSelected = letter === item.user_selected_letter;
                                    const isCorrectAnswer = letter === item.correct_letter;

                                    let optionClasses = "p-3 rounded-md border transition-all duration-200 text-gray-800 ";

                                    if (isUserSelected && isCorrectAnswer) {
                                        optionClasses += "bg-green-300 border-green-700 text-green-900 font-bold";
                                    } else if (isUserSelected && !isCorrectAnswer) {
                                        optionClasses += "bg-red-300 border-red-700 text-red-900 font-bold";
                                    } else if (isCorrectAnswer) {
                                        optionClasses += "bg-green-100 border-green-500 text-green-800 font-medium";
                                    } else {
                                        optionClasses += "bg-white border-gray-300";
                                    }

                                    return (
                                        <div key={letter} className={optionClasses}>
                                            <span className="font-semibold mr-2">{letter}.</span> {text}
                                            {isUserSelected && <span className="ml-2 text-sm font-bold italic"> (Your Choice)</span>}
                                            {isCorrectAnswer && <span className="ml-2 text-sm font-bold text-green-800"> (Correct)</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* --- NEW: Explanation Placeholder --- */}
                            {/* NOTE: You need to update your backend to return 'explanation' data for each question */}
                            {/* <div className="mt-4 p-3 bg-gray-100 border-l-4 border-indigo-400 rounded-r-md">
                                <p className="text-sm font-semibold text-indigo-700">💡 Explanation:</p>
                                <p className="text-sm text-gray-700">{item.explanation || "No detailed explanation available."}</p>
                            </div> */}

                            <p className={`text-lg font-bold mt-3 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                {icon} {isCorrect ? 'Correct!' : 'Incorrect.'}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* === 3. Call to Action Footer === */}
            <div className="mt-8 flex-shrink-0 pt-4 border-t border-gray-200">
                <button
                    onClick={onGenerateNewQuiz}
                    className="w-full bg-indigo-600 hover:bg-indigo-800 transition-all py-3 rounded-lg font-bold text-white text-lg shadow-xl hover:shadow-2xl"
                >
                    Generate a New Quiz
                </button>
            </div>
            
            {/* Scrollbar Style */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
}

// === NEW: Reusable Card Component for Metrics ===
const ResultCard = ({ label, value, color }) => (
    <div className="p-3 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
        <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{label}</p>
    </div>
);
