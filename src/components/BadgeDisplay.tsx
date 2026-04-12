'use client';

import { SkillArea, SKILL_CONFIG, DifficultyLevel } from '@/lib/types';

interface BadgeDisplayProps {
  skillArea: SkillArea;
  level: DifficultyLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function BadgeDisplay({ skillArea, level, size = 'md', showLabel = false }: BadgeDisplayProps) {
  const config = SKILL_CONFIG[skillArea];
  const glowClass = level === 1 ? 'badge-glow-gray' : level === 2 ? 'badge-glow-blue' : 'badge-glow-gold';
  const sizeClass = size === 'sm' ? 'w-12 h-12 text-xl' : size === 'md' ? 'w-16 h-16 text-2xl' : 'w-24 h-24 text-4xl';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sizeClass} ${glowClass} rounded-full flex items-center justify-center bg-white`}>
        {config.badges[level]}
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-navy text-center leading-tight">
          {config.label}
        </span>
      )}
    </div>
  );
}
