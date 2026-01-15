
import React from 'react';
import { CalendarEntry } from '../types';

interface LaunchCalendarProps {
  entries: CalendarEntry[];
}

const LaunchCalendar: React.FC<LaunchCalendarProps> = ({ entries }) => {
  return (
    <div className="glass-panel rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl">
      <div className="bg-slate-900/80 p-4 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Affiliate War Room: Launch Calendar
        </h3>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-black uppercase tracking-widest">
          Research-Backed Timing
        </span>
      </div>
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Day</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Platform</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Variation</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategic Goal</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Optimal Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-900 transition-colors">
                <td className="py-4 px-4">
                  <span className="text-xs font-bold text-white whitespace-nowrap">{entry.day}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 whitespace-nowrap">{entry.platform}</span>
                </td>
                <td className="py-4 px-4">
                  <p className="text-xs font-medium text-slate-300">{entry.contentLabel}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black mt-0.5">{entry.hookType}</p>
                </td>
                <td className="py-4 px-4">
                  <p className="text-xs text-slate-400 leading-tight italic truncate max-w-xs">"{entry.strategicGoal}"</p>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 whitespace-nowrap">
                    {entry.optimalTime}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LaunchCalendar;
