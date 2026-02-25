import React from 'react';
import { NewsArticle } from '@/lib/stock-details';

interface NewsFeedProps {
  articles: NewsArticle[];
}

export function NewsFeed({ articles }: NewsFeedProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-white/20 bg-[#0a0a0a]">
        <span className="text-[14px] font-bold text-zinc-500 tracking-widest uppercase">No verified market narrative found in current vector.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {articles.map((article, idx) => (
        <a 
          key={idx} 
          href={article.link} 
          target="_blank" 
          className="bg-[#0a0a0a] border border-white/10 p-4 group hover:border-white/30 transition-all block relative overflow-hidden"
        >
          {/* Subtle accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-white/50 transition-colors" />
          
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] text-zinc-300 font-bold uppercase tracking-[0.15em]">{article.publisher}</span>
              <span className="text-zinc-500 bg-white/5 px-2 py-0.5 rounded font-mono border border-white/5">
                {new Date(article.providerPublishTime * 1000).toLocaleDateString('en-US', { timeZone: 'UTC' })}
              </span>
            </div>
            
            <h4 className="text-[13px] font-semibold text-white group-hover:text-zinc-300 transition-colors leading-snug mb-3">
              {article.title}
            </h4>
            
            <div className="mt-6 flex items-center gap-2 text-white/50 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0">
              <span className="text-[11px] font-bold uppercase tracking-widest">Read Full Analysis</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
