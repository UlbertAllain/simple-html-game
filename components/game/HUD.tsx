// ============================================================
// HUD.tsx - Improved HUD with typed stats, gold, class, artifacts
// Fixed: Removed `any` type, added new info displays
// ============================================================

import { GameStats } from '@/game/types';

export default function HUD({ stats, weaponList }: { stats: GameStats, weaponList: string[] }) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 p-3 rounded-md border border-gray-700 flex gap-4 items-end text-white font-bold text-sm tracking-wider z-20">
      {/* Bars */}
      <div className="flex flex-col gap-1 w-36">
        <div>
          <span className="text-red-500 text-[9px]">VITALITY</span>
          <div className="w-full h-2.5 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-100" style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} />
          </div>
        </div>
        <div>
          <span className="text-green-500 text-[9px]">ENDURANCE</span>
          <div className="w-full h-2.5 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${(stats.stamina / stats.maxStamina) * 100}%` }} />
          </div>
        </div>
        <div>
          <span className="text-blue-500 text-[9px]">RAGE</span>
          <div className="w-full h-2.5 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${(stats.rage / stats.maxRage) * 100}%` }} />
          </div>
        </div>
        <div>
          <span className="text-yellow-500 text-[9px]">EXP - LVL {stats.level}</span>
          <div className="w-full h-2.5 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
            <div className="h-full bg-yellow-400 transition-all duration-100" style={{ width: `${(stats.xp / stats.xpToLevel)*100}%` }} />
          </div>
        </div>
      </div>

      {/* Items & Skills */}
      <div className="flex flex-col items-center gap-1 border-l border-r border-gray-700 px-3 py-1">
        <span className="text-[9px] text-gray-400">POTION</span>
        <span className="text-base text-green-400">{stats.potions} 🧪</span>
        <span className="text-[7px] text-gray-500">[E]</span>
      </div>
      <div className="flex flex-col items-center gap-1 border-r border-gray-700 pr-3 py-1">
        <span className="text-[9px] text-gray-400">SKILL</span>
        <span className="text-base text-blue-400">⚡</span>
        <span className="text-[7px] text-gray-500">[RMB]</span>
      </div>

      {/* Weapon */}
      <div className="flex flex-col gap-1">
        <span className="text-yellow-400 font-mono text-[9px]">WEAPON</span>
        <div className="flex gap-1">
          {weaponList.map((w, i) => (
            <div key={i} className={`text-[9px] px-1.5 py-0.5 border ${stats.weaponIndex === i ? 'border-yellow-400 text-yellow-400 bg-yellow-900/20' : 'border-gray-600 text-gray-500'}`}>
              {i+1}.{w.slice(0,3)}
            </div>
          ))}
        </div>
      </div>

      {/* Class & Artifacts */}
      <div className="flex flex-col items-center gap-1 border-l border-gray-700 pl-3">
        <span className="text-[9px] text-gray-400">CLASS</span>
        <span className="text-xs text-purple-400 capitalize">{stats.className}</span>
        {stats.artifactCount > 0 && (
          <span className="text-[8px] text-amber-400">💎 {stats.artifactCount}</span>
        )}
      </div>

      {/* Zone Progress */}
      <div className="text-white text-base font-mono border-l border-gray-700 pl-3 flex flex-col items-center">
        <span className="text-[9px] text-gray-400">ESCAPE CITY</span>
        <span className={stats.zone >= 5 ? "text-green-400" : "text-yellow-400"}>
          D-{stats.zone} / 5
        </span>
      </div>

      {/* Kill Quota */}
      <div className="text-white text-base font-mono border-l border-gray-700 pl-3 flex flex-col items-center">
        <span className="text-[9px] text-gray-400">TARGET</span>
        <span className={stats.portalOpen ? "text-green-400" : "text-red-400"}>
          {stats.portalOpen ? "OPEN!" : `${stats.kills} / ${stats.quota}`}
        </span>
      </div>

      {/* Gold */}
      <div className="text-white text-base font-mono border-l border-gray-700 pl-3 flex flex-col items-center">
        <span className="text-[9px] text-gray-400">GOLD</span>
        <span className="text-yellow-300">🪙 {stats.gold}</span>
      </div>
    </div>
  );
}
