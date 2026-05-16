'use client';

import { useEffect, useRef, useState } from 'react';
import { Engine, UpgradeOption } from '@/game/Engine';
import HUD from '@/components/game/HUD';
import LevelUpOverlay from '@/components/game/LevelUpOverlay';

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
    const [stats, setStats] = useState({ 
    hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, 
    rage: 0, maxRage: 100, potions: 3, zone: 1, 
    weaponName: "Greatsword", weaponIndex: 0,
    level: 1, xp: 0, xpToLevel: 50,
    kills: 0, quota: 10, portalOpen: false,
    bossHp: 0, bossMaxHp: 0, time: 0 // TAMBAHAN BARU
  });
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'gameOver' | 'gameWin'>('playing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevZone, setPrevZone] = useState(1);

  useEffect(() => {
    if (stats.zone > prevZone) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 800); // Item 0.8 detik
    }
    setPrevZone(stats.zone);
  }, [stats.zone]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    
    engine.onStatsChange = (newStats) => setStats(newStats);
    engine.onLevelUp = (options) => setUpgrades(options);
    engine.onGameOver = () => setGameState('gameOver');
    engine.onGameWin = () => setGameState('gameWin');

    // Auto init dan start saat masuk halaman game (karena prologue sudah jalan)
    engine.initGame(true);
    engine.start();

    return () => { engine.stop(); };
  }, []);

  const handleSelectUpgrade = (upg: UpgradeOption) => {
    upg.apply(); 
    engineRef.current?.selectUpgrade(); 
    setUpgrades([]); 
  };

  const handleRestart = () => {
    setGameState('playing');
    setUpgrades([]);
    engineRef.current?.stop();
    engineRef.current?.initGame(true);
    engineRef.current?.start();
  };
  

  const weaponList = ["Greatsword", "Spear", "Daggers"];

  return (
    <div className="relative w-screen h-screen bg-black flex justify-center items-center overflow-hidden select-none">
      
            {/* --- BOSS HP BAR --- */}
      {stats.bossMaxHp > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-96 animate-fade-in">
          <div className="text-center mb-1 text-red-500 font-bold text-lg tracking-widest drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
            THE RED EMPEROR
          </div>
          <div className="w-full h-5 bg-gray-900 border-2 border-red-700 rounded-md overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300" 
              style={{ width: `${(stats.bossHp / stats.bossMaxHp) * 100}%` }} 
            />
            <div className="absolute inset-0 flex justify-center items-center text-white font-bold text-xs drop-shadow-md">
              {stats.bossHp} / {stats.bossMaxHp}
            </div>
          </div>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        width={900} 
        height={600} 
        className="border-2 border-gray-800 shadow-2xl shadow-blue-900/20 z-0"
      />

      {/* --- GAME OVER OVERLAY --- */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col justify-center items-center z-40 backdrop-blur-sm transition-opacity duration-500">
          <h2 className="text-7xl font-bold text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(255,0,0,1)] animate-pulse tracking-widest">
            YOU DIED
          </h2>
          <p className="text-xl text-gray-300 mb-10">The Red Empire conquered District {stats.zone}.</p>
          <p className="text-lg text-gray-400 mb-2">Time Survived: {Math.floor(stats.time / 60)}s</p>
<p className="text-lg text-gray-400 mb-8">Enemies Slain: {stats.kills}</p>
          <button 
            onClick={handleRestart}
            className="bg-red-950 border-2 border-red-500 px-10 py-4 text-2xl text-white font-bold rounded hover:bg-red-800 hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,0,0,0.4)]"
          >
            RISE AGAIN
          </button>
        </div>
      )}

      {/* --- WIN OVERLAY --- */}
      {gameState === 'gameWin' && (
        <div className="absolute inset-0 bg-yellow-900/80 flex flex-col justify-center items-center z-40 backdrop-blur-sm transition-opacity duration-500">
          <h2 className="text-7xl font-bold text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,1)] animate-bounce tracking-widest">
            REALM SAVED!
          </h2>
          <p className="text-xl text-gray-200 mb-2">You reached the Magic Duck!</p>
          <p className="text-lg text-yellow-200 mb-10">Final Level: {stats.level}</p>
          <p className="text-lg text-yellow-200 mb-2">Time: {Math.floor(stats.time / 60)}s | Kills: {stats.kills}</p>
<p className="text-lg text-yellow-200 mb-10">Final Level: {stats.level}</p>
          <button 
            onClick={handleRestart}
            className="bg-yellow-950 border-2 border-yellow-400 px-10 py-4 text-2xl text-white font-bold rounded hover:bg-yellow-800 hover:scale-110 transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)]"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* --- LEVEL UP OVERLAY --- */}
      {upgrades.length > 0 && gameState === 'playing' && (
        <LevelUpOverlay upgrades={upgrades} onSelect={handleSelectUpgrade} />
      )}

      {/* --- HUD --- */}
      {gameState === 'playing' && (
        <HUD stats={stats} weaponList={weaponList} />
      )}

    </div>
  );
}