// ============================================================
// PauseMenu.tsx - Pause overlay with settings
// New component for Escape key pause
// ============================================================

'use client';

import { GameSettings } from '@/game/types';

interface PauseMenuProps {
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ settings, onUpdateSettings, onResume, onQuit }: PauseMenuProps) {
  return (
    <div className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center z-40 backdrop-blur-sm">
      <h2 className="text-5xl font-bold text-blue-400 mb-12 tracking-[0.3em] drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
        PAUSED
      </h2>

      <div className="flex flex-col gap-6 w-80 mb-12">
        {/* Master Volume */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">MASTER VOLUME</span>
          <input 
            type="range" min="0" max="100" value={Math.round(settings.masterVolume * 100)}
            onChange={(e) => onUpdateSettings({ masterVolume: parseInt(e.target.value) / 100 })}
            className="w-32 accent-blue-500"
          />
        </div>

        {/* SFX Volume */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">SFX VOLUME</span>
          <input 
            type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
            onChange={(e) => onUpdateSettings({ sfxVolume: parseInt(e.target.value) / 100 })}
            className="w-32 accent-blue-500"
          />
        </div>

        {/* Music Volume */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">MUSIC VOLUME</span>
          <input 
            type="range" min="0" max="100" value={Math.round(settings.musicVolume * 100)}
            onChange={(e) => onUpdateSettings({ musicVolume: parseInt(e.target.value) / 100 })}
            className="w-32 accent-blue-500"
          />
        </div>

        {/* Screen Shake */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">SCREEN SHAKE</span>
          <button 
            onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
            className={`w-12 h-6 rounded-full transition-all ${settings.screenShake ? 'bg-blue-600' : 'bg-gray-700'} relative`}
          >
            <span className={`absolute top-0.5 ${settings.screenShake ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
          </button>
        </div>

        {/* Minimap */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">MINIMAP</span>
          <button 
            onClick={() => onUpdateSettings({ showMinimap: !settings.showMinimap })}
            className={`w-12 h-6 rounded-full transition-all ${settings.showMinimap ? 'bg-blue-600' : 'bg-gray-700'} relative`}
          >
            <span className={`absolute top-0.5 ${settings.showMinimap ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
          </button>
        </div>

        {/* Damage Numbers */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-wider">DAMAGE NUMBERS</span>
          <button 
            onClick={() => onUpdateSettings({ showDamageNumbers: !settings.showDamageNumbers })}
            className={`w-12 h-6 rounded-full transition-all ${settings.showDamageNumbers ? 'bg-blue-600' : 'bg-gray-700'} relative`}
          >
            <span className={`absolute top-0.5 ${settings.showDamageNumbers ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <button 
          onClick={onResume}
          className="px-10 py-4 text-xl text-white font-bold tracking-widest bg-blue-800 border-2 border-blue-400 rounded hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-110"
        >
          RESUME
        </button>
        <button 
          onClick={onQuit}
          className="px-10 py-4 text-xl text-white font-bold tracking-widest bg-red-950 border-2 border-red-500 rounded hover:bg-red-800 transition-all shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:scale-110"
        >
          QUIT
        </button>
      </div>

      <p className="text-gray-700 text-xs mt-8 tracking-widest">ESC TO RESUME</p>
    </div>
  );
}
