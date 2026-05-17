'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Engine, UpgradeOption } from '@/game/Engine';
import HUD from '@/components/game/HUD';
import LevelUpOverlay from '@/components/game/LevelUpOverlay';
import PauseMenu from '@/components/game/PauseMenu';
import ArtifactNotification from '@/components/game/ArtifactNotification';
import { GameStats, PlayerClass } from '@/game/types';
import { SaveManager } from '@/game/SaveManager';
import { AudioManager } from '@/game/AudioManager';
import { getWeaponsForClass } from '@/game/Weapons';

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [stats, setStats] = useState<GameStats>({ 
    hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, 
    rage: 0, maxRage: 100, potions: 3, zone: 1, 
    weaponName: "Greatsword", weaponIndex: 0,
    level: 1, xp: 0, xpToLevel: 50,
    kills: 0, quota: 10, portalOpen: false,
    bossHp: 0, bossMaxHp: 0, time: 0,
    gold: 0, className: 'warrior', artifactCount: 0,
  });
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'gameOver' | 'gameWin'>('playing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevZone, setPrevZone] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [lastArtifact, setLastArtifact] = useState<{ name: string; description: string; rarity: string; icon: string } | null>(null);

  // Get selected class from URL params or default
  const [playerClass] = useState<PlayerClass>(() => {
    if (typeof window === 'undefined') return 'warrior';
    const params = new URLSearchParams(window.location.search);
    return (params.get('class') as PlayerClass) || 'warrior';
  });

  useEffect(() => {
    if (stats.zone > prevZone) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 800);
    }
    setPrevZone(stats.zone);
  }, [stats.zone, prevZone]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    
    engine.onStatsChange = (newStats) => setStats(newStats);
    engine.onLevelUp = (options) => setUpgrades(options);
    engine.onGameOver = () => setGameState('gameOver');
    engine.onGameWin = () => setGameState('gameWin');
    engine.onArtifactPickup = (artifact) => setLastArtifact(artifact);

    // Init audio on first interaction
    const initAudio = () => {
      engine.initAudio();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    engine.initGame(true, playerClass);
    engine.start();

    return () => { engine.destroy(); };
  }, [playerClass]);

  // Sync pause state with engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.isUserPaused = isPaused;
      engineRef.current.isPaused = isPaused || upgrades.length > 0;
    }
  }, [isPaused, upgrades]);

  const handleSelectUpgrade = useCallback((upg: UpgradeOption) => {
    upg.apply(); 
    engineRef.current?.selectUpgrade(); 
    setUpgrades([]); 
  }, []);

  const handleRestart = useCallback(() => {
    setGameState('playing');
    setUpgrades([]);
    setIsPaused(false);
    engineRef.current?.stop();
    engineRef.current?.initGame(true, playerClass);
    engineRef.current?.start();
  }, [playerClass]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleQuit = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleUpdateSettings = useCallback((settings: Partial<import('@/game/types').GameSettings>) => {
    SaveManager.updateSettings(settings);
    AudioManager.updateSettings(SaveManager.settings);
  }, []);

  const dismissArtifact = useCallback(() => {
    setLastArtifact(null);
  }, []);

  const weaponList = getWeaponsForClass(playerClass).map(w => w.name);

  return (
    <div className="relative w-screen h-screen bg-black flex justify-center items-center overflow-hidden select-none">
      
      {/* Boss HP Bar */}
      {stats.bossMaxHp > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-96 animate-fade-in-up">
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
        onClick={() => engineRef.current?.initAudio()}
      />

      {/* Zone Transition Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black z-50 animate-fade-in pointer-events-none" />
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col justify-center items-center z-40 backdrop-blur-sm transition-opacity duration-500">
          <h2 className="text-7xl font-bold text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(255,0,0,1)] animate-pulse tracking-widest">
            YOU DIED
          </h2>
          <p className="text-xl text-gray-300 mb-10">The Red Empire conquered District {stats.zone}.</p>
          <p className="text-lg text-gray-400 mb-2">Time Survived: {Math.floor(stats.time / 60)}s</p>
          <p className="text-lg text-gray-400 mb-2">Enemies Slain: {stats.kills}</p>
          <p className="text-lg text-gray-400 mb-8">Gold Earned: {stats.gold}</p>
          <button 
            onClick={handleRestart}
            className="bg-red-950 border-2 border-red-500 px-10 py-4 text-2xl text-white font-bold rounded hover:bg-red-800 hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,0,0,0.4)]"
          >
            RISE AGAIN
          </button>
        </div>
      )}

      {/* Win Overlay */}
      {gameState === 'gameWin' && (
        <div className="absolute inset-0 bg-yellow-900/80 flex flex-col justify-center items-center z-40 backdrop-blur-sm transition-opacity duration-500">
          <h2 className="text-7xl font-bold text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,1)] animate-bounce tracking-widest">
            REALM SAVED!
          </h2>
          <p className="text-xl text-gray-200 mb-2">You reached the Magic Duck!</p>
          <p className="text-lg text-yellow-200 mb-2">Final Level: {stats.level}</p>
          <p className="text-lg text-yellow-200 mb-10">Time: {Math.floor(stats.time / 60)}s | Kills: {stats.kills} | Gold: {stats.gold}</p>
          <button 
            onClick={handleRestart}
            className="bg-yellow-950 border-2 border-yellow-400 px-10 py-4 text-2xl text-white font-bold rounded hover:bg-yellow-800 hover:scale-110 transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)]"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* Level Up Overlay */}
      {upgrades.length > 0 && gameState === 'playing' && (
        <LevelUpOverlay upgrades={upgrades} onSelect={handleSelectUpgrade} />
      )}

      {/* Pause Menu */}
      {isPaused && gameState === 'playing' && upgrades.length === 0 && (
        <PauseMenu 
          settings={SaveManager.settings}
          onUpdateSettings={handleUpdateSettings}
          onResume={handleResume}
          onQuit={handleQuit}
        />
      )}

      {/* HUD */}
      {gameState === 'playing' && (
        <HUD stats={stats} weaponList={weaponList} />
      )}

      {/* Artifact Notification */}
      <ArtifactNotification artifact={lastArtifact} onDismiss={dismissArtifact} />

      {/* Controls hint (fades after a few seconds) */}
      <div className="absolute top-4 left-4 text-gray-600 text-[10px] tracking-wider z-10 pointer-events-none">
        <p>WASD: Move | LMB: Attack | RMB: Shockwave | Q: Skill | E: Potion | 1-3: Weapon | ESC: Pause</p>
      </div>
    </div>
  );
}
