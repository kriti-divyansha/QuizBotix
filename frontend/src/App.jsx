import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import QuizPage from './pages/QuizPage'; // <--- Corrected import path for QuizPage

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/quiz" element={<QuizPage />} /> {/* Add this new route */}
    </Routes>
  );
};

export default App;
