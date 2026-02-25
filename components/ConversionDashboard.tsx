
import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { OptimizedPrompt } from '../types';

interface ConversionDashboardProps {
  optimized: OptimizedPrompt;
}

const ConversionDashboard: React.FC<ConversionDashboardProps> = ({ optimized }) => {
  const data = [{ name: 'Conversion Score', value: optimized.conversionScore, fill: '#6366f1' }];

  return (
    <div className="space-y-6 mb-8">
      {/* Primary Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center border border-indigo-500/20 shadow-xl shadow-indigo-500/5 min-h-[320px]">
          <div className="w-full h-48 relative flex items-center justify-center">
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={data} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={5} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-white tracking-tighter italic">{optimized.conversionScore}%</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Score</p>
            </div>
          </div>
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-4 italic">Purchase Probability</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl col-span-2 border border-slate-800 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-indigo-400 font-bold uppercase text-xs flex items-center gap-2 tracking-tighter italic">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707z" /></svg>
                  Neural Sales Strategy
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {optimized.triggers?.map((t, i) => (
                    <span key={i} className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-black tracking-widest">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-widest">Psychological Angle</p>
                <p className="text-xs text-slate-300 leading-tight italic font-medium line-clamp-2">{optimized.psychologicalAngle}</p>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-widest">Visual Direction</p>
                <p className="text-xs text-slate-300 leading-tight italic font-medium line-clamp-2">{optimized.visualBrief}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-indigo-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors pointer-events-none"></div>
            <p className="text-[10px] text-indigo-500 font-black uppercase mb-1 tracking-widest">Winning Viral Hook</p>
            <p className="text-base font-bold text-white relative z-10 leading-snug italic line-clamp-2">"{optimized.hook}"</p>
          </div>
        </div>
      </div>

      {/* Market Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/20 shadow-xl">
          <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Live Consumer Pain Points
          </h3>
          <ul className="space-y-3 font-medium">
            {optimized.researchData?.painPoints.map((p, i) => (
              <li key={i} className="text-[11px] text-slate-400 leading-tight italic border-l-2 border-rose-500/30 pl-3 py-1 bg-rose-500/5 rounded-r-lg">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-morphism p-6 rounded-3xl border border-slate-800 bg-slate-900/20 shadow-xl">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Competitor Vulnerabilities
          </h3>
          <ul className="space-y-3 font-medium">
            {optimized.researchData?.competitorWeakness.map((w, i) => (
              <li key={i} className="text-[11px] text-slate-400 leading-tight border-l-2 border-emerald-500/30 pl-3 py-1 bg-emerald-500/5 rounded-r-lg">
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-morphism p-6 rounded-3xl border border-slate-800 bg-slate-900/20 shadow-xl">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            High-Intent Signals
          </h3>
          <div className="space-y-3">
            {optimized.researchData?.buyerIntentSignals.map((s, i) => (
              <div key={i} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionDashboard;
