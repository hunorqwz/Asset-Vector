import React from 'react';
import { NewsArticle } from '@/lib/stock-details';

interface NewsFeedProps {
  articles: NewsArticle[];
}

export function NewsFeed({ articles }: NewsFeedProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-white/5 rounded-xl">
        <span className="text-xs text-zinc-600">No recent market narrative found.</span>
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
          rel="noopener noreferrer"
          className="glass-panel p-4 group hover:border-matrix/30 transition-all block relative overflow-hidden"
        >
          {/* Subtle accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-matrix/50 transition-colors" />
          
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] text-matrix font-bold uppercase tracking-widest">{article.publisher}</span>
              <span className="text-[10px] text-zinc-600 font-mono">
                {new Date(article.providerPublishTime * 1000).toLocaleDateString()}
              </span>
            </div>
            
            <h4 className="text-[13px] font-semibold text-white group-hover:text-matrix transition-colors leading-snug mb-3">
              {article.title}
            </h4>
            
            <div className="mt-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] text-zinc-400 font-medium">Read Analysis</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-matrix">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
