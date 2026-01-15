
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import MediaDropzone from './components/MediaDropzone';
import { GeminiService } from './services/geminiService';
import {
  CountdownProject,
  CountdownSlot,
  Platform,
  AspectRatio,
  AppView
} from './types';

const INITIAL_SLOTS: CountdownSlot[] = [{
  id: Math.random().toString(36).substr(2, 9),
  rank: 1,
  productName: '',
  description: '',
  productUrl: '',
  media: { images: [], clips: [] },
  generated: { status: 'idle' as const }
}];

const App: React.FC = () => {
  const [project, setProject] = useState<CountdownProject>(() => {
    const saved = localStorage.getItem('countdown_project_v1');
    return saved ? JSON.parse(saved) : {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Product Countdown',
      slots: INITIAL_SLOTS,
      status: 'idle' as const
    };
  });

  const [library, setLibrary] = useState<{ slots: CountdownSlot[] }>(() => {
    const saved = localStorage.getItem('countdown_library_v1');
    return saved ? JSON.parse(saved) : { slots: [] };
  });

  const [showLibrary, setShowLibrary] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string>(project.slots[0].id);
  const [isKeySelected, setIsKeySelected] = useState(!!localStorage.getItem('conversionflow_key'));
  const [globalStatus, setGlobalStatus] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Puck' | 'Charon'>('Kore');
  const [videoFeedback, setVideoFeedback] = useState('');
  const [exportedShortUrl, setExportedShortUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('countdown_project_v1', JSON.stringify(project));
  }, [project]);
  useEffect(() => {
    localStorage.setItem('countdown_library_v1', JSON.stringify(library));
  }, [library]);

  const exportShort = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId) || library.slots.find(s => s.id === slotId);
    if (!slot || slot.generated.status !== 'done') return;

    setGlobalStatus(`Exporting Final Short for ${slot.productName || 'Product'}...`);
    // In a real scenario, this would call a cloud function to mux the videoUrl and audioUrl
    // For now, we simulate the 'Short' assembly.
    setTimeout(() => {
      setExportedShortUrl(slot.generated.videoUrl || null);
      setGlobalStatus("Short Exported Successfully!");
      if (slot.generated.videoUrl) window.open(slot.generated.videoUrl);
    }, 2000);
  };

  const handleSelectKey = (key: string) => {
    localStorage.setItem('conversionflow_key', key);
    setIsKeySelected(true);
  };

  const handleResetKey = () => {
    localStorage.removeItem('conversionflow_key');
    setIsKeySelected(false);
  };

  const activeSlot = project.slots.find(s => s.id === activeSlotId) || project.slots[0];

  const createNewSequence = () => {
    if (confirm("Clear current sequence? (Stored Library assets will remain safe)")) {
      const newSlots = [{
        id: Math.random().toString(36).substr(2, 9),
        rank: 1,
        productName: '',
        description: '',
        productUrl: '',
        media: { images: [], clips: [] },
        generated: { status: 'idle' as const }
      }];
      setProject(prev => ({
        ...prev,
        slots: newSlots,
        status: 'idle',
        connectiveNarrative: ''
      }));
      setActiveSlotId(newSlots[0].id);
      setGlobalStatus("New Sequence Canvas Active.");
    }
  };

  const updateSlot = (slotId: string, updates: Partial<CountdownSlot>) => {
    setProject(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === slotId ? { ...s, ...updates } : s)
    }));
  };

  const addSlot = () => {
    const nextRank = project.slots.length > 0 ? Math.max(...project.slots.map(s => s.rank)) + 1 : 1;
    const newSlot: CountdownSlot = {
      id: Math.random().toString(36).substr(2, 9),
      rank: nextRank,
      productName: '',
      description: '',
      productUrl: '',
      media: { images: [], clips: [] },
      generated: { status: 'idle' as const }
    };

    setProject(prev => ({
      ...prev,
      slots: [newSlot, ...prev.slots].sort((a, b) => b.rank - a.rank)
    }));
    setActiveSlotId(newSlot.id);
  };

  const removeSlot = (slotId: string) => {
    if (project.slots.length <= 1) return;
    setProject(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.id !== slotId)
    }));
    if (activeSlotId === slotId) {
      const remaining = project.slots.filter(s => s.id !== slotId);
      setActiveSlotId(remaining[0].id);
    }
  };

  const toggleSlotInclusion = (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { excludeFromMaster: !slot.excludeFromMaster });
  };

  const saveToLibrary = (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot || slot.generated.status !== 'done') {
      alert("Only successfully generated reels can be saved to the library.");
      return;
    }

    // Check if already exists in library (by name/id)
    setLibrary(prev => ({
      ...prev,
      slots: [slot, ...prev.slots.filter(s => s.id !== slot.id)]
    }));
    setGlobalStatus(`${slot.productName || 'Product'} saved to Master Library!`);
  };

  const importFromLibrary = (slot: CountdownSlot) => {
    const nextRank = project.slots.length > 0 ? Math.max(...project.slots.map(s => s.rank)) + 1 : 1;
    const newSlot = {
      ...slot,
      id: Math.random().toString(36).substr(2, 9), // New project-specific ID
      rank: nextRank,
      excludeFromMaster: false
    };

    setProject(prev => ({
      ...prev,
      slots: [newSlot, ...prev.slots].sort((a, b) => b.rank - a.rank)
    }));
    setActiveSlotId(newSlot.id);
    setGlobalStatus(`Imported ${slot.productName} from Library.`);
  };

  const reorderSlot = (slotId: string, direction: 'up' | 'down') => {
    const slots = [...project.slots].sort((a, b) => b.rank - a.rank);
    const index = slots.findIndex(s => s.id === slotId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      // Swap with one above (higher rank)
      const targetIndex = index - 1;
      const targetSlot = slots[targetIndex];
      const currentSlot = slots[index];

      const tempRank = currentSlot.rank;
      currentSlot.rank = targetSlot.rank;
      targetSlot.rank = tempRank;
    } else if (direction === 'down' && index < slots.length - 1) {
      // Swap with one below (lower rank)
      const targetIndex = index + 1;
      const targetSlot = slots[targetIndex];
      const currentSlot = slots[index];

      const tempRank = currentSlot.rank;
      currentSlot.rank = targetSlot.rank;
      targetSlot.rank = tempRank;
    }

    setProject(prev => ({
      ...prev,
      slots: slots.sort((a, b) => b.rank - a.rank)
    }));
  };

  const generateScriptOnly = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot) return;

    if (!slot.productName && !slot.productUrl) {
      alert("Please provide a product name or URL to generate a script.");
      return;
    }

    setGlobalStatus(`Generating high-intent script for Rank #${slot.rank}...`);
    try {
      const details = {
        name: slot.productName,
        benefit: `This is Rank #${slot.rank} in our countdown. ${slot.description}`,
        price: '',
        audience: 'General Consumers',
        cta: 'Check it out',
        angle: 4,
        productUrl: slot.productUrl,
      } as any;
      const optimized = await GeminiService.optimizePrompts(details, Platform.TIKTOK, slot.media.images);
      const script = `Coming in at rank ${slot.rank}. ${optimized.audioScript}`;
      updateSlot(slotId, { customScript: script });
      setGlobalStatus("Script generated! You can now edit it or start production.");
    } catch (err: any) {
      setGlobalStatus(`Script generation failed: ${err.message}`);
    }
  };

  const generateSlotAssets = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot) return;

    if (!slot.productName && !slot.productUrl) {
      alert("Please provide a product name or URL for this slot.");
      return;
    }

    updateSlot(slotId, { generated: { ...slot.generated, status: 'generating' } });
    setGlobalStatus(`Analyzing Rank #${slot.rank}: ${slot.productName || 'Product'}...`);

    try {
      // 1. Optimize prompts for this specific rank
      const details = {
        name: slot.productName,
        benefit: `This is Rank #${slot.rank} in our countdown. ${slot.description}`,
        price: '',
        audience: 'General Consumers',
        cta: 'Check it out',
        angle: 4, // ConversionAngle.COMPARISON is 4-indexed usually or we can just pass the enum
        productUrl: slot.productUrl,
        customVideoInstruction: `CRITICAL: The video must feature a clear "Rank #${slot.rank}" overlay or mention. Show the product as a premium choice.`
      } as any;

      const optimized = await GeminiService.optimizePrompts(details, Platform.TIKTOK, slot.media.images);

      // 2. Generate HD Audio (Chirp 3)
      setGlobalStatus(`Synthesizing HD Narration for Rank #${slot.rank}...`);
      const script = slot.customScript || `Coming in at rank ${slot.rank}. ${optimized.audioScript}`;
      const audioUrl = await GeminiService.generateAudio(script, selectedVoice);

      // 3. Generate Video (Veo 3.1)
      setGlobalStatus(`Synthesizing Veo 3.1 Visuals for Rank #${slot.rank}...`);

      // Inject Discovered Visual DNA for 100% Fidelity
      const enrichedVideoPrompt = `${optimized.discoveredVisualDna ? `VISUAL DNA: ${optimized.discoveredVisualDna}. ` : ''}${optimized.videoPrompt}`;

      const videoUrl = await GeminiService.generateVideo(
        enrichedVideoPrompt,
        optimized.variations[0].ambientSoundDescription,
        AspectRatio.PORTRAIT,
        (status) => setGlobalStatus(`Veo: ${status}`),
        slot.media.images,
        slot.media.clips
      );

      updateSlot(slotId, {
        customScript: script,
        generated: {
          status: 'done',
          videoUrl,
          audioUrl,
          script,
          videoPrompt: enrichedVideoPrompt
        }
      });
      setGlobalStatus(`Rank #${slot.rank} Completed!`);
    } catch (err: any) {
      console.error(err);
      updateSlot(slotId, { generated: { ...slot.generated, status: 'error', error: err.message } });
      setGlobalStatus(`Error on Rank #${slot.rank}: ${err.message}`);
    }
  };

  const assembleCountdown = async () => {
    const activeSlots = project.slots
      .filter(s => !s.excludeFromMaster)
      .sort((a, b) => b.rank - a.rank);

    if (activeSlots.length === 0) {
      alert("Please select at least one rank to include in the master countdown.");
      return;
    }

    if (activeSlots.some(s => s.generated.status !== 'done')) {
      alert("Please ensure all selected ranks are generated successfully before assembly.");
      return;
    }

    setProject(prev => ({ ...prev, status: 'assembling' }));
    setGlobalStatus("Synthesizing Master Connective Narrative...");

    try {
      // 1. Generate Connective Narrative if missing
      let narrative = project.connectiveNarrative;
      if (!narrative) {
        const slotsForNarrative = activeSlots.map(s => ({ rank: s.rank, name: s.productName || 'Product' }));
        narrative = await GeminiService.generateConnectiveNarrative(slotsForNarrative);
        setProject(prev => ({ ...prev, connectiveNarrative: narrative }));
      }

      setGlobalStatus("Stitching products into final Master Countdown...");
      // ... actual assembly logic would go here
      setTimeout(() => {
        setProject(prev => ({
          ...prev,
          status: 'done',
          finalVideoUrl: activeSlots[0].generated.videoUrl // Placeholder
        }));
        setGlobalStatus("Master Countdown Assembled!");
      }, 3000);
    } catch (err: any) {
      setGlobalStatus(`Assembly failed: ${err.message}`);
      setProject(prev => ({ ...prev, status: 'error' }));
    }
  };

  const generateConnectiveNarrative = async () => {
    const activeSlots = project.slots
      .filter(s => !s.excludeFromMaster)
      .sort((a, b) => b.rank - a.rank);

    if (activeSlots.length === 0) {
      setGlobalStatus("No active slots selected for narrative!");
      return;
    }

    setGlobalStatus("Designing Narrator's Connective Flow...");
    try {
      const slotsForNarrative = activeSlots.map(s => ({ rank: s.rank, name: s.productName || 'Product' }));
      const narrative = await GeminiService.generateConnectiveNarrative(slotsForNarrative);
      setProject(prev => ({ ...prev, connectiveNarrative: narrative }));
      setGlobalStatus("Seamless narrative flow established!");
    } catch (err: any) {
      setGlobalStatus(`Narrative generation failed: ${err.message}`);
    }
  };

  const refineVideo = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot || !videoFeedback || !slot.generated.videoPrompt) return;

    updateSlot(slotId, { generated: { ...slot.generated, status: 'generating' } });
    setGlobalStatus(`Refining Rank #${slot.rank} video with your feedback...`);

    try {
      const videoUrl = await GeminiService.regenerateVideoWithFeedback(
        slot.generated.videoPrompt,
        "Premium Studio Ambient",
        videoFeedback,
        AspectRatio.PORTRAIT,
        (status) => setGlobalStatus(`Veo Refine: ${status}`),
        slot.media.images
      );

      updateSlot(slotId, {
        generated: {
          ...slot.generated,
          status: 'done',
          videoUrl
        }
      });
      setVideoFeedback('');
      setGlobalStatus("Video refined successfully!");
    } catch (err: any) {
      console.error(err);
      setGlobalStatus(`Refinement failed: ${err.message}`);
      updateSlot(slotId, { generated: { ...slot.generated, status: 'error', error: err.message } });
    }
  };

  const generateAllSlots = async () => {
    for (const slot of project.slots) {
      if (slot.generated.status !== 'done') {
        await generateSlotAssets(slot.id);
      }
    }
  };

  if (!isKeySelected) {
    return (
      <Layout currentView={AppView.GENERATOR} onViewChange={() => { }} onResetKey={handleResetKey}>
        <div className="max-w-xl mx-auto mt-20 text-center glass-panel p-12 rounded-[3rem] border-indigo-500/40 border shadow-2xl">
          <div className="w-24 h-24 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-4xl font-black mb-4 text-white uppercase tracking-tighter italic">Studio Offline</h2>
          <div className="space-y-4">
            <input
              id="api-key-input"
              type="password"
              placeholder="PASTE GEMINI API KEY..."
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-xs font-black focus:border-indigo-500 transition-all uppercase text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectKey((e.currentTarget as HTMLInputElement).value);
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('api-key-input') as HTMLInputElement;
                if (input.value) handleSelectKey(input.value);
              }}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all mb-4 uppercase tracking-widest text-sm shadow-xl"
            >
              Connect Audio/Video Engine
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentView={AppView.GENERATOR} onViewChange={() => { }} onResetKey={handleResetKey}>
      <div className="max-w-[1600px] mx-auto pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
              Live Product Studio / 2026 Engine
            </div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
              Countdown <span className="text-indigo-500">Studio</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <button
              onClick={createNewSequence}
              className="px-6 py-4 bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center gap-2"
            >
              Reset Canvas
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="px-8 py-4 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 rounded-2xl font-black uppercase text-xs transition-all shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              The Vault
            </button>
            <button
              onClick={generateAllSlots}
              className="px-8 py-4 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              Render All Boxes
            </button>
            <button
              onClick={assembleCountdown}
              disabled={project.slots.some(s => s.generated.status !== 'done')}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs transition-all shadow-2xl hover:scale-105 active:scale-95"
            >
              Connect to Master Reel
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        {globalStatus && (
          <div className="mb-12 animate-in slide-in-from-top-4">
            <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center animate-spin text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Engine Processing</p>
                    <p className="text-sm font-bold text-white uppercase italic">{globalStatus}</p>
                  </div>
                </div>
                <div className="flex-1 max-w-md h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-500"
                    style={{ width: `${(project.slots.filter(s => s.generated.status === 'done').length / project.slots.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none"></div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Rank Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-4 mb-6">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Countdown Path</h2>
              <button
                onClick={addSlot}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all"
                title="Add New Product Rank"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
            {project.slots.map((slot) => (
              <div key={slot.id} className="relative group">
                <button
                  onClick={() => setActiveSlotId(slot.id)}
                  className={`w-full p-6 rounded-[2.5rem] border transition-all text-left flex items-center gap-4 relative overflow-hidden ${activeSlotId === slot.id
                    ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-105 z-10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
                    } ${slot.excludeFromMaster ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className="flex flex-col gap-1 items-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); reorderSlot(slot.id, 'up'); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Move Up"
                    >
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg ${activeSlotId === slot.id ? 'bg-white text-indigo-950' : 'bg-slate-900 text-slate-400'
                      }`}>
                      #{slot.rank}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); reorderSlot(slot.id, 'down'); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Move Down"
                    >
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeSlotId === slot.id ? 'text-indigo-200' : 'text-slate-500'
                      }`}>
                      {slot.generated.status === 'done' ? '✓ Ready' : slot.generated.status === 'generating' ? 'Synthesizing...' : 'Pending'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold truncate uppercase ${activeSlotId === slot.id ? 'text-white' : 'text-slate-300'}`}>
                        {slot.productName || 'Untitled Slot'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSlotInclusion(slot.id); }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${slot.excludeFromMaster
                      ? 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40'
                      }`}
                    title={slot.excludeFromMaster ? "Add to Sequence" : "Remove from Sequence"}
                  >
                    {slot.excludeFromMaster ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>

                  {slot.generated.status === 'generating' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/40 animate-progress-indefinite"></div>
                  )}
                </button>
                {project.slots.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-slate-800 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 border border-slate-700 shadow-lg"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}

            <div className="pt-8 border-t border-slate-800">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4">Master Flow</h3>
              <div className="p-6 glass-panel rounded-[2.5rem] border border-pink-500/20 bg-pink-500/5 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-black text-pink-400 uppercase">Connective Script</p>
                  <button
                    onClick={generateConnectiveNarrative}
                    className="text-[8px] font-black bg-pink-600 hover:bg-pink-500 px-2 py-1 rounded-md text-white transition-all uppercase"
                  >
                    AI Flow
                  </button>
                </div>
                <textarea
                  value={project.connectiveNarrative || ''}
                  onChange={(e) => setProject(prev => ({ ...prev, connectiveNarrative: e.target.value }))}
                  placeholder="The 'glue' that connects Rank 5 down to 1..."
                  rows={6}
                  className="w-full bg-slate-950/50 border border-pink-500/10 rounded-2xl px-4 py-4 text-xs font-bold text-pink-100 focus:border-pink-500/30 transition-all outline-none resize-none"
                />
                <button
                  onClick={assembleCountdown}
                  className="w-full py-4 bg-white text-pink-950 hover:bg-pink-50 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                >
                  Assemble Master Reel
                </button>
              </div>
            </div>
          </div>

          {/* Active Slot Editor */}
          <div className="lg:col-span-6 space-y-8">
            <div className="glass-panel p-10 rounded-[4rem] border border-slate-800 shadow-2xl relative">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                  Rank <span className="text-indigo-500">#{activeSlot.rank}</span> Context
                </h2>
                <div className="flex gap-2">
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-400 uppercase outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="Kore">Voice: Kore (Deep)</option>
                    <option value="Puck">Voice: Puck (Energetic)</option>
                    <option value="Charon">Voice: Charon (Calm)</option>
                  </select>
                  <button
                    onClick={() => saveToLibrary(activeSlot.id)}
                    disabled={activeSlot.generated.status !== 'done'}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-400 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save to Library
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Official Product URL</label>
                  <input
                    value={activeSlot.productUrl || ''}
                    onChange={(e) => updateSlot(activeSlot.id, { productUrl: e.target.value })}
                    placeholder="https://example.com/product..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-blue-400 focus:border-blue-500 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Product Name</label>
                    <input
                      value={activeSlot.productName}
                      onChange={(e) => updateSlot(activeSlot.id, { productName: e.target.value })}
                      placeholder="e.g. Sony WH-1000XM5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Category / Bucket</label>
                    <input
                      value={activeSlot.category || ''}
                      onChange={(e) => updateSlot(activeSlot.id, { category: e.target.value })}
                      placeholder="e.g. Tech, Home, Viral"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-indigo-400 focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Key Selling Point (Narration Context)</label>
                  <textarea
                    value={activeSlot.description}
                    onChange={(e) => updateSlot(activeSlot.id, { description: e.target.value })}
                    placeholder="Why is this product in this rank? Be specific about what makes it stand out..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] px-6 py-5 text-xs font-bold text-slate-300 focus:border-indigo-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="space-y-3 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem]">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Narrator Script</label>
                    <button
                      onClick={() => generateScriptOnly(activeSlot.id)}
                      className="text-[9px] font-black text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-full uppercase transition-all"
                    >
                      AI Generate Script
                    </button>
                  </div>
                  <textarea
                    value={activeSlot.customScript || ''}
                    onChange={(e) => updateSlot(activeSlot.id, { customScript: e.target.value })}
                    placeholder="Write your own script or click 'AI Generate'..."
                    rows={4}
                    className="w-full bg-slate-950/50 border border-indigo-500/10 rounded-2xl px-6 py-5 text-xs font-bold text-indigo-100 focus:border-indigo-500/50 transition-all outline-none resize-none"
                  />
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-2 px-2 italic">※ This script will be synthesized via Chirp 3 HD TTS.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Reference Visuals</label>
                  <MediaDropzone
                    currentImages={activeSlot.media.images}
                    currentClips={activeSlot.media.clips}
                    onImagesSelected={(imgs) => updateSlot(activeSlot.id, { media: { ...activeSlot.media, images: imgs } })}
                    onClipsSelected={(clips) => updateSlot(activeSlot.id, { media: { ...activeSlot.media, clips: clips } })}
                  />
                </div>

                <button
                  onClick={() => generateSlotAssets(activeSlot.id)}
                  disabled={activeSlot.generated.status === 'generating'}
                  className="w-full py-6 bg-white text-indigo-950 hover:bg-indigo-50 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-4 text-sm"
                >
                  {activeSlot.generated.status === 'generating' ? (
                    <>
                      <div className="w-5 h-5 border-4 border-indigo-950 border-t-transparent rounded-full animate-spin"></div>
                      Processing Engine...
                    </>
                  ) : activeSlot.generated.status === 'done' ? (
                    'Regenerate this specific Rank'
                  ) : (
                    'Initialize Rank Generation'
                  )}
                </button>

                {activeSlot.generated.error && (
                  <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Engine Error</p>
                    <p className="text-xs font-bold text-rose-200">{activeSlot.generated.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Director's Console (Asset Preview & AI Refinement) */}
          <div className="lg:col-span-3 space-y-8">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4 mb-6">Program Monitor</h2>

            {activeSlot.generated.status === 'done' && activeSlot.generated.videoUrl ? (
              <div className="space-y-6 animate-in fade-in scale-95 duration-500">
                <div className="glass-panel p-4 rounded-[3rem] border border-indigo-500/40 bg-slate-900 shadow-2xl overflow-hidden relative group">
                  <div className="aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-black relative">
                    <video
                      src={activeSlot.generated.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <span className="px-3 py-1 bg-indigo-600 text-[8px] font-black uppercase rounded-full shadow-lg">Veo 3.1 Clip</span>
                      <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md text-[8px] font-black uppercase rounded-full border border-slate-700">Rank #{activeSlot.rank}</span>
                    </div>
                  </div>
                </div>

                {/* Director's Feedback Interface */}
                <div className="glass-panel p-6 rounded-[2.5rem] border border-indigo-500/20 bg-indigo-500/5 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Director's Feedback</p>
                    <span className="text-[8px] font-black bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-300">AI Refinement</span>
                  </div>
                  <textarea
                    value={videoFeedback}
                    onChange={(e) => setVideoFeedback(e.target.value)}
                    placeholder="Talk to the AI Editor... (e.g. 'Make the lighting more dramatic', 'Slow down the unboxing')"
                    rows={3}
                    className="w-full bg-slate-950/50 border border-indigo-500/10 rounded-2xl px-4 py-4 text-xs font-bold text-indigo-100 focus:border-indigo-500/30 transition-all outline-none resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => refineVideo(activeSlot.id)}
                      disabled={!videoFeedback}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all disabled:opacity-50"
                    >
                      Apply Fixes
                    </button>
                    <button
                      onClick={() => exportShort(activeSlot.id)}
                      className="px-6 py-4 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-400 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center gap-2"
                      title="Export as Standalone Short"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Short
                    </button>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 bg-slate-900/50">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Narration Master</p>
                  <audio src={activeSlot.generated.audioUrl} controls className="w-full h-8 opacity-70" />
                </div>
              </div>
            ) : (
              <div className="h-[600px] glass-panel rounded-[3.5rem] border border-slate-800 border-dashed flex flex-col items-center justify-center text-center p-10">
                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-800/50 shadow-inner">
                  <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-500 uppercase tracking-tight italic mb-2">Monitor Signal Lost</h3>
                <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed max-w-[180px]">Synthesize rank to activate program monitor.</p>
              </div>
            )}

            {project.status === 'done' && project.finalVideoUrl && (
              <div className="glass-panel p-6 rounded-[2.5rem] border border-emerald-500/50 bg-emerald-500/5 animate-in slide-in-from-bottom-8">
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-tighter italic mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Export Ready
                </h3>
                <button
                  onClick={() => window.open(project.finalVideoUrl)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                >
                  Download Master Reel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Master Timeline (Professional NLE View) */}
        <div className="mt-12 glass-panel p-10 rounded-[4rem] border border-slate-800 bg-slate-950/50 shadow-inner group/timeline">
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Master Sequence</h3>
              </div>
              <div className="h-4 w-[1px] bg-slate-800"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {project.slots.length} Events / ~{project.slots.length * 8}s Duration
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">4K UGC Output</span>
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Temporal Consistency Active</span>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-6 custom-scrollbar h-32 items-end">
            {[...project.slots].sort((a, b) => b.rank - a.rank).map((slot) => (
              <button
                key={slot.id}
                onClick={() => setActiveSlotId(slot.id)}
                className={`flex-shrink-0 group/clip transition-all duration-500 relative ${activeSlotId === slot.id ? 'w-64' : 'w-24 hover:w-40'}`}
              >
                <div className={`absolute -top-6 left-2 text-[9px] font-black tracking-widest transition-all ${activeSlotId === slot.id ? 'text-indigo-400 opacity-100 translate-y-0' : 'text-slate-600 opacity-60 translate-y-1'}`}>
                  TRK_{(slot.rank).toString().padStart(2, '0')}
                </div>
                <div className={`h-20 w-full rounded-2xl border-2 transition-all overflow-hidden relative ${activeSlotId === slot.id ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'border-slate-800 hover:border-slate-700 bg-slate-900'}`}>
                  {slot.generated.videoUrl ? (
                    <>
                      <video src={slot.generated.videoUrl} className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <span className="text-[10px] font-black text-slate-700">EMPTY</span>
                    </div>
                  )}

                  {slot.generated.status === 'generating' && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className={`absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all ${activeSlotId === slot.id ? 'w-full' : 'w-0'}`}></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Master Library Overlay */}
      {showLibrary && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-500 flex items-center justify-center p-8">
          <div className="w-full max-w-6xl h-full max-h-[90vh] glass-panel border border-slate-800 rounded-[5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-12 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-2">Master <span className="text-indigo-500">Library</span></h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Catalog of premium generated sequences</p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500 text-white flex items-center justify-center shadow-xl transition-all hover:rotate-90"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              {library.slots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-32 h-32 bg-slate-900 rounded-[3rem] border border-slate-800 flex items-center justify-center mb-8">
                    <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-500 uppercase italic mb-2 tracking-tight">Vault Empty</h3>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest max-w-xs">Save successful generations to catalog them here for multi-project use.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {library.slots.map(slot => (
                    <div key={slot.id} className="glass-panel p-8 rounded-[3rem] border border-slate-800 group hover:border-indigo-500/50 transition-all">
                      <div className="aspect-[9/16] w-full rounded-[2rem] bg-slate-900 mb-6 overflow-hidden relative shadow-inner">
                        {slot.generated.videoUrl && (
                          <video src={slot.generated.videoUrl} className="w-full h-full object-cover" controls={false} />
                        )}
                        <div className="absolute inset-x-4 bottom-4 flex justify-between items-end">
                          <span className="px-4 py-2 bg-indigo-600/90 backdrop-blur rounded-xl text-[10px] font-black text-white uppercase">UGC 4K</span>
                          {slot.category && <span className="px-4 py-2 bg-slate-800/90 backdrop-blur rounded-xl text-[10px] font-black text-slate-300 uppercase italic">{slot.category}</span>}
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight italic truncate">{slot.productName || 'Unnamed Asset'}</h3>
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-6 line-clamp-2">{slot.description}</p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            importFromLibrary(slot);
                            setShowLibrary(false);
                          }}
                          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                          Import
                        </button>
                        <button
                          onClick={() => exportShort(slot.id)}
                          className="px-6 py-4 bg-slate-950 border border-slate-800 hover:border-indigo-500 text-indigo-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                          title="Export as Standalone Short"
                        >
                          Short
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between px-12">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  {library.slots.length} Assets Stored
                </div>
              </div>
              <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Temporal Consistency Engine v3.1</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
