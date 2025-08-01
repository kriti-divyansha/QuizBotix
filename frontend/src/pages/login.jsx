import React, { useState, useEffect } from 'react';

// and login success/failure are managed by the parent (Home.jsx)
export default function LoginModal({ onLoginSuccess, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For signup
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false); // To toggle between Login and Sign Up

  // Load user data from localStorage when the modal mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // not if we're explicitly in a password-based login flow.
        // For simplicity, we'll keep it as is, but in a real app, you might not pre-fill if password is involved.
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

    if (isSignUp) {
      // --- Sign Up Logic ---
      if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('All fields are required for Sign Up.');
        return;
      }
      if (password.trim().length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      // In a real application, you would send this data to your backend for user registration.
      // For this example, we'll just simulate a successful signup and store it locally.
      const newUser = { name: name.trim(), email: email.trim(), password: password.trim() };
      localStorage.setItem('registeredUsers', JSON.stringify([...(JSON.parse(localStorage.getItem('registeredUsers') || '[]')), newUser]));
      localStorage.setItem('loggedInUser', JSON.stringify({ name: newUser.name, email: newUser.email })); // Log them in immediately after signup
      onLoginSuccess({ name: newUser.name, email: newUser.email });
      alert('Sign Up successful! You are now logged in.'); // Simple confirmation
    } else {
      // --- Login Logic ---
      if (!email.trim() || !password.trim()) {
        setError('Email and Password are required for Login.');
        return;
      }

      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const foundUser = registeredUsers.find(user => user.email === email.trim() && user.password === password.trim());

      if (foundUser) {
        const user = { name: foundUser.name, email: foundUser.email };
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        onLoginSuccess(user); // Call the success callback passed from parent
      } else {
        setError('Invalid email or password.');
      }
    }
  };

  const handleGuestLogin = () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required for Guest access.');
      return;
    }
    const user = { name: name.trim(), email: email.trim() };
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    onLoginSuccess(user);
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
        <h3 className="text-xl font-bold text-center text-purple-300 mb-4">
          {isSignUp ? 'Create Your Account' : 'Welcome Back'}
        </h3>
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && ( // Name field only for Sign Up
            <div>
              <label htmlFor="signUpName" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                id="signUpName"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          {isSignUp && ( // Confirm Password field only for Sign Up
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-800 transition-all py-3 rounded-lg font-semibold text-white"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-400 hover:text-purple-200 text-sm"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
          {!isSignUp && ( // Show "Continue as Guest" only on the Login view
            <>
              <div className="relative flex items-center justify-center my-4">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>
              <button
                onClick={handleGuestLogin}
                className="w-full bg-gray-700 hover:bg-gray-600 transition-all py-3 rounded-lg font-semibold text-white"
              >
                Continue as Guest
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}