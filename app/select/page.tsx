'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SaveManager } from '@/game/SaveManager';
import { PlayerClass } from '@/game/types';

const characters: { id: PlayerClass; name: string; desc: string; sprite: string; stats: string; unlocked: boolean; color: string }[] = [
  { 
    id: 'warrior', name: 'Blue Warrior', desc: 'Balanced stats. Heavy swords & shields.', 
    sprite: '⚔️', stats: 'HP:100 SPD:4.5 RAGE:100', unlocked: true, color: 'blue' 
  },
  { 
    id: 'assassin', name: 'Shadow Assassin', desc: 'Fast movement. Twin blades & dash.', 
    sprite: '🗡️', stats: 'HP:70 SPD:6.0 RAGE:80', unlocked: true, color: 'indigo' 
  },
  { 
    id: 'mage', name: 'Arcane Mage', desc: 'Long range. Magic staff & arcane blast.', 
    sprite: '🪄', stats: 'HP:80 SPD:3.8 RAGE:120', unlocked: true, color: 'purple' 
  }
];

export default function SelectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlayerClass>('warrior');
  const [isExiting, setIsExiting] = useState(false);

  const handlePlay = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(`/game?class=${selected}`);
    }, 800);
  };

  const colorMap: Record<string, { border: string; bg: string; shadow: string; text: string }> = {
    blue: { border: 'border-blue-400', bg: 'bg-blue-900/30', shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]', text: 'text-blue-400' },
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-900/30', shadow: 'shadow-[0_0_30px_rgba(99,102,241,0.4)]', text: 'text-indigo-400' },
    purple: { border: 'border-purple-400', bg: 'bg-purple-900/30', shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]', text: 'text-purple-400' },
  };

  return (
    <div className={`w-screen h-screen bg-black flex flex-col justify-center items-center overflow-hidden select-none relative transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black" />

      <div className="z-10 flex flex-col items-center w-full max-w-5xl px-4">
        <h2 className="text-5xl font-bold text-blue-400 mb-12 tracking-[0.3em] drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          CHOOSE YOUR FATE
        </h2>

        <div className="flex gap-8 mb-12 w-full justify-center">
          {characters.map((char) => {
            const colors = colorMap[char.color];
            const isSelected = selected === char.id;
            
            return (
              <div 
                key={char.id}
                onClick={() => setSelected(char.id)}
                className={`relative flex flex-col items-center p-6 w-64 h-80 rounded-lg border-2 transition-all duration-300 cursor-pointer
                  ${isSelected ? `${colors.border} ${colors.bg} ${colors.shadow} scale-105` : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'}
                `}
              >
                <span className="text-6xl mb-4">{char.sprite}</span>
                <h3 className="text-xl font-bold text-white mb-2">{char.name}</h3>
                <p className="text-sm text-gray-400 text-center mb-3">{char.desc}</p>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider">{char.stats}</p>
                
                {isSelected && (
                  <div className={`absolute bottom-4 ${colors.text} text-xs tracking-widest animate-pulse`}>SELECTED</div>
                )}
              </div>
            );
          })}
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
