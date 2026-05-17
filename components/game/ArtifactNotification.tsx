// ============================================================
// ArtifactNotification.tsx - Popup when player picks up artifact
// ============================================================

'use client';

import { useEffect, useState } from 'react';

interface ArtifactNotificationProps {
  artifact: { name: string; description: string; rarity: string; icon: string } | null;
  onDismiss: () => void;
}

const rarityBorder: Record<string, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

const rarityGlow: Record<string, string> = {
  common: 'shadow-gray-400/20',
  rare: 'shadow-blue-500/40',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/60',
};

const rarityText: Record<string, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

export default function ArtifactNotification({ artifact, onDismiss }: ArtifactNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (artifact) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [artifact, onDismiss]);

  if (!artifact) return null;

  return (
    <div className={`absolute top-20 right-8 z-30 transition-all duration-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
      <div className={`bg-black/90 border-2 ${rarityBorder[artifact.rarity] || rarityBorder.common} rounded-lg p-4 w-64 shadow-xl ${rarityGlow[artifact.rarity] || ''}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{artifact.icon}</span>
          <div>
            <h3 className="text-white font-bold text-sm">{artifact.name}</h3>
            <span className={`text-[9px] uppercase tracking-widest ${rarityText[artifact.rarity] || rarityText.common}`}>
              {artifact.rarity}
            </span>
          </div>
        </div>
        <p className="text-gray-300 text-xs">{artifact.description}</p>
      </div>
    </div>
  );
}
