import React, { useState } from 'react';
import { CountdownSlot, Platform, AppView } from '../types';
import { GeminiService } from '../services/geminiService';

interface AssetLibraryProps {
    library: { slots: CountdownSlot[] };
    onUpdateLibrary: (newLibrary: { slots: CountdownSlot[] }) => void;
    onImport: (slot: CountdownSlot) => void;
    onSetView: (view: AppView) => void;
    projectSettings: any;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ library, onUpdateLibrary, onImport, onSetView, projectSettings }) => {
    const [filter, setFilter] = useState('');
    const [ingestMode, setIngestMode] = useState(false);

    // Ingestion State
    const [sourceVideoUrl, setSourceVideoUrl] = useState('');
    const [productName, setProductName] = useState('');
    const [targetAudience, setTargetAudience] = useState('General');
    const [ingestStatus, setIngestStatus] = useState('');

    const handleDirectorIngest = async () => {
        if (!sourceVideoUrl || !productName) {
            alert("Please provide video URL and product name.");
            return;
        }

        setIngestStatus(`Director Mode: Watching ${sourceVideoUrl}...`);
        try {
            // 1. Analyze Video
            const clips = await GeminiService.analyzeVideoContent(sourceVideoUrl, targetAudience, productName);

            // 2. Create Library Assets (Slots)
            const newSlots: CountdownSlot[] = clips.map(clip => ({
                id: Math.random().toString(36).substr(2, 9),
                rank: 0, // Not ranked yet, just in library
                productName: productName,
                description: clip.description,
                targetAudience: targetAudience,
                customScript: clip.script,
                sourceVideoUrl: sourceVideoUrl,
                productUrl: sourceVideoUrl, // Fallback link
                media: { images: [], clips: [] }, // No media yet, just the concept
                generated: {
                    status: 'idle',
                    videoPrompt: clip.visualBrief // The "Visual Brief" is the prompt for generation
                },
                category: `Director's Cut: ${clip.audience_alignment}`,
                clipType: clip.clip_type,
                excludeFromMaster: false
            }));

            // 3. Add to Library
            onUpdateLibrary({
                slots: [...newSlots, ...library.slots]
            });

            setIngestStatus(`Success! Added ${clips.length} new Scene Concepts to the Vault.`);
            setIngestMode(false);
            setSourceVideoUrl('');
            setProductName('');

        } catch (err: any) {
            console.error(err);
            setIngestStatus(`Director Error: ${err.message}`);
        }
    };

    const filteredSlots = library.slots.filter(s =>
        (s.productName?.toLowerCase().includes(filter.toLowerCase()) || '') ||
        (s.description?.toLowerCase().includes(filter.toLowerCase()) || '')
    );

    return (
        <div className="max-w-[1600px] mx-auto pb-20 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div className="space-y-2">
                    <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic">
                        The <span className="text-indigo-500">Vault</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                        Asset Library & Director's Cut Ingestion
                    </p>
                </div>
                <div className="flex gap-4">
                    {!ingestMode && (
                        <button
                            onClick={() => setIngestMode(true)}
                            className="px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-xl flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            New Director's Cut
                        </button>
                    )}
                    <button
                        onClick={() => onSetView(AppView.GENERATOR)}
                        className="px-8 py-4 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 rounded-2xl font-black uppercase text-xs transition-all"
                    >
                        Back to Studio
                    </button>
                </div>
            </div>

            {/* Ingestion Panel */}
            {ingestMode && (
                <div className="mb-12 glass-panel p-10 rounded-[3rem] border border-fuchsia-500/30 bg-fuchsia-500/5 animate-in slide-in-from-top-4">
                    <div className="flex items-start justify-between mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Director's Cut Ingestion</h2>
                        <button onClick={() => setIngestMode(false)} className="text-slate-500 hover:text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest px-2">Source Video URL</label>
                            <input
                                value={sourceVideoUrl}
                                onChange={(e) => setSourceVideoUrl(e.target.value)}
                                type="text"
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-fuchsia-500 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest px-2">Product Name</label>
                            <input
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                type="text"
                                placeholder="e.g. Sony XM5"
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-fuchsia-500 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest px-2">Target Audience</label>
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-fuchsia-500 transition-all outline-none appearance-none"
                            >
                                <option value="General">General Audience</option>
                                <option value="Gen Z">Gen Z (Fast-Paced)</option>
                                <option value="Tech">Tech Enthusiasts (Detailed)</option>
                                <option value="Luxury">Luxury (Cinematic)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-6">
                        <button
                            onClick={handleDirectorIngest}
                            className="px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all"
                        >
                            Start Director Analysis
                        </button>
                        {ingestStatus && <p className="text-xs font-bold text-fuchsia-300 animate-pulse">{ingestStatus}</p>}
                    </div>
                </div>
            )}

            {/* Library Grid */}
            <div className="space-y-6">
                <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search Vault..."
                    className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-xs font-bold text-slate-300 focus:border-indigo-500 transition-all outline-none"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSlots.map(slot => (
                        <div key={slot.id} className="group relative bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-[2rem] transition-all hover:shadow-2xl">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{slot.productName}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{slot.targetAudience || 'General'} Cut</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${slot.generated.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {slot.generated.status === 'done' ? 'Ready' : 'Concept'}
                                    </span>
                                    {slot.clipType && (
                                        <span className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                                            {slot.clipType}
                                        </span>
                                    )}
                                </div>
                            </div>


                            <p className="text-slate-400 text-xs mb-6 line-clamp-3">{slot.description}</p>

                            <div className="flex items-center justify-between mt-auto">
                                <p className="text-[9px] text-fuchsia-400 italic font-bold">Director's Extraction</p>
                                <button
                                    onClick={() => onImport(slot)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg"
                                >
                                    Import to Studio
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredSlots.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-600 font-bold italic">
                            No assets found in the Vault.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetLibrary;
