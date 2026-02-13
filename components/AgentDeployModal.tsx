import React, { useState } from 'react';

interface AgentDeployModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeploy: (productUrl: string, videoUrl: string) => void;
}

const AgentDeployModal: React.FC<AgentDeployModalProps> = ({ isOpen, onClose, onDeploy }) => {
    const [productUrl, setProductUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productUrl || !videoUrl) {
            alert("Please provide both URLs to begin the mission.");
            return;
        }
        onDeploy(productUrl, videoUrl);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-indigo-500/10 blur-[100px] pointer-events-none" />

                <div className="relative space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                            Deploy <span className="text-indigo-400">Agent Team</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Initializing Researcher, Strategist, and Director...
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-400 transition-colors">
                                    Product Source URL
                                </label>
                                <input
                                    autoFocus
                                    type="url"
                                    placeholder="https://amazon.com/product/..."
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-400 transition-colors">
                                    Creative Reference URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://tiktok.com/@creator/video/..."
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-8 py-5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-xs transition-all tracking-widest"
                            >
                                Abort
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] tracking-widest"
                            >
                                Launch Mission
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgentDeployModal;
