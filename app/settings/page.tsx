'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SaveManager } from '@/game/SaveManager';
import { GameSettings } from '@/game/types';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GameSettings>(SaveManager.settings);

  useEffect(() => {
    SaveManager.updateSettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col justify-center items-center overflow-hidden select-none relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/20 via-black to-black" />
      
      <div className="z-10 w-full max-w-2xl px-8">
        <h2 className="text-4xl font-bold text-blue-400 mb-12 tracking-[0.3em] text-center drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          SETTINGS
        </h2>

        <div className="space-y-6">
          {/* Master Volume */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">MASTER VOLUME</span>
            <input 
              type="range" min="0" max="100" value={Math.round(settings.masterVolume * 100)}
              onChange={(e) => updateSetting('masterVolume', parseInt(e.target.value) / 100)}
              className="w-48 accent-blue-500"
            />
            <span className="text-gray-500 text-xs w-10 text-right">{Math.round(settings.masterVolume * 100)}%</span>
          </div>

          {/* SFX Volume */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">SFX VOLUME</span>
            <input 
              type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => updateSetting('sfxVolume', parseInt(e.target.value) / 100)}
              className="w-48 accent-blue-500"
            />
            <span className="text-gray-500 text-xs w-10 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
          </div>

          {/* Music Volume */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">MUSIC VOLUME</span>
            <input 
              type="range" min="0" max="100" value={Math.round(settings.musicVolume * 100)}
              onChange={(e) => updateSetting('musicVolume', parseInt(e.target.value) / 100)}
              className="w-48 accent-blue-500"
            />
            <span className="text-gray-500 text-xs w-10 text-right">{Math.round(settings.musicVolume * 100)}%</span>
          </div>

          {/* Screen Shake */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">SCREEN SHAKE</span>
            <button 
              onClick={() => updateSetting('screenShake', !settings.screenShake)}
              className={`w-12 h-6 rounded-full transition-all ${settings.screenShake ? 'bg-blue-600' : 'bg-gray-700'} relative`}
            >
              <span className={`absolute top-0.5 ${settings.screenShake ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
            </button>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">MINIMAP</span>
            <button 
              onClick={() => updateSetting('showMinimap', !settings.showMinimap)}
              className={`w-12 h-6 rounded-full transition-all ${settings.showMinimap ? 'bg-blue-600' : 'bg-gray-700'} relative`}
            >
              <span className={`absolute top-0.5 ${settings.showMinimap ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
            </button>
          </div>

          {/* Damage Numbers */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <span className="text-gray-300 text-sm tracking-wider w-40">DAMAGE NUMBERS</span>
            <button 
              onClick={() => updateSetting('showDamageNumbers', !settings.showDamageNumbers)}
              className={`w-12 h-6 rounded-full transition-all ${settings.showDamageNumbers ? 'bg-blue-600' : 'bg-gray-700'} relative`}
            >
              <span className={`absolute top-0.5 ${settings.showDamageNumbers ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
            </button>
          </div>

          {/* Reset Save Data */}
          <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-red-900">
            <span className="text-red-400 text-sm tracking-wider w-40">RESET SAVE DATA</span>
            <button 
              onClick={() => { if (confirm('Are you sure? This will erase ALL progress!')) { SaveManager.resetAll(); alert('Save data erased!'); } }}
              className="px-4 py-2 bg-red-950 border border-red-500 text-red-400 text-xs rounded hover:bg-red-800 transition-all"
            >
              RESET ALL
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <button 
            onClick={() => router.push('/')}
            className="px-10 py-3 text-lg text-white font-bold tracking-widest bg-gray-800 border-2 border-gray-600 rounded hover:bg-gray-700 transition-all"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
}
