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

    // Generation Setup State
    const [generationSetupId, setGenerationSetupId] = useState<string | null>(null);
    const [generationPrompt, setGenerationPrompt] = useState('');
    const [generationImage, setGenerationImage] = useState<string | null>(null); // Base64

    // Ingestion State
    const [sourceVideoUrl, setSourceVideoUrl] = useState('');
    const [productName, setProductName] = useState('');

    const [ingestStatus, setIngestStatus] = useState('');

    const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
    const [ingestCandidates, setIngestCandidates] = useState<CountdownSlot[]>([]);

    // Helper to parse "MM:SS" or string seconds to numeric seconds
    const parseTime = (timeStr?: string) => {
        if (!timeStr) return 0;
        // Clean string
        const clean = timeStr.trim();
        if (!clean.includes(':')) {
            const seconds = Number(clean);
            return isNaN(seconds) ? 0 : seconds;
        }

        const parts = clean.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    };

    // Helper to extract YouTube ID from various URL formats
    const extractYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleDirectorIngest = async () => {
        if (!sourceVideoUrl || !productName) {
            alert("Please provide video URL and product name.");
            return;
        }

        const videoId = extractYouTubeId(sourceVideoUrl);
        if (!videoId) {
            alert("Invalid YouTube URL. Please use a standard YouTube link.");
            return;
        }

        setIngestStatus(`Director Mode: Watching ${sourceVideoUrl}...`);
        try {
            // 1. Analyze Video - Use "General" or neutral focus for raw clip extraction
            const clipAudience = "General Product Focus";
            const clips = await GeminiService.analyzeVideoContent(sourceVideoUrl, clipAudience, productName);

            // 2. Create Library Assets (Slots)
            const newSlots: CountdownSlot[] = clips.map(clip => {
                const startTime = (clip as any).start_timestamp?.trim() || "";
                const endTime = (clip as any).end_timestamp?.trim() || "";

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    rank: 0, // Not ranked yet, just in library
                    productName: productName,
                    description: clip.description,
                    targetAudience: clipAudience,
                    originalContext: (clip as any).context_caption,
                    customScript: clip.script,
                    sourceVideoUrl: sourceVideoUrl,
                    productUrl: sourceVideoUrl, // Fallback link
                    media: { images: [], clips: [] }, // No media yet, just the concept
                    segment: startTime ? {
                        startTime: startTime,
                        endTime: endTime,
                        duration: parseTime(endTime) - parseTime(startTime)
                    } : undefined,
                    generated: {
                        status: 'idle',
                        videoPrompt: clip.visualBrief // The "Visual Brief" is the prompt for generation
                    },
                    category: `Director's Cut: ${clip.audience_alignment}`,
                    clipType: clip.clip_type,
                    excludeFromMaster: false
                };
            });

            // 3. Sort by Chronological Order
            newSlots.sort((a, b) => {
                const startA = parseTime(a.segment?.startTime);
                const startB = parseTime(b.segment?.startTime);
                return startA - startB;
            });

            // 4. Move to Staging Area
            setIngestCandidates(newSlots);
            setIngestStatus(`Review required for ${clips.length} proposed clips.`);
            // Don't close ingest mode yet, switch to review view

        } catch (err: any) {
            console.error(err);
            setIngestStatus(`Director Error: ${err.message}`);
        }
    };

    const handleKeepCandidate = (slot: CountdownSlot) => {
        onUpdateLibrary({ slots: [slot, ...library.slots] });
        setIngestCandidates(prev => prev.filter(c => c.id !== slot.id));
    };

    const handleDiscardCandidate = (slotId: string) => {
        setIngestCandidates(prev => prev.filter(c => c.id !== slotId));
    };

    const handleGeneratePreview = async (slotId: string, prompt: string, referenceImage?: string | null) => {
        if (!prompt) return;

        setActivePreviewId(slotId);

        // Update local state to show loading immediately
        const updateSlotStatus = (status: 'idle' | 'generating' | 'done' | 'error', url?: string) => {
            onUpdateLibrary({
                slots: library.slots.map(s => s.id === slotId ? {
                    ...s,
                    generated: { ...s.generated, status, videoUrl: url }
                } : s)
            });
        };

        updateSlotStatus('generating');

        try {
            let finalPrompt = prompt;

            // Visual Fidelity Strategy
            if (referenceImage) {
                // Remove prefix if present 
                const base64Data = referenceImage.split(',')[1] || referenceImage;
                try {
                    const visualDescription = await GeminiService.describeImage(base64Data);
                    finalPrompt += `\n\nVISUAL REFERENCE DETAILS (This describes the EXACT product appearance to use):\n${visualDescription}`;
                } catch (imgErr) {
                    console.warn("Failed to process visual reference, falling back to prompt only:", imgErr);
                }
            }

            const videoUrl = await GeminiService.generateVideoFromPrompt(finalPrompt, (status) => {
                // Optional: You could update a detailed status here if UI supported it
                console.log(`[${slotId}] Preview Status: ${status}`);
            }, referenceImage);
            updateSlotStatus('done', videoUrl);
        } catch (err: any) {
            console.error(err);
            updateSlotStatus('error');
            alert(`Preview Generation Failed: ${err.message}`);
        } finally {
            setActivePreviewId(null);
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

            {/* Ingestion Panel & Review Deck */}
            {ingestMode && (
                <div className="mb-12 glass-panel p-10 rounded-[3rem] border border-fuchsia-500/30 bg-fuchsia-500/5 animate-in slide-in-from-top-4">
                    <div className="flex items-start justify-between mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Director's Cut Ingestion</h2>
                        <button onClick={() => { setIngestMode(false); setIngestCandidates([]); }} className="text-slate-500 hover:text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {ingestCandidates.length > 0 ? (
                        /* REVIEW DECK */
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold text-lg">Review Proposed Clips ({ingestCandidates.length})</h3>
                                <p className="text-xs text-slate-400">Click a clip to preview the segment. Keep or Discard.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ingestCandidates.map(candidate => (
                                    <div key={candidate.id} className="bg-slate-900 border border-fuchsia-500/30 p-6 rounded-[2rem] relative group">
                                        {/* Virtual Player Preview */}
                                        <div className="aspect-[16/9] w-full bg-black rounded-xl overflow-hidden mb-4 relative">
                                            {activePreviewId === candidate.id ? (
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    src={`https://www.youtube.com/embed/${extractYouTubeId(candidate.sourceVideoUrl || '')}?start=${parseTime(candidate.segment?.startTime)}&end=${parseTime(candidate.segment?.endTime)}&autoplay=1&controls=0&modestbranding=1&rel=0`}
                                                    title="Clip Preview"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            ) : (
                                                <div
                                                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                                                    onClick={() => setActivePreviewId(candidate.id)}
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-fuchsia-600 flex items-center justify-center text-white shadow-lg mb-2">
                                                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {candidate.segment?.startTime} - {candidate.segment?.endTime}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="font-bold text-white mb-2">{candidate.clipType}</h4>
                                        <p className="text-xs text-slate-400 mb-2">{candidate.description}</p>

                                        {candidate.originalContext && (
                                            <div className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                                <p className="text-[9px] text-fuchsia-400 font-bold uppercase mb-1">Original Context</p>
                                                <p className="text-[10px] text-slate-300 italic">"{candidate.originalContext}"</p>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleKeepCandidate(candidate)}
                                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg transition-colors"
                                            >
                                                Keep
                                            </button>
                                            <button
                                                onClick={() => handleDiscardCandidate(candidate.id)}
                                                className="flex-1 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-[10px] font-black uppercase rounded-lg transition-colors"
                                            >
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* INGEST FORM */
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        </>
                    )}
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
                        <div
                            key={slot.id}
                            className="group relative bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-[2rem] transition-all hover:shadow-2xl overflow-hidden"
                            onClick={() => {
                                if (slot.generated.status === 'idle' && slot.generated.videoPrompt) {
                                    // Start Setup instead of immediate generation
                                    setGenerationSetupId(slot.id);
                                    setGenerationPrompt(slot.generated.videoPrompt);
                                    setGenerationImage(null);
                                }
                            }}
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{slot.productName}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{slot.targetAudience || 'General'} Cut</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${slot.generated.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {slot.generated.status === 'done' ? 'Ready' : slot.generated.status === 'generating' ? 'Generating...' : 'Concept'}
                                    </span>
                                    {slot.clipType && (
                                        <span className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                                            {slot.clipType}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* GENERATION SETUP MODAL */}
                            {generationSetupId === slot.id && slot.generated.status === 'idle' && (
                                <div
                                    className="absolute inset-0 bg-slate-950/95 z-50 p-6 flex flex-col animate-in fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h4 className="text-white font-black uppercase italic text-lg mb-4">Prepare Shot</h4>

                                    <div className="space-y-4 flex-1 overflow-y-auto">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-indigo-400 font-bold uppercase">Visual Brief (Prompt)</label>
                                            <textarea
                                                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 focus:border-indigo-500 outline-none resize-none"
                                                value={generationPrompt}
                                                onChange={(e) => setGenerationPrompt(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] text-fuchsia-400 font-bold uppercase">Product Reference (Optional)</label>
                                            <div className="w-full h-24 border-2 border-dashed border-slate-700 hover:border-fuchsia-500/50 rounded-xl flex items-center justify-center relative overflow-hidden transition-colors group/upload">
                                                {generationImage ? (
                                                    <img src={generationImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                                ) : (
                                                    <div className="text-center">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase group-hover/upload:text-fuchsia-400">Upload Product Photo</p>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setGenerationImage(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-600 leading-tight">
                                                Uploading a photo ensures the AI knows exactly what your product looks like.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                                        <button
                                            onClick={() => setGenerationSetupId(null)}
                                            className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white uppercase"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setGenerationSetupId(null);
                                                let finalPrompt = generationPrompt;

                                                if (generationImage) {
                                                    try {
                                                        // 1. Get Visual Description
                                                        // We'll calculate this inside handleGeneratePreview or a new wrapper
                                                        // For now, let's pass it cleanly.
                                                        // Actually, handleGeneratePreview accepts prompt. 
                                                        // We need to inject the image description logic HERE or inside handleGeneratePreview.
                                                        // Let's modify handleGeneratePreview to accept optional image!
                                                    } catch (e) {
                                                        console.error(e);
                                                    }
                                                }
                                                // Trigger Generation
                                                // We need to pass the image to handleGeneratePreview if we want the service to handle it.
                                                handleGeneratePreview(slot.id, generationPrompt, generationImage);
                                            }}
                                            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-500/20"
                                        >
                                            Action!
                                        </button>
                                    </div>
                                </div>
                            )}


                            {/* Video Player or Description */}
                            {slot.generated.status === 'done' && slot.generated.videoUrl ? (
                                <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black mb-4 relative z-20">
                                    <video
                                        src={slot.generated.videoUrl}
                                        controls
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <p className="text-slate-400 text-xs mb-6 line-clamp-3">{slot.description}</p>

                                    {/* Hover Overlay for Generation */}
                                    {slot.generated.status === 'idle' && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur-sm rounded-xl cursor-pointer">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Click to Generate</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Loading State */}
                                    {slot.generated.status === 'generating' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl z-20">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Rendering...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-auto relative z-10">
                                <p className="text-[9px] text-fuchsia-400 italic font-bold">Director's Extraction</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImport(slot);
                                    }}
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
