import { UpgradeOption } from '@/game/Engine';

export default function LevelUpOverlay({ upgrades, onSelect }: { upgrades: UpgradeOption[], onSelect: (upg: UpgradeOption) => void }) {
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
            className="bg-gray-900/80 border-2 border-yellow-500 p-8 w-64 h-48 flex flex-col justify-center items-center rounded-lg hover:bg-yellow-900/40 hover:border-yellow-300 hover:scale-110 transition-all duration-200 shadow-xl group"
          >
            <span className="text-3xl font-bold text-white mb-4 group-hover:text-yellow-200 transition-colors">{upg.title}</span>
            <span className="text-base text-gray-300 text-center">{upg.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}