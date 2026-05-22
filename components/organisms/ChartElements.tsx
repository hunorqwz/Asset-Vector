import React from 'react';


export const MenuToggle = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    onClick={onClick} 
    className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/[0.03] transition-colors rounded group"
  >
    <span className={`text-[11px] font-bold tracking-widest uppercase transition-colors ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{label}</span>
    <div className={`w-3 h-3 border transition-all flex items-center justify-center ${active ? 'border-white bg-white/10' : 'border-white/20 bg-transparent'}`}>
      {active && <div className="w-1.5 h-1.5 bg-white" />}
    </div>
  </button>
);

export const GlassBoxLegendItem = ({ 
  label, value, color, 
  isDashed = false, isDotted = false 
}: { 
  label: string, value?: string | number | null, color: string, 
  isDashed?: boolean, isDotted?: boolean
}) => {
  return (
    <div className="flex items-center gap-1.5 group relative">
      <div 
        className={`w-2 h-0.5 ${isDashed ? 'border-t border-dashed' : isDotted ? 'border-t border-dotted' : ''}`} 
        style={isDashed || isDotted ? { borderColor: color, backgroundColor: 'transparent' } : { backgroundColor: color }} 
      />
      <span className="text-xs font-medium text-zinc-400">
        {label} {value !== undefined && value !== null && <span className="text-zinc-300 ml-1">{value}</span>}
      </span>
    </div>
  );
};
