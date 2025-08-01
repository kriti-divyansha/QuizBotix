import React from 'react';

export default function ProfileSidePanel({ isOpen, onClose, user, quizHistory }) {
  const panelClasses = `
    fixed top-0 right-0 h-full w-80 bg-gray-900 shadow-lg
    transform transition-transform duration-300 ease-in-out
    z-50 p-6 flex flex-col
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
  `;

  // Overlay to dim the background and close the panel on click
  const overlayClasses = `
    fixed inset-0 bg-transparent bg-opacity-50 z-40
    ${isOpen ? 'block' : 'hidden'}
  `;

  return (
    <>
      {/* Overlay */}
      <div className={overlayClasses} onClick={onClose}></div>

      {/* Side Panel */}
      <div className={panelClasses}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl"
          aria-label="Close profile panel"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-3">
          Your Profile
        </h2>

        {user ? (
          <div className="mb-8">
            <p className="text-lg text-gray-200">
              <span className="font-semibold text-indigo-200">Name:</span> {user.name}
            </p>
            <p className="text-lg text-gray-200 mt-2">
              <span className="font-semibold text-indigo-200">Email:</span> {user.email}
            </p>
          </div>
        ) : (
          <p className="text-gray-400 text-center mb-8">Please log in to see your profile details.</p>
        )}

        <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
          Quiz History
        </h3>

        {quizHistory && quizHistory.length > 0 ? (
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar"> {/* Added custom-scrollbar class */}
            {quizHistory.map((quiz, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4 mb-3 shadow-md border border-gray-700">
                <p className="text-md font-semibold text-blue-200">{quiz.topic} ({quiz.difficulty})</p>
                <p className="text-sm text-gray-400 mt-1">
                  Score: {quiz.score}/{quiz.totalQuestions}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Date: {new Date(quiz.date).toLocaleDateString()} at {new Date(quiz.date).toLocaleTimeString()}
                </p>
                {/* You could add a "View Details" button here to re-display past results */}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center">No quiz history available yet.</p>
        )}
      </div>
      <style>{`
        /* Custom Scrollbar for better aesthetics */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #333; /* Darker track */
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #0077B6; /* Purple thumb */
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CAF0F8; /* Lighter purple on hover */
        }
      `}</style>
    </>
  );
}