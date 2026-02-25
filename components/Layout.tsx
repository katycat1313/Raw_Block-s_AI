
import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onResetKey?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onResetKey }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange(AppView.GENERATOR)}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Countdown <span className="text-indigo-500">Studio</span>
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <button
            onClick={() => onViewChange(AppView.GENERATOR)}
            className={`transition-colors ${currentView === AppView.GENERATOR ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-slate-400 hover:text-white'}`}
          >
            Studio
          </button>
          <button
            onClick={() => onViewChange(AppView.HISTORY)}
            className={`transition-colors ${currentView === AppView.HISTORY ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-slate-400 hover:text-white'}`}
          >
            Project History
          </button>
          {onResetKey && (
            <button
              onClick={onResetKey}
              className="ml-4 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl"
            >
              Reset Environment
            </button>
          )}
        </nav>
      </header>
      <main className="w-full max-w-6xl">
        {children}
      </main>
      <footer className="w-full max-w-6xl mt-20 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>&copy; 2026 Countdown Studio. Powered by Gemini 2.5 Flash & Veo 3.1</p>
      </footer>
    </div>
  );
};

export default Layout;
