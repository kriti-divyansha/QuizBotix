import React, { useState, useEffect } from 'react';

// and login success/failure are managed by the parent (Home.jsx)
export default function LoginModal({ onLoginSuccess, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  // Load user data from localStorage when the modal mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setName(user.name || '');
        setEmail(user.email || '');
      } catch (e) {
        console.error("Failed to parse stored user data from localStorage in LoginModal", e);
        localStorage.removeItem('loggedInUser');
      }
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    const user = { name: name.trim(), email: email.trim() };
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    onLoginSuccess(user); // Call the success callback passed from parent
  };

  return (
    // Modal Overlay (simple example, you might use a proper modal library)
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-purple-600 rounded-xl p-6 shadow-lg max-w-sm w-full relative">
        <button
          onClick={onClose} // Call the close callback passed from parent
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold text-center text-purple-300 mb-4">Provide Your Details</h3>
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="loginName" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              id="loginName"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="loginEmail"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-800 transition-all py-3 rounded-lg font-semibold text-white"
          >
            Continue as Guest
          </button>
        </form>
      </div>
    </div>
  );
}