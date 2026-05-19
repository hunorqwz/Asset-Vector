import React from 'react';
import { THEORY_CONTENT } from './GlassBoxTheory';

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
  label, value, theoryKey, color, 
  isDashed = false, isDotted = false 
}: { 
  label: string, value?: string | number | null, theoryKey?: string, color: string, 
  isDashed?: boolean, isDotted?: boolean
}) => {
  const content = theoryKey ? THEORY_CONTENT[theoryKey] : null;
  return (
    <div className="flex items-center gap-1.5 group relative">
      <div 
        className={`w-2 h-0.5 ${isDashed ? 'border-t border-dashed' : isDotted ? 'border-t border-dotted' : ''}`} 
        style={isDashed || isDotted ? { borderColor: color, backgroundColor: 'transparent' } : { backgroundColor: color }} 
      />
      <span className={`text-[10px] font-bold text-zinc-400 uppercase ${content ? 'cursor-help' : ''}`}>
        {label} {value !== undefined && value !== null && <span className="text-zinc-300 ml-1">{value}</span>}
      </span>
      
      {content && (
        <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-[#0a0a0c] border border-white/10 p-4 z-[100] shadow-2xl pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
           <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-1.5 bg-white" />
               <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">{content.title}</h4>
             </div>
             <p className="text-[10px] text-zinc-400 leading-relaxed border-l border-white/10 pl-2 ml-1">{content.description}</p>
             <div className="bg-[#111] border border-white/5 p-2 font-mono ml-3">
               <span className="text-[9px] text-zinc-500 uppercase block mb-1">State Equation</span>
               <code className="text-[10px] text-matrix whitespace-pre-wrap">{content.formula}</code>
             </div>
             <div className="ml-1">
               <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block mb-2">Algorithmic Protocol</span>
               <ul className="space-y-1.5 pl-2 leading-relaxed">
                 {content.steps.map((step, i) => (
                   <li key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5">
                      <span className="text-matrix opacity-70 mt-0.5">►</span> 
                      <span className="flex-1">{step}</span>
                   </li>
                 ))}
               </ul>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
