"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StoryLine {
  speaker: string;
  text: string;
  color: string;
  bgEffect?: 'shake' | 'flash' | 'pulse' | 'fade_red' | 'none';
}

const storyLines: StoryLine[] = [
  { speaker: "???", text: "Wake up...", color: "#9ca3af", bgEffect: 'none' },
  { speaker: "???", text: "The city is burning. Can you hear the screams?", color: "#ef4444", bgEffect: 'fade_red' },
  { speaker: "Narrator", text: "The Red Empire came at dawn. Without warning. Without mercy.", color: "#9ca3af", bgEffect: 'none' },
  { speaker: "Narrator", text: "The Blue Kingdom — once a beacon of hope — now lies in ash and ruin.", color: "#6b7280", bgEffect: 'none' },
  { speaker: "Narrator", text: "The Emperor's army swept through all 5 Districts in a single night.", color: "#ef4444", bgEffect: 'fade_red' },
  { speaker: "Veteran Knight", text: "You're the only one left...", color: "#3b82f6", bgEffect: 'none' },
  { speaker: "Veteran Knight", text: "The last Blue Knight. Our final hope.", color: "#60a5fa", bgEffect: 'pulse' },
  { speaker: "Veteran Knight", text: "The others? They fell defending the gates. Every last one of them.", color: "#3b82f6", bgEffect: 'none' },
  { speaker: "You", text: "...I remember nothing. Only fire.", color: "#fbbf24", bgEffect: 'none' },
  { speaker: "Veteran Knight", text: "Then let the fire be your weapon.", color: "#3b82f6", bgEffect: 'shake' },
  { speaker: "Veteran Knight", text: "Listen carefully. The Magic Duck holds the key to saving this realm.", color: "#f59e0b", bgEffect: 'none' },
  { speaker: "Veteran Knight", text: "It waits at the far end of District 5 — beyond the Emperor's strongest forces.", color: "#f59e0b", bgEffect: 'none' },
  { speaker: "Narrator", text: "Each district is overrun. Lancers patrol the streets. Archers watch from rooftops.", color: "#9ca3af", bgEffect: 'none' },
  { speaker: "Narrator", text: "Brutes guard the crossroads. Mages warp reality itself. Ninja lurk in every shadow.", color: "#9ca3af", bgEffect: 'shake' },
  { speaker: "Veteran Knight", text: "You must fight through all 5 Districts. Kill the Elite guardians to open the exit portals.", color: "#60a5fa", bgEffect: 'none' },
  { speaker: "Veteran Knight", text: "And in the final district... the Red Emperor himself awaits.", color: "#ef4444", bgEffect: 'fade_red' },
  { speaker: "You", text: "Then I'll carve a path through them all.", color: "#fbbf24", bgEffect: 'pulse' },
  { speaker: "System", text: "WASD to move. Mouse to attack. Q for skill. Space to dodge. E for potions. 1/2/3 to switch weapons.", color: "#fbbf24", bgEffect: 'none' },
  { speaker: "System", text: "Survive. Kill. Reach the Magic Duck. Save the realm.", color: "#fbbf24", bgEffect: 'pulse' },
];

