"use client";

import { useState, useEffect } from 'react';

export default function MainMenu() {
  const [isExiting, setIsExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => window.location.href = '/prologue', 800);
  };

  return (
    <div className={`w-screen h-screen bg-black flex justify-end items-center overflow-hidden select-none relative transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Background Vignet */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/20 via-black to-black" />

      {/* Partikel Api (Hanya render di client) */}
      {mounted && (
        <div className="absolute bottom-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute bottom-0 bg-blue-500 rounded-full" style={{
              left: `${Math.random() * 100}%`, width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`,
              animation: `float-up ${Math.random() * 8 + 5}s linear ${Math.random() * 5}s infinite`
            }} />
          ))}
        </div>
      )}

      {/* Overlay Scanlines */}
      <div className="scanlines absolute inset-0 opacity-20"></div>

      {/* Konten Menu (Di geser ke kanan) */}
      <div className="z-10 w-full md:w-1/2 flex flex-col justify-center items-start px-20">
        
        {/* Judul Game */}
                {/* Judul Game + Logo SVG */}
        <div className="mb-20 flex flex-col items-start">
          
          {/* SVG Icon: Pedang & Perisai */}
          <div className="mb-4 ml-2 drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Perisai Belakang */}
              <path d="M50 10 L85 30 L85 65 L50 90 L15 65 L15 30 Z" stroke="#3b82f6" strokeWidth="4" fill="rgba(30, 58, 138, 0.3)"/>
              {/* Pedang Tengah */}
              <rect x="46" y="20" width="8" height="55" fill="#bfdbfe" rx="2"/>
              {/* Pegangan Pedang (Horisontal) */}
              <rect x="32" y="45" width="36" height="6" fill="#60a5fa" rx="2"/>
              {/* Batu Biru di Tengah (The Last Blue) */}
              <circle cx="50" cy="48" r="6" fill="#3b82f6" stroke="#bfdbfe" strokeWidth="2"/>
              {/* Efek Sinar Batu */}
              <circle cx="50" cy="48" r="10" fill="transparent" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="4"/>
            </svg>
          </div>

          {/* Teks Logo */}
          <h1 className="logo-title text-7xl md:text-8xl font-black tracking-[0.1em] leading-none">
            THE LAST
          </h1>
          <h1 className="logo-title text-7xl md:text-8xl font-black tracking-[0.3em] leading-none mt-2">
            BLUE
          </h1>
          
          <div className="h-1 w-32 bg-blue-600 mt-6 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
          <p className="logo-subtitle text-gray-500 mt-4 italic text-sm font-light">
            A TINY SWORDS STORY
          </p>
        </div>
          <div className="h-1 w-32 bg-blue-600 mt-4 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
          <p className="text-gray-500 mt-4 italic tracking-widest text-sm">A Tiny Swords Story</p>
        </div>

        {/* Navigasi Menu */}
        <div className="flex flex-col gap-6 text-3xl font-bold text-gray-500">
          <div onClick={handleStart} className="menu-item cursor-pointer text-white hover:text-blue-400 flex items-center gap-4">
            <span className="text-blue-600 text-xl">►</span> START JOURNEY
          </div>
          <div className="menu-item cursor-not-allowed flex items-center gap-4">
            <span className="text-gray-700 text-xl">►</span> SETTINGS
          </div>
          <div className="menu-item cursor-not-allowed flex items-center gap-4">
            <span className="text-gray-700 text-xl">►</span> CREDITS
          </div>
        </div>

        <p className="absolute bottom-10 left-20 text-gray-800 text-xs tracking-widest">BUILD v0.1.0 ALPHA</p>
      </div>
    
  );
}