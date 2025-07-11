import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-white to-purple-700 text-white p-8 text-center animate-fade-in">
      <h1 className="text-3xl font-bold text-black mb-4">📞 About & Contact</h1>
      <p className="text-lg mb-2">Hi! I'm Kriti, the creator of QuizBotix ✨</p>
      <p className="text-md text-gray-900">Designed to make learning fun — with a React UI, Flask server, and AI-generated questions.</p>
      <p className="text-md text-gray-600 mt-2">Feel free to connect: <span className="text-indigo-700">divyanshakriti@gmail.com</span></p>
      
      <Link to="/" className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-all">
        ← Back to Quiz
      </Link>
    </div>
  );
};

export default About;

