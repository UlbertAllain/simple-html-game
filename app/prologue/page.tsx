"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const storyLines = [
  { speaker: "Narrator", text: "The Red Empire invaded at dawn...", color: "#ef4444" },
  { speaker: "Narrator", text: "Your kingdom has fallen to ashes.", color: "#9ca3af" },
  { speaker: "Veteran Knight", text: "You are the last of the Blue Knights.", color: "#3b82f6" },
  { speaker: "Veteran Knight", text: "Survive the 5 Districts. Reach the Magic Duck.", color: "#f59e0b" },
  { speaker: "Mysterious Voice", text: "I sense potential in you... Choose your path wisely.", color: "#a855f7" },
  { speaker: "System", text: "Save the realm.", color: "#fbbf24" }
];

export default function ProloguePage() {
  const router = useRouter();
  const [currentLine, setCurrentLine] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLine >= storyLines.length) return;

    const line = storyLines[currentLine];
    let charIndex = 0;
    setDisplayText('');
    setIsTyping(true);

    const typingInterval = setInterval(() => {
      if (charIndex < line.text.length) {
        setDisplayText(line.text.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        setTimeout(() => setCurrentLine(prev => prev + 1), 2500);
      }
    }, 35);

    return () => clearInterval(typingInterval);
  }, [currentLine]);

  const handleSkip = () => {
    if (isTyping) return;
    router.push('/select');
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col justify-end relative overflow-hidden cursor-pointer" onClick={handleSkip}>
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-950/30 via-black to-black opacity-80" />
      <div className="scanlines absolute inset-0 opacity-20"></div>

      <div className="z-10 w-full p-8 md:p-12 bg-gradient-to-t from-black via-gray-950/95 to-transparent border-t-2 border-blue-800 shadow-[0_-10px_50px_rgba(59,130,246,0.2)]">
        
        <div className="max-w-4xl mx-auto flex gap-6">
          <div className="flex-shrink-0 w-24 h-24 bg-gray-900 border-2 border-blue-500 rounded-md flex items-center justify-center text-5xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            ⚔️
          </div>

          <div className="flex-1">
            <h3 className="text-blue-400 font-bold text-xl mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">
              {storyLines[currentLine]?.speaker || "???"}
            </h3>

            <p className="text-gray-200 text-2xl md:text-3xl font-mono leading-relaxed min-h-[80px]" style={{ color: storyLines[currentLine]?.color || '#fff' }}>
              {displayText}
              {isTyping && <span className="animate-blink text-white">|</span>}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-4 text-right">
          {currentLine >= storyLines.length ? (
            <button 
              onClick={() => router.push('/select')}
              className="text-yellow-400 border border-yellow-600 px-6 py-2 rounded hover:bg-yellow-900/50 transition-all tracking-widest"
            >
              ENTER THE CITY...
            </button>
          ) : (
            <p className="text-gray-600 text-sm animate-pulse tracking-widest">CLICK TO SKIP ▶</p>
          )}
        </div>
      </div>
    </div>
  );
}
