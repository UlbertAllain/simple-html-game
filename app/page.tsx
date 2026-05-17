"use client";

import { useState, useEffect } from 'react';

export default function MainMenu() {
  const [isExiting, setIsExiting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [titleVisible, setTitleVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => { setMounted(true); setTimeout(() => setTitleVisible(true), 300); setTimeout(() => setMenuVisible(true), 800); }, []);

  const handleStart = () => { setIsExiting(true); setTimeout(() => window.location.href = '/prologue', 800); };

  const menuItems = [
    { id: 'start', label: 'START JOURNEY', icon: '⚔️', active: true, onClick: handleStart },
    { id: 'settings', label: 'SETTINGS', icon: '⚙️', active: false, onClick: () => {} },
    { id: 'credits', label: 'CREDITS', icon: '📜', active: false, onClick: () => {} },
  ];

  return (
    <div className={`w-screen h-screen bg-black flex overflow-hidden select-none relative transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* LEFT: Visual Scene */}
      <div className="hidden md:flex w-3/5 h-full relative items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-950/20 via-black to-black" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-64 h-64 rounded-full border border-blue-800/40 flex items-center justify-center relative" style={{ boxShadow: '0 0 80px rgba(59, 130, 246, 0.15), inset 0 0 80px rgba(59, 130, 246, 0.05)' }}>
            <div className="absolute inset-2 rounded-full border border-blue-700/20 animate-pulse" />
            <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
              <path d="M50 8 L82 26 L82 60 L50 88 L18 60 L18 26 Z" stroke="#3b82f6" strokeWidth="3" fill="rgba(30, 58, 138, 0.2)"/>
              <rect x="47" y="15" width="6" height="50" fill="#bfdbfe" rx="1"/>
              <rect x="33" y="40" width="34" height="5" fill="#60a5fa" rx="1"/>
              <circle cx="50" cy="43" r="5" fill="#3b82f6" stroke="#bfdbfe" strokeWidth="1.5"/>
              <circle cx="50" cy="43" r="9" fill="transparent" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="3"/>
            </svg>
            {mounted && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60" style={{ animation: `orbit${i % 3} ${8 + i * 2}s linear infinite`, animationDelay: `${i * 0.5}s` }} />
            ))}
          </div>
          <p className="text-blue-900 text-xs tracking-[0.5em] uppercase mt-6">A Tiny Swords Story</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        {mounted && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="absolute bottom-0 bg-blue-500/50 rounded-full" style={{ left: `${Math.random() * 100}%`, width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`, animation: `float-up ${Math.random() * 10 + 8}s linear ${Math.random() * 5}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Menu */}
      <div className="w-full md:w-2/5 h-full flex flex-col justify-center items-start px-10 md:px-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-transparent md:from-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950/10 via-transparent to-transparent" />
        <div className="z-10 w-full">
          <div className={`mb-16 transition-all duration-1000 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="logo-title text-6xl md:text-7xl font-black tracking-[0.08em] leading-none">THE LAST</h1>
            <h1 className="logo-title text-6xl md:text-7xl font-black tracking-[0.25em] leading-none mt-1">BLUE</h1>
            <div className="flex items-center gap-4 mt-5">
              <div className="h-[2px] w-12 bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <p className="text-blue-900 text-xs tracking-[0.4em] uppercase font-light">A Tiny Swords Story</p>
            </div>
          </div>
          <div className={`flex flex-col gap-3 transition-all duration-1000 delay-300 ${menuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {menuItems.map((item) => (
              <div key={item.id} onClick={item.active ? item.onClick : undefined} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}
                className={`relative flex items-center gap-4 py-3 px-4 -ml-4 rounded transition-all duration-200 ${!item.active ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'} ${hoveredItem === item.id && item.active ? 'bg-blue-950/30 translate-x-3' : ''}`}>
                <div className={`w-0.5 h-6 rounded-full transition-all duration-200 ${hoveredItem === item.id && item.active ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-gray-700'}`} />
                <span className={`text-lg transition-colors duration-200 ${hoveredItem === item.id && item.active ? 'text-blue-300' : item.active ? 'text-gray-400' : 'text-gray-600'}`}>{item.icon}</span>
                <span className={`text-xl font-bold tracking-[0.15em] transition-all duration-200 ${hoveredItem === item.id && item.active ? 'text-white' : item.active ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</span>
                {hoveredItem === item.id && item.active && <span className="text-blue-400 text-sm ml-auto animate-pulse">▶</span>}
              </div>
            ))}
          </div>
          <div className={`mt-20 transition-all duration-1000 delay-500 ${menuVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 text-gray-700 text-[10px] tracking-[0.3em] uppercase">
              <div className="w-1 h-1 bg-blue-800 rounded-full" /> Build v0.2.0 Alpha <div className="w-1 h-1 bg-blue-800 rounded-full" />
            </div>
            <p className="text-gray-800 text-[9px] tracking-widest mt-1">5 DISTRICTS · 5 ENEMY TYPES · 1 FATE</p>
          </div>
        </div>
      </div>
      <div className="scanlines absolute inset-0 opacity-10 pointer-events-none" />
    </div>
  );
}
