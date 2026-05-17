// ============================================================
// LevelUpOverlay.tsx - Level up selection screen
// Improved: Shows rarity colors, icons, better styling
// ============================================================

import { UpgradeOption } from '@/game/Engine';

export default function LevelUpOverlay({ upgrades, onSelect }: { upgrades: UpgradeOption[], onSelect: (upg: UpgradeOption) => void }) {
  const rarityColors: Record<string, string> = {
    common: 'border-gray-400 hover:border-gray-200',
    rare: 'border-blue-500 hover:border-blue-300',
    epic: 'border-purple-500 hover:border-purple-300',
  };

  const rarityGlows: Record<string, string> = {
    common: 'shadow-gray-500/20',
    rare: 'shadow-blue-500/30',
    epic: 'shadow-purple-500/40',
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center z-30 backdrop-blur-sm">
      <h2 className="text-6xl font-bold text-yellow-400 mb-10 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-pulse">
        LEVEL UP!
      </h2>
      <div className="flex gap-8">
        {upgrades.map((upg) => (
          <button 
            key={upg.id} 
            onClick={() => onSelect(upg)}
            className={`bg-gray-900/80 border-2 ${rarityColors[upg.rarity] || rarityColors.common} p-8 w-64 h-48 flex flex-col justify-center items-center rounded-lg hover:bg-gray-800/60 hover:scale-110 transition-all duration-200 shadow-xl group ${rarityGlows[upg.rarity] || rarityGlows.common}`}
          >
            <span className="text-3xl mb-2">{upg.icon}</span>
            <span className="text-2xl font-bold text-white mb-3 group-hover:text-yellow-200 transition-colors">{upg.title}</span>
            <span className="text-sm text-gray-300 text-center">{upg.description}</span>
            <span className={`text-[9px] mt-2 uppercase tracking-widest ${upg.rarity === 'epic' ? 'text-purple-400' : upg.rarity === 'rare' ? 'text-blue-400' : 'text-gray-500'}`}>
              {upg.rarity}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
