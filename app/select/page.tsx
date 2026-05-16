'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const characters = [
  { id: 'warrior', name: 'Blue Warrior', desc: 'Balanced stats. Uses heavy swords.', sprite: '⚔️', unlocked: true },
  { id: 'assassin', name: 'Shadow Assassin', desc: 'Fast movement. Dual daggers.', sprite: '🗡️', unlocked: false },
  { id: 'mage', name: 'Arcane Mage', desc: 'Long range. Magic staff.', sprite: '🪄', unlocked: false }
];

export default function SelectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState('warrior');
  const [isExiting, setIsExiting] = useState(false);

  const handlePlay = () => {
    setIsExiting(true);
    setTimeout(() => {
      // Nanti kalau karakter lain udah ada, logic pemilihan class bisa ditaro disini
      router.push('/game');
    }, 800);
  };

  return (
    <div className={`w-screen h-screen bg-black flex flex-col justify-center items-center overflow-hidden select-none relative transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black" />

      <div className="z-10 flex flex-col items-center w-full max-w-4xl px-4">
        <h2 className="text-5xl font-bold text-blue-400 mb-12 tracking-[0.3em] drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          CHOOSE YOUR FATE
        </h2>

        <div className="flex gap-8 mb-12 w-full justify-center">
          {characters.map((char) => (
            <div 
              key={char.id}
              onClick={() => char.unlocked && setSelected(char.id)}
              className={`relative flex flex-col items-center p-6 w-56 h-72 rounded-lg border-2 transition-all duration-300 cursor-pointer
                ${!char.unlocked ? 'border-gray-800 bg-gray-900/20 opacity-50 cursor-not-allowed' : 
                  selected === char.id ? 'border-blue-400 bg-blue-900/30 shadow-[0_0_30px_rgba(59,130,246,0.4)] scale-105' : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'}
              `}
            >
              {/* Lock Icon */}
              {!char.unlocked && (
                <div className="absolute inset-0 flex justify-center items-center bg-black/50 rounded-lg text-gray-500 text-6xl z-10">
                  🔒
                </div>
              )}
              
              <span className="text-6xl mb-4">{char.sprite}</span>
              <h3 className="text-xl font-bold text-white mb-2">{char.name}</h3>
              <p className="text-sm text-gray-400 text-center">{char.desc}</p>
              
              {char.unlocked && selected === char.id && (
                <div className="absolute bottom-4 text-blue-400 text-xs tracking-widest animate-pulse">SELECTED</div>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={handlePlay}
          className="px-14 py-4 text-2xl text-white font-bold tracking-widest bg-blue-800 border-2 border-blue-400 rounded hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-110"
        >
          FIGHT
        </button>
      </div>
    </div>
  );
}