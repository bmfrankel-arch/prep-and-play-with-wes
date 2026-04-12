'use client';

interface NumberLineProps {
  min?: number;
  max?: number;
  highlight?: number;
}

export default function NumberLine({ min = 0, max = 100, highlight }: NumberLineProps) {
  const step = max <= 20 ? 1 : max <= 50 ? 5 : 10;
  const ticks = [];
  for (let i = min; i <= max; i += step) {
    ticks.push(i);
  }

  return (
    <div className="bg-white border-2 border-navy/20 rounded-xl p-3 overflow-x-auto">
      <div className="flex items-end gap-0 min-w-max">
        {ticks.map(n => (
          <div key={n} className="flex flex-col items-center" style={{ minWidth: step === 1 ? '28px' : '36px' }}>
            <span className={`text-xs font-bold mb-1 ${
              n === highlight ? 'text-coral text-sm' : 'text-navy/70'
            }`}>
              {n}
            </span>
            <div className={`w-0.5 ${
              n === highlight ? 'h-6 bg-coral' : n % 10 === 0 ? 'h-4 bg-navy/40' : 'h-2 bg-navy/20'
            }`} />
          </div>
        ))}
      </div>
      <div className="h-0.5 bg-navy/30 -mt-px" />
    </div>
  );
}
