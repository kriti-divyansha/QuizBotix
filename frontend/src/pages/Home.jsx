import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from './login';
import ProfileSidePanel from './ProfileSidePanel';
import API_BASE_URL from '../config';

const GlitchText = ({ text, className }) => (
  <span className={`glitch-text ${className}`} data-text={text}>{text}</span>
);

const NeonBorder = ({ children, className = '' }) => (
  <div className={`neon-border ${className}`}>{children}</div>
);

const Home = () => {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(5);
  const [quizType, setQuizType] = useState('self');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [scanLine, setScanLine] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setScanLine(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setLoggedInUser(user);
        const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
        if (storedHistory) setQuizHistory(JSON.parse(storedHistory));
      } catch (e) {
        localStorage.removeItem('loggedInUser');
      }
    }
    if (location.state?.loggedInUser) {
      const userFromState = location.state.loggedInUser;
      setLoggedInUser(userFromState);
      const storedHistory = localStorage.getItem(`quizHistory_${userFromState.email}`);
      if (storedHistory) setQuizHistory(JSON.parse(storedHistory));
    }
  }, [location.state]);

  const handleLoginSuccess = useCallback((user) => {
    setLoggedInUser(user);
    setShowLoginForm(false);
    setError(null);
    const storedHistory = localStorage.getItem(`quizHistory_${user.email}`);
    setQuizHistory(storedHistory ? JSON.parse(storedHistory) : []);
  }, []);

  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    localStorage.removeItem('loggedInUser');
    setQuizHistory([]);
    setShowLoginForm(false);
    setShowSidePanel(false);
    setTopic('');
    setError(null);
  }, []);

  const handleGenerate = async () => {
    if (!topic) { setError('// ERROR: Topic field cannot be empty'); return; }
    if (!loggedInUser) { setError('// ERROR: Authentication required'); setShowLoginForm(true); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.questions && data.quiz_id) {
        navigate('/quiz', { state: { questions: data.questions, quizId: data.quiz_id, loggedInUser, topic, difficulty, count } });
      } else {
        setError(data.error || '// ERROR: Invalid server response');
      }
    } catch (err) {
      setError('// ERROR: Connection to neural network failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cyan: #00f5ff;
          --pink: #ff006e;
          --purple: #7c3aed;
          --yellow: #ffd60a;
          --dark: #020408;
          --dark2: #080d14;
          --dark3: #0d1521;
          --dark4: #111827;
          --grid: rgba(0,245,255,0.03);
          --glow-cyan: 0 0 20px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.3);
          --glow-pink: 0 0 20px rgba(255,0,110,0.6), 0 0 40px rgba(255,0,110,0.3);
          --glow-purple: 0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(124,58,237,0.3);
        }

        .cyber-root {
          min-height: 100vh;
          background: var(--dark);
          color: #e2e8f0;
          font-family: 'Rajdhani', sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        .cyber-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(var(--grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .cyber-root::after {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--cyan), transparent);
          animation: scanline 4s linear infinite;
          pointer-events: none;
          z-index: 999;
          opacity: 0.4;
        }

        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100vh; }
        }

        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.8; }
          97% { opacity: 1; }
          98% { opacity: 0.6; }
          99% { opacity: 1; }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: var(--glow-cyan); }
          50% { box-shadow: 0 0 40px rgba(0,245,255,0.9), 0 0 80px rgba(0,245,255,0.4); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glitch {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 0); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(2px, 0); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(0, 0); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, 0); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 0); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(0, 0); }
        }

        .glitch-text {
          position: relative;
          animation: flicker 8s infinite;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
        }

        .glitch-text::before {
          color: var(--pink);
          animation: glitch 3s infinite;
          opacity: 0.5;
        }

        .glitch-text::after {
          color: var(--cyan);
          animation: glitch 3s infinite reverse;
          opacity: 0.5;
        }

        /* NAVBAR */
        .cyber-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(2,4,8,0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,245,255,0.2);
          padding: 0 40px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cyber-nav::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--cyan), var(--pink), transparent);
        }

        .nav-logo {
          font-family: 'Orbitron', monospace;
          font-size: 1.4rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--cyan), var(--pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 2px;
          text-shadow: none;
          animation: flicker 10s infinite;
        }

        .nav-subtitle {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          color: var(--cyan);
          opacity: 0.7;
          letter-spacing: 1px;
        }

        .cyber-btn {
          position: relative;
          background: transparent;
          border: 1px solid var(--cyan);
          color: var(--cyan);
          padding: 8px 20px;
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
          text-transform: uppercase;
        }

        .cyber-btn:hover {
          background: rgba(0,245,255,0.1);
          box-shadow: var(--glow-cyan);
          transform: translateY(-1px);
        }

        .cyber-btn-pink {
          border-color: var(--pink);
          color: var(--pink);
        }

        .cyber-btn-pink:hover {
          background: rgba(255,0,110,0.1);
          box-shadow: var(--glow-pink);
        }

        .cyber-btn-solid {
          background: linear-gradient(135deg, var(--cyan), #0099cc);
          color: var(--dark);
          border: none;
          font-weight: 900;
        }

        .cyber-btn-solid:hover {
          background: linear-gradient(135deg, #00ffff, var(--cyan));
          box-shadow: var(--glow-cyan);
        }

        /* HERO */
        .hero-section {
          position: relative;
          min-height: 90vh;
          display: flex;
          align-items: center;
          padding: 80px 40px;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 50%, rgba(0,245,255,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(255,0,110,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .hero-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          font-weight: 900;
          line-height: 1.1;
          color: #ffffff;
          animation: slideIn 0.8s ease forwards;
        }

        .hero-title .accent-cyan { color: var(--cyan); text-shadow: var(--glow-cyan); }
        .hero-title .accent-pink { color: var(--pink); text-shadow: var(--glow-pink); }

        .hero-desc {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.8;
          margin: 20px 0 30px;
          font-family: 'Share Tech Mono', monospace;
          animation: slideIn 0.8s ease 0.2s both;
        }

        .hero-stats {
          display: flex;
          gap: 30px;
          animation: slideIn 0.8s ease 0.4s both;
        }

        .stat-item {
          text-align: center;
        }

        .stat-num {
          font-family: 'Orbitron', monospace;
          font-size: 2rem;
          font-weight: 900;
          color: var(--cyan);
          text-shadow: var(--glow-cyan);
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* QUIZ FORM CARD */
        .quiz-form-card {
          position: relative;
          background: rgba(8,13,20,0.9);
          border: 1px solid rgba(0,245,255,0.3);
          padding: 40px;
          animation: slideIn 0.8s ease 0.3s both;
          backdrop-filter: blur(20px);
        }

        .quiz-form-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--cyan), var(--pink), var(--purple));
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .quiz-form-card::after {
          content: 'INITIALIZE QUIZ';
          position: absolute;
          top: -10px;
          right: 20px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          color: var(--cyan);
          background: var(--dark);
          padding: 2px 8px;
          letter-spacing: 2px;
        }

        .form-title {
          font-family: 'Orbitron', monospace;
          font-size: 1.2rem;
          color: var(--cyan);
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .cyber-input {
          width: 100%;
          background: rgba(0,245,255,0.03);
          border: 1px solid rgba(0,245,255,0.2);
          color: #e2e8f0;
          padding: 12px 16px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          outline: none;
          margin-bottom: 12px;
        }

        .cyber-input:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 15px rgba(0,245,255,0.2);
          background: rgba(0,245,255,0.05);
        }

        .cyber-input::placeholder { color: #334155; }

        .cyber-select {
          width: 100%;
          background: rgba(0,245,255,0.03);
          border: 1px solid rgba(0,245,255,0.2);
          color: #e2e8f0;
          padding: 12px 16px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.9rem;
          cursor: pointer;
          outline: none;
          margin-bottom: 12px;
          appearance: none;
          transition: all 0.3s ease;
        }

        .cyber-select:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 15px rgba(0,245,255,0.2);
        }

        .cyber-select option { background: var(--dark2); }

        .generate-btn {
          width: 100%;
          padding: 16px;
          background: transparent;
          border: 2px solid var(--cyan);
          color: var(--cyan);
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 3px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-top: 8px;
        }

        .generate-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0,245,255,0.1), transparent);
          transition: left 0.5s ease;
        }

        .generate-btn:hover::before { left: 100%; }

        .generate-btn:hover:not(:disabled) {
          background: rgba(0,245,255,0.1);
          box-shadow: var(--glow-cyan);
          transform: translateY(-2px);
        }

        .generate-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: #334155;
          color: #334155;
        }

        .error-msg {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.8rem;
          color: var(--pink);
          margin-top: 8px;
          padding: 8px 12px;
          border-left: 2px solid var(--pink);
          background: rgba(255,0,110,0.05);
        }

        /* HOW IT WORKS */
        .section {
          padding: 100px 40px;
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-tag {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.75rem;
          color: var(--cyan);
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 12px;
          opacity: 0.8;
        }

        .section-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 900;
          color: #fff;
          margin-bottom: 60px;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: rgba(0,245,255,0.05);
        }

        .step-card {
          background: var(--dark2);
          padding: 40px 30px;
          position: relative;
          transition: all 0.3s ease;
          cursor: default;
        }

        .step-card:hover {
          background: var(--dark3);
          transform: translateY(-4px);
        }

        .step-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--cyan), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .step-card:hover::before { opacity: 1; }

        .step-num {
          font-family: 'Orbitron', monospace;
          font-size: 3rem;
          font-weight: 900;
          color: rgba(0,245,255,0.1);
          line-height: 1;
          margin-bottom: 16px;
        }

        .step-icon { font-size: 2rem; margin-bottom: 16px; }

        .step-title {
          font-family: 'Orbitron', monospace;
          font-size: 1rem;
          color: var(--cyan);
          margin-bottom: 12px;
          letter-spacing: 1px;
        }

        .step-desc {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.7;
        }

        /* FEATURES */
        .features-section {
          background: var(--dark2);
          padding: 100px 40px;
          position: relative;
          overflow: hidden;
        }

        .features-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--cyan), var(--pink), transparent);
        }

        .features-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .feature-card {
          position: relative;
          background: var(--dark);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 30px;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .feature-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 0; height: 2px;
          transition: width 0.4s ease;
        }

        .feature-card:nth-child(1)::after { background: var(--cyan); }
        .feature-card:nth-child(2)::after { background: var(--pink); }
        .feature-card:nth-child(3)::after { background: var(--yellow); }

        .feature-card:hover::after { width: 100%; }

        .feature-card:hover {
          border-color: rgba(0,245,255,0.2);
          transform: translateY(-4px);
          background: var(--dark3);
        }

        .feature-icon {
          width: 50px; height: 50px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 20px;
          position: relative;
        }

        .feature-icon::before {
          content: '';
          position: absolute;
          inset: 0;
          border: 1px solid;
          opacity: 0.3;
        }

        .feature-card:nth-child(1) .feature-icon::before { border-color: var(--cyan); }
        .feature-card:nth-child(2) .feature-icon::before { border-color: var(--pink); }
        .feature-card:nth-child(3) .feature-icon::before { border-color: var(--yellow); }

        .feature-title {
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem;
          margin-bottom: 12px;
          letter-spacing: 1px;
        }

        .feature-card:nth-child(1) .feature-title { color: var(--cyan); }
        .feature-card:nth-child(2) .feature-title { color: var(--pink); }
        .feature-card:nth-child(3) .feature-title { color: var(--yellow); }

        .feature-desc { color: #64748b; font-size: 0.9rem; line-height: 1.7; }

        /* CTA */
        .cta-section {
          padding: 120px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          background: radial-gradient(ellipse, rgba(0,245,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .cta-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 900;
          color: #fff;
          margin-bottom: 20px;
        }

        .cta-desc {
          font-family: 'Share Tech Mono', monospace;
          color: #64748b;
          font-size: 1rem;
          margin-bottom: 40px;
        }

        .cta-btn {
          display: inline-block;
          padding: 18px 60px;
          background: transparent;
          border: 2px solid;
          border-image: linear-gradient(135deg, var(--cyan), var(--pink)) 1;
          color: #fff;
          font-family: 'Orbitron', monospace;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 3px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,245,255,0.1), rgba(255,0,110,0.1));
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .cta-btn:hover::before { opacity: 1; }
        .cta-btn:hover { box-shadow: var(--glow-cyan), var(--glow-pink); transform: translateY(-3px); }

        /* FOOTER */
        .cyber-footer {
          background: var(--dark2);
          border-top: 1px solid rgba(0,245,255,0.1);
          padding: 40px;
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-logo {
          font-family: 'Orbitron', monospace;
          font-size: 1.2rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--cyan), var(--pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .footer-copy {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.75rem;
          color: #334155;
          margin-top: 4px;
        }

        .footer-links { display: flex; gap: 24px; }

        .footer-link {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.8rem;
          color: #475569;
          text-decoration: none;
          transition: color 0.3s ease;
          letter-spacing: 1px;
        }

        .footer-link:hover { color: var(--cyan); }

        /* CORNER DECORATIONS */
        .corner-tl, .corner-br {
          position: absolute;
          width: 20px; height: 20px;
          pointer-events: none;
        }

        .corner-tl { top: 0; left: 0; border-top: 2px solid var(--cyan); border-left: 2px solid var(--cyan); }
        .corner-br { bottom: 0; right: 0; border-bottom: 2px solid var(--cyan); border-right: 2px solid var(--cyan); }

        .label-tag {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.7rem;
          color: var(--cyan);
          opacity: 0.6;
          letter-spacing: 2px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        @media (max-width: 768px) {
          .hero-content { grid-template-columns: 1fr; gap: 40px; }
          .steps-grid, .features-grid { grid-template-columns: 1fr; }
          .cyber-nav { padding: 0 20px; }
          .hero-section { padding: 60px 20px; }
          .section { padding: 60px 20px; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="cyber-nav">
        <div>
          <div className="nav-logo">⬡ QUIZBOTIX</div>
          <div className="nav-subtitle">// NEURAL QUIZ ENGINE v2.0</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/about')} className="cyber-btn">About</button>
          {loggedInUser ? (
            <>
              <button onClick={() => setShowSidePanel(true)} className="cyber-btn">Profile</button>
              <button onClick={handleLogout} className="cyber-btn cyber-btn-pink">Logout</button>
            </>
          ) : (
            <button onClick={() => setShowLoginForm(true)} className="cyber-btn cyber-btn-solid">
              Connect
            </button>
          )}
        </div>
      </nav>

      {showLoginForm && <LoginModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowLoginForm(false)} />}
      {loggedInUser && <ProfileSidePanel isOpen={showSidePanel} onClose={() => setShowSidePanel(false)} user={loggedInUser} quizHistory={quizHistory} />}

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-content">
          <div>
            <div className="label-tag">// SYSTEM ONLINE</div>
            <h1 className="hero-title">
              <GlitchText text="GENERATE" className="accent-cyan" /><br />
              ANY QUIZ<br />
              <span className="accent-pink">INSTANTLY</span>
            </h1>
            <p className="hero-desc">
              &gt; AI-powered quiz engine.<br />
              &gt; Real-time leaderboards.<br />
              &gt; Any topic. Any difficulty.<br />
              &gt; Challenge accepted.
            </p>
            {!loggedInUser && (
              <button onClick={() => setShowLoginForm(true)} className="cyber-btn cyber-btn-solid" style={{ padding: '14px 40px', fontSize: '0.85rem' }}>
                Initialize Session
              </button>
            )}
            <div className="hero-stats" style={{ marginTop: '40px' }}>
              <div className="stat-item">
                <div className="stat-num">∞</div>
                <div className="stat-label">Topics</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ color: 'var(--pink)', textShadow: 'var(--glow-pink)' }}>AI</div>
                <div className="stat-label">Powered</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ color: 'var(--yellow)' }}>Live</div>
                <div className="stat-label">Leaderboard</div>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="quiz-form-card">
            <div className="corner-tl" />
            <div className="corner-br" />
            <div className="form-title">
              {loggedInUser ? `> Welcome, ${loggedInUser.name}` : '> Auth Required'}
            </div>
            {loggedInUser ? (
              <div>
                <div className="label-tag">// Topic Input</div>
                <input
                  type="text"
                  placeholder="e.g. 'Quantum Physics', 'Ancient Rome'..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="cyber-input"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
                <div className="label-tag">// Difficulty Level</div>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="cyber-select">
                  <option value="easy">EASY — Casual Mode</option>
                  <option value="medium">MEDIUM — Standard Mode</option>
                  <option value="hard">HARD — Expert Mode</option>
                </select>
                <div className="label-tag">// Question Count</div>
                <select value={count} onChange={e => setCount(Number(e.target.value))} className="cyber-select">
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
                <div className="label-tag">// Quiz Mode</div>
                <select value={quizType} onChange={e => setQuizType(e.target.value)} className="cyber-select">
                  <option value="self">SOLO — Personal Challenge</option>
                  <option value="classroom">MULTI — Classroom / Community</option>
                </select>
                <button onClick={handleGenerate} disabled={!topic || loading} className="generate-btn">
                  {loading ? '> Generating Neural Quiz...' : '> Execute Quiz'}
                </button>
                {error && <div className="error-msg">{error}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", color: '#475569', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  &gt; Authentication required<br />
                  &gt; Connect to access quiz engine<br />
                  &gt; Free account, unlimited quizzes
                </div>
                <button onClick={() => setShowLoginForm(true)} className="generate-btn">
                  &gt; Connect Now
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div style={{ background: 'var(--dark2)', padding: '2px 0' }}>
        <div className="section">
          <div className="section-tag">// Protocol</div>
          <h2 className="section-title">How It <span style={{ color: 'var(--cyan)' }}>Works</span></h2>
          <div className="steps-grid">
            {[
              { num: '01', icon: '⌨', title: 'Input Parameters', desc: 'Enter your topic, set difficulty level, and choose question count. The neural engine accepts any subject.' },
              { num: '02', icon: '⚡', title: 'AI Synthesis', desc: 'Our LLM backend processes your parameters and generates unique, high-quality quiz questions in seconds.' },
              { num: '03', icon: '🏆', title: 'Compete & Rank', desc: 'Answer questions, beat the timer, and watch your score climb the real-time global leaderboard.' },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <div className="step-title">{step.title}</div>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="features-section">
        <div className="features-inner">
          <div className="section-tag">// Capabilities</div>
          <h2 className="section-title">Platform <span style={{ color: 'var(--pink)' }}>Features</span></h2>
          <div className="features-grid">
            {[
              { icon: '🎯', title: 'AI-Generated Quizzes', desc: 'Generate topic-based quizzes instantly using powerful Large Language Models. Any topic, any difficulty.' },
              { icon: '⚡', title: 'Real-Time Leaderboard', desc: 'Compete live through our Socket.IO-powered leaderboard. Watch scores update in milliseconds.' },
              { icon: '📊', title: 'Performance Tracking', desc: 'Track all your quiz attempts with detailed history. See your improvement over time.' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-section">
        <div className="section-tag">// Ready?</div>
        <h2 className="cta-title">Test Your <span style={{ color: 'var(--cyan)', textShadow: 'var(--glow-cyan)' }}>Knowledge</span></h2>
        <p className="cta-desc">&gt; Join the leaderboard. Challenge yourself. Dominate.</p>
        <button onClick={() => loggedInUser ? window.scrollTo({ top: 0, behavior: 'smooth' }) : setShowLoginForm(true)} className="cta-btn">
          Start Now
        </button>
      </div>

      {/* FOOTER */}
      <footer className="cyber-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo">⬡ QUIZBOTIX</div>
            <div className="footer-copy">// © 2025 All systems operational</div>
          </div>
          <div className="footer-links">
            <a href="/about" className="footer-link">About</a>
            <a href="/contact" className="footer-link">Contact</a>
            <a href="/privacy" className="footer-link">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
