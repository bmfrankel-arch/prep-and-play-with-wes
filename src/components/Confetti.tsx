'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#8338EC', '#FF6B6B', '#4ECDC4', '#FFD700'];

interface Piece {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

export default function Confetti({ duration = 3000 }: { duration?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const newPieces: Piece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.8,
      size: 8 + Math.random() * 10,
      rotation: Math.random() * 360,
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1 + Math.random() * 1.5}s`,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