export default function ProloguePage() {
  const router = useRouter();
  const [currentLine, setCurrentLine] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [bgEffect, setBgEffect] = useState<string>('none');

  useEffect(() => {
    if (currentLine >= storyLines.length) return;
    const line = storyLines[currentLine];
    setBgEffect(line.bgEffect || 'none');
    let charIndex = 0;
    setDisplayText('');
    setIsTyping(true);
    const typingSpeed = line.speaker === 'System' ? 20 : 30;
    const typingInterval = setInterval(() => {
      if (charIndex < line.text.length) { setDisplayText(line.text.substring(0, charIndex + 1)); charIndex++; }
      else { clearInterval(typingInterval); setIsTyping(false); setTimeout(() => setCurrentLine(prev => prev + 1), 2200); }
    }, typingSpeed);
    return () => clearInterval(typingInterval);
  }, [currentLine]);

  const handleSkip = () => {
    if (currentLine >= storyLines.length) { router.push('/select'); }
    else if (isTyping) { setDisplayText(storyLines[currentLine].text); setIsTyping(false); }
    else { setCurrentLine(prev => prev + 1); }
  };

  const currentStory = storyLines[currentLine];
  const getSpeakerIcon = (speaker: string) => { switch (speaker) { case 'Narrator': return '📖'; case 'Veteran Knight': return '⚔️'; case 'You': return '🛡️'; case 'System': return '⚡'; default: return '❓'; } };
  const getSpeakerBorder = (speaker: string) => { switch (speaker) { case 'Narrator': return 'border-gray-600'; case 'Veteran Knight': return 'border-blue-500'; case 'You': return 'border-yellow-500'; case 'System': return 'border-yellow-400'; default: return 'border-gray-500'; } };

  return (
    <div className="w-screen h-screen bg-black flex flex-col justify-end relative overflow-hidden cursor-pointer select-none" onClick={handleSkip}>
      <div className={`absolute inset-0 transition-all duration-1000 ${bgEffect === 'fade_red' ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-black to-black' : bgEffect === 'pulse' ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-black to-black' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-black to-black'}`} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="absolute bg-orange-500/60 rounded-full" style={{ left: `${10 + Math.random() * 80}%`, bottom: '0', width: `${2 + Math.random() * 2}px`, height: `${2 + Math.random() * 2}px`, animation: `float-up ${6 + Math.random() * 8}s linear ${Math.random() * 5}s infinite` }} />
        ))}
      </div>
      <div className="scanlines absolute inset-0 opacity-15"></div>
      <div className={`z-10 w-full transition-transform duration-100 ${bgEffect === 'shake' ? 'animate-shake' : ''}`}>
        <div className="p-6 md:p-10 bg-gradient-to-t from-black via-gray-950/98 to-transparent border-t border-blue-900/50 shadow-[0_-10px_60px_rgba(59,130,246,0.15)]">
          <div className="max-w-4xl mx-auto flex gap-5">
            <div className={`flex-shrink-0 w-20 h-20 bg-gray-900 border-2 ${getSpeakerBorder(currentStory?.speaker || '')} rounded-md flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(59,130,246,0.3)]`}>
              {getSpeakerIcon(currentStory?.speaker || '')}
            </div>
            <div className="flex-1">
              <h3 className="text-blue-400 font-bold text-lg mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" style={{ color: currentStory?.color === '#3b82f6' ? '#3b82f6' : currentStory?.color === '#fbbf24' ? '#fbbf24' : '#60a5fa' }}>
                {currentStory?.speaker || "???"}
              </h3>
              <p className="text-gray-200 text-xl md:text-2xl font-mono leading-relaxed min-h-[70px]" style={{ color: currentStory?.color || '#fff' }}>
                {displayText}
                {isTyping && <span className="animate-blink text-white">|</span>}
              </p>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-3 flex justify-between items-center">
            <div className="flex gap-1.5">
              {storyLines.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < currentLine ? 'bg-blue-500' : i === currentLine ? 'bg-blue-300 scale-125' : 'bg-gray-700'}`} />
              ))}
            </div>
            {currentLine >= storyLines.length ? (
              <button onClick={() => router.push('/select')} className="text-yellow-400 border border-yellow-600 px-6 py-2 rounded hover:bg-yellow-900/50 transition-all tracking-widest text-sm">ENTER THE CITY...</button>
            ) : (
              <p className="text-gray-600 text-xs tracking-widest animate-pulse">CLICK TO ADVANCE ▶</p>
            )}
          </div>
        </div>
      </div>
      <div className="absolute top-6 right-8 z-10 text-right">
        <p className="text-gray-700 text-xs tracking-[0.3em] uppercase">Chapter I</p>
        <p className="text-gray-600 text-xs tracking-widest">The Fall</p>
      </div>
    </div>
  );
}
