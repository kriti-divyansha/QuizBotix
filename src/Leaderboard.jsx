import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Update with your Flask backend URL

export default function Leaderboard({ username }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.emit('joinRoom', { roomId: 'quiz123', username });

    socket.on('updateLeaderboard', (data) => {
      const sorted = [...data].sort((a, b) => b.score - a.score);
      setPlayers(sorted);
    });

    return () => socket.disconnect();
  }, [username]);

  const increaseScore = () => {
    const randomScore = Math.floor(Math.random() * 10) + 1;
    socket.emit('updateScore', { roomId: 'quiz123', score: randomScore });
  };

  return (
    <div className="p-4 bg-white rounded shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">🏆 Live Leaderboard</h2>
      <ul className="space-y-1">
        {players.map((player, index) => (
          <li key={player.id} className="flex justify-between border-b py-1">
            <span>#{index + 1} {player.username}</span>
            <span>{player.score}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={increaseScore}
        className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded"
      >
        Simulate Score 🔥
      </button>
    </div>
  );
}
 