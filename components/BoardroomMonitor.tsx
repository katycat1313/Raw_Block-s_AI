import React, { useEffect, useRef } from 'react';
import { DialogueEvent } from '../types';

interface BoardroomMonitorProps {
    isOpen: boolean;
    logs: DialogueEvent[];
    onClose: () => void;
    onApprove: () => void;
    status: string;
}

const BoardroomMonitor: React.FC<BoardroomMonitorProps> = ({ isOpen, logs, onClose, onApprove, status }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'prompt': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'debate': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'finding': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-800/50 text-slate-400 border-slate-700';
        }
    };

    const getAgentEmoji = (agent: string) => {
        if (agent.includes('Researcher')) return '🕵️';
        if (agent.includes('Strategist')) return '🧠';
        if (agent.includes('Director')) return '🎬';
        if (agent.includes('Assistant')) return '📋';
        if (agent.includes('Graphics')) return '🎨';
        return '🤖';
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500" />

            <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                            </span>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                                Creative <span className="text-indigo-400">Boardroom</span>
                            </h2>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            Live Intelligence Exchange / Session #432
                        </p>
                    </div>
                </div>

                {/* Dialogue Feed */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth"
                >
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                            <div className="w-12 h-12 border-2 border-dashed border-slate-500 rounded-full animate-spin" />
                            <p className="font-black uppercase text-xs tracking-[0.2em]">Synchronizing Agents...</p>
                        </div>
                    )}

                    {logs.map((log, i) => (
                        <div key={i} className="animate-in slide-in-from-left-4 fade-in duration-500">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shrink-0 shadow-lg">
                                    {getAgentEmoji(log.agent)}
                                </div>
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{log.agent}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">/</span >
                                        <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">{log.role}</span>
                                    </div>
                                    <div className={`p-5 rounded-3xl border text-sm font-medium leading-relaxed group relative transition-all ${getTypeStyles(log.type)}`}>
                                        {log.message}

                                        {log.type === 'prompt' && (
                                            <div className="mt-4 pt-4 border-t border-indigo-500/10 opacity-60 text-[10px] font-mono whitespace-pre-wrap overflow-hidden max-h-40 hover:max-h-full transition-all cursor-help">
                                                <div className="font-black uppercase tracking-tighter mb-1 text-indigo-400">Technical Data Stream:</div>
                                                {log.message.includes('Scene') ? 'Prompt analytics locked.' : log.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Approval Footer */}
                <div className="p-8 bg-slate-950/50 border-t border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/20">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter italic">Status</span>
                            </div>
                            <span className="text-sm font-bold text-slate-300 italic">{status}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase text-xs transition-all tracking-widest"
                        >
                            Abort Mission
                        </button>
                        <button
                            disabled={logs.length < 5}
                            onClick={onApprove}
                            className={`flex-1 px-8 py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl tracking-widest flex items-center justify-center gap-3 ${logs.length < 5
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:scale-[1.02]'
                                }`}
                        >
                            {logs.length < 5 ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                                    Awaiting Decision...
                                </>
                            ) : (
                                <>
                                    Approve & Start Production
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardroomMonitor;
