import React from 'react';

export function DataSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
