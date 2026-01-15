
import React, { useState } from 'react';
import { SocialStrategy, Platform } from '../types';

interface ViralPublisherProps {
  strategies: Record<Platform, SocialStrategy>;
}

const ViralPublisher: React.FC<ViralPublisherProps> = ({ strategies }) => {
  const [activeTab, setActiveTab] = useState<Platform>(Platform.TIKTOK);
  const [copied, setCopied] = useState<string | null>(null);

  const strategy = strategies[activeTab];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl border border-indigo-500/30 overflow-hidden shadow-2xl shadow-indigo-500/10">
      <div className="bg-slate-900/80 p-4 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Viral Publisher Hub</h3>
        <div className="flex gap-2">
          {Object.values(Platform).map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${activeTab === p ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'
                }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Direct Response Caption</label>
            <button
              onClick={() => copyToClipboard(strategy.caption, 'caption')}
              className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase"
            >
              {copied === 'caption' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-300">
            {strategy.caption}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hashtag Cluster</label>
              <button
                onClick={() => copyToClipboard(strategy.hashtags.join(' '), 'tags')}
                className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase"
              >
                {copied === 'tags' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-indigo-400 font-mono">
              {strategy.hashtags.join(' ')}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Peak Performance Time</label>
            <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs text-center font-bold text-white">
              {strategy.bestTime}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Algorithm Trigger (First Comment)</p>
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 italic">"{strategy.firstComment}"</p>
            <button
              onClick={() => copyToClipboard(strategy.firstComment, 'comment')}
              className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViralPublisher;
