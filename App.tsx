
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import MediaDropzone from './components/MediaDropzone';
import AssetLibrary from './components/AssetLibrary';
import { GeminiService } from './services/geminiService';
import { ResearcherAgent } from './services/agents/ResearcherAgent';
import { SocialMediaAgent } from './services/agents/SocialMediaAgent';
import { DirectorAgent } from './services/agents/DirectorAgent';
import { VideoEditorAgent } from './services/agents/VideoEditorAgent';
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
    if (saved) {
      const parsed = JSON.parse(saved);
      // Data Migration / Safety Check
      if (parsed.slots) {
        parsed.slots = parsed.slots.map((s: any) => ({
          ...s,
          media: s.media || { images: [], clips: [] },
          generated: s.generated ? {
            ...s.generated,
            // Check for expired Blob URLs (they don't persist across reloads)
            status: (s.generated.videoUrl?.startsWith('blob:') || s.generated.audioUrl?.startsWith('blob:'))
              ? 'error'
              : s.generated.status,
            error: (s.generated.videoUrl?.startsWith('blob:') || s.generated.audioUrl?.startsWith('blob:'))
              ? 'Session expired. Blob URLs do not persist. Please regenerate.'
              : s.generated.error,
            videoUrl: (s.generated.videoUrl?.startsWith('blob:') || s.generated.audioUrl?.startsWith('blob:'))
              ? undefined
              : s.generated.videoUrl,
            audioUrl: (s.generated.videoUrl?.startsWith('blob:') || s.generated.audioUrl?.startsWith('blob:'))
              ? undefined
              : s.generated.audioUrl
          } : { status: 'idle' }
        }));
      }

      // Ensure we never have 0 slots on load
      if (!parsed.slots || parsed.slots.length === 0) {
        parsed.slots = INITIAL_SLOTS;
      }
      return parsed;
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Product Countdown',
      slots: INITIAL_SLOTS,
      status: 'idle' as const,
      settings: {
        isAffiliatePromotion: false,
        legalDisclosureText: 'Commission Earned / #ad',
        debugMode: false,
        videoType: 'SHOWCASE'
      }
    };
  });

  const [library, setLibrary] = useState<{ slots: CountdownSlot[] }>(() => {
    const saved = localStorage.getItem('countdown_library_v1');
    return saved ? JSON.parse(saved) : { slots: [] };
  });

  const [currentView, setCurrentView] = useState<AppView>(AppView.GENERATOR);
  const [activeSlotId, setActiveSlotId] = useState<string>(project.slots[0]?.id || '');
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

  // Safety guard if no slots exist (e.g. during agent work)
  if (!activeSlot && project.status !== 'assembling' && project.status !== 'agent_finished') {
    // Should trigger a reset or render fallback
  }

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

  const duplicateSlot = (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot) return;

    const nextRank = project.slots.length > 0 ? Math.max(...project.slots.map(s => s.rank)) + 1 : 1;
    const newSlot: CountdownSlot = {
      id: Math.random().toString(36).substr(2, 9),
      rank: nextRank,
      productName: slot.productName,
      description: '', // Clear description so user focuses on new feature
      productUrl: slot.productUrl,
      customScript: '', // Clear script for new feature
      referenceYoutubeUrls: slot.referenceYoutubeUrls ? [...slot.referenceYoutubeUrls] : [],
      media: {
        images: [...slot.media.images], // Keep same product images
        clips: [...slot.media.clips]
      },
      category: slot.category,
      generated: { status: 'idle' as const }
    };

    setProject(prev => ({
      ...prev,
      slots: [newSlot, ...prev.slots].sort((a, b) => b.rank - a.rank)
    }));
    setActiveSlotId(newSlot.id);
    setGlobalStatus(`Duplicated! Now describe the next feature for ${slot.productName || 'this product'}.`);
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

    // Check if at least one visual reference is provided (image, clip, or product URL)
    const hasImages = slot.media.images && slot.media.images.length > 0;
    const hasClips = slot.media.clips && slot.media.clips.length > 0;
    const hasProductUrl = slot.productUrl && slot.productUrl.trim().length > 0;

    if (!hasImages && !hasClips && !hasProductUrl) {
      alert("Please provide at least one visual reference: an image, video clip, or product URL.");
      return;
    }

    setGlobalStatus(`Generating script for ${slot.productName || 'product'}...`);
    try {
      const details = {
        name: slot.productName,
        benefit: slot.description,
        price: '',
        audience: 'General Consumers',
        cta: 'Check it out',
        angle: 4,
        productUrl: slot.productUrl,
        referenceYoutubeUrls: slot.referenceYoutubeUrls,
      } as any;
      const optimized = await GeminiService.optimizePrompts(details, Platform.TIKTOK, slot.media.images);
      const script = optimized.audioScript;
      updateSlot(slotId, { customScript: script });
      setGlobalStatus("Script generated! You can now edit it or start production.");
    } catch (err: any) {
      setGlobalStatus(`Script generation failed: ${err.message}`);
    }
  };

  const generateSlotAssets = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot) return;

    // Check if at least one image is provided
    const hasImages = slot.media.images && slot.media.images.length > 0;

    if (!hasImages) {
      alert("Please upload at least one product image.");
      return;
    }

    updateSlot(slotId, { generated: { ...slot.generated, status: 'generating' } });

    try {
      let videoUrl: string;
      let finalPrompt = slot.generated.videoPrompt;
      let finalScript = slot.customScript;

      if (finalPrompt && finalPrompt.trim().length > 5) {
        // Option A: Use existing Director/Remix Prompt
        setGlobalStatus("Initializing Veo with Director's Vision...");

        // Ensure we have a script
        if (!finalScript) {
          const derivedScript = await GeminiService.generateConnectiveNarrative(
            [{ rank: 1, name: slot.productName }],
            false,
            '',
            'SHOWCASE'
          );
          finalScript = derivedScript;
        }

        videoUrl = await GeminiService.generateVideoFromPrompt(
          finalPrompt,
          (status) => setGlobalStatus(status),
          hasImages ? slot.media.images[0] : null
        );

      } else {
        // Option B: Generate from Scratch (Simple Mode)
        const result = await GeminiService.generateSimpleVideo(
          slot.productName,
          slot.description,
          slot.media.images,
          (status) => setGlobalStatus(status),
          slot.targetAudience || 'General'
        );
        videoUrl = result.videoUrl;
        finalPrompt = result.videoPrompt;
        if (!finalScript) finalScript = result.script;
      }

      // Generate Audio if needed
      setGlobalStatus("Generating Voiceover...");
      const audioUrl = await GeminiService.generateAudio(finalScript || "Check this out.", selectedVoice);

      updateSlot(slotId, {
        generated: {
          status: 'done',
          videoUrl,
          audioUrl,
          script: finalScript,
          videoPrompt: finalPrompt // Save the prompt if we generated a new one
        }
      });
      setGlobalStatus(`Done! Video ready for ${slot.productName || 'product'}.`);
    } catch (err: any) {
      console.error(err);
      updateSlot(slotId, {
        generated: {
          ...slot.generated,
          status: 'error',
          error: err.message
        }
      });
      setGlobalStatus(`Error: ${err.message}`);
    }
  };

  const assembleCountdown = async () => {
    const activeSlots = project.slots
      .filter(s => !s.excludeFromMaster)
      .sort((a, b) => b.rank - a.rank);

    if (activeSlots.length === 0) {
      alert("Please select at least one box to include.");
      return;
    }

    if (activeSlots.some(s => s.generated.status !== 'done')) {
      alert("Please ensure all selected boxes are generated before assembly.");
      return;
    }

    setProject(prev => ({ ...prev, status: 'assembling' }));
    setGlobalStatus("Synthesizing Master Connective Narrative...");

    try {
      // 1. Generate Connective Narrative if missing
      let narrative = project.connectiveNarrative;
      if (!narrative) {
        const slotsForNarrative = activeSlots.map(s => ({ rank: s.rank, name: s.productName || 'Product' }));
        narrative = await GeminiService.generateConnectiveNarrative(
          slotsForNarrative,
          project.settings.isAffiliatePromotion,
          project.settings.legalDisclosureText,
          project.settings.videoType
        );
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
      const narrative = await GeminiService.generateConnectiveNarrative(
        slotsForNarrative,
        project.settings.isAffiliatePromotion,
        project.settings.legalDisclosureText,
        project.settings.videoType
      );
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
    setGlobalStatus(`Refining video with your feedback...`);

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

  const handleDirectorScan = async (slotId: string) => {
    const slot = project.slots.find(s => s.id === slotId);
    if (!slot || !slot.sourceVideoUrl) {
      alert("Please provide a valid Source Video URL first.");
      return;
    }

    // Helper for time parsing within Director Scan
    const parseTime = (timeStr?: string) => {
      if (!timeStr) return 0;
      const clean = timeStr.trim();
      if (!clean.includes(':')) {
        const s = Number(clean);
        return isNaN(s) ? 0 : s;
      }
      const parts = clean.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    };

    setGlobalStatus(`Director Mode: Analyzing ${slot.sourceVideoUrl} for ${slot.targetAudience} audience...`);

    try {
      const clips = await GeminiService.analyzeVideoContent(slot.sourceVideoUrl, slot.targetAudience || 'General', slot.productName || 'Product');

      const newSlots: CountdownSlot[] = clips.map((clip, index) => {
        const startTime = (clip as any).start_timestamp?.trim() || "";
        const endTime = (clip as any).end_timestamp?.trim() || "";

        return {
          id: Math.random().toString(36).substr(2, 9),
          rank: slot.rank + index + 1,
          productName: slot.productName,
          description: `Feature Focus: ${clip.description}`,
          targetAudience: slot.targetAudience,
          customScript: clip.script,
          productUrl: slot.productUrl,
          media: { images: slot.media.images, clips: [] },
          generated: {
            status: 'idle',
            videoPrompt: clip.visualBrief
          },
          segment: startTime ? {
            startTime,
            endTime,
            duration: parseTime(endTime) - parseTime(startTime)
          } : undefined,
          category: `Director's Cut: ${clip.audience_alignment}`,
          clipType: clip.clip_type
        };
      });

      // Sort Chronologically
      newSlots.sort((a, b) => parseTime(a.segment?.startTime) - parseTime(b.segment?.startTime));

      setProject(prev => {
        const updatedSlots = [...prev.slots];
        const currentIndex = updatedSlots.findIndex(s => s.id === slotId);
        updatedSlots.splice(currentIndex + 1, 0, ...newSlots);
        return {
          ...prev,
          slots: updatedSlots
        };
      });

      setGlobalStatus(`Director extracted ${clips.length} features! Added to timeline.`);

    } catch (err: any) {
      console.error(err);
      setGlobalStatus(`Director Scan Error: ${err.message}`);
      alert(`Director's Cut Failed: ${err.message}`);
    }
  };

  const generateAllSlots = async () => {
    for (const slot of project.slots) {
      if (slot.generated.status !== 'done') {
        await generateSlotAssets(slot.id);
      }
    }
  };

  // --- AGENT TEAM ORCHESTRATION ---
  const runAgentWorkflow = async (productUrl: string, videoUrl: string) => {
    if (confirm("This will replace your current canvas with an AI-generated sequence. Continue?")) {
      setGlobalStatus("Initializing Agent Team...");
      setProject(prev => ({ ...prev, status: 'assembling', slots: [] })); // Clear slots

      try {
        // 1. Researcher
        setGlobalStatus("🕵️ Researcher Agent: Scouring the web for product data...");
        const dossier = await ResearcherAgent.research(productUrl, videoUrl);
        setGlobalStatus(`🕵️ Researcher: Found ${dossier.referenceVideoUrls.length} relevant videos.`);

        // 2. Social Media
        setGlobalStatus("🧠 Social Media Agent: Analyzing trends & psychology...");
        const strategy = await SocialMediaAgent.developStrategy(dossier);
        setGlobalStatus(`🧠 Social Media: Strategy set - ${strategy.angle} (${strategy.videoType})`);

        // 3. Director (w/ Assistant + Sound/Graphics)
        setGlobalStatus("🎬 Director Agent: Planning full video sequence...");
        const sequence = await DirectorAgent.produceSequence(dossier, strategy);
        setGlobalStatus(`🎬 Director: Sequence locked. ${sequence.boxes.length} scenes planned.`);

        // 4. Editor
        setGlobalStatus("✂️ Video Editor: Cutting timeline blocks...");

        // 4b. IMAGE ACQUISITION (Crucial for Visual Consistency)
        // tailored to run in browser; requires CORS-friendly URLs or fallback to Description
        const fetchedImages: string[] = [];
        if (dossier.images && dossier.images.length > 0) {
          setGlobalStatus(`🖼️ Acquiring visual assets from ${dossier.images.length} sources...`);
          for (const imgUrl of dossier.images) {
            try {
              const response = await fetch(imgUrl);
              const blob = await response.blob();
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              fetchedImages.push(base64);
            } catch (e) {
              console.warn("CORS/Fetch Error for image:", imgUrl);
              // Continue without this image
            }
          }
        }

        // Pass fetched images (or empty) to the calculated slots
        const rawSlots = VideoEditorAgent.assembleTimeline(sequence, dossier.productName);
        const slots = rawSlots.map(s => ({
          ...s,
          media: { ...s.media, images: fetchedImages }
        }));

        // Update Project
        setProject(prev => ({
          ...prev,
          title: `${dossier.productName} - ${strategy.videoType}`,
          slots: slots,
          status: 'agent_finished', // Special flag to trigger Effect
          connectiveNarrative: `Strategy: ${strategy.angle}. Audience: ${strategy.targetAudience}.`
        }));

      } catch (err: any) {
        console.error("Agent Team Failed:", err);
        setGlobalStatus(`❌ Mission Failed: ${err.message}`);
        setProject(prev => ({ ...prev, status: 'error' }));
      }
    }
  };

  // Auto-Run Effect: Watch for "agent_finished" status
  useEffect(() => {
    if (project.status === 'agent_finished') {
      // Allow the UI to settle for a split second so the user sees the slots
      const timer = setTimeout(() => {
        if (confirm(`Agent Team Mission Success!\n\n${project.slots.length} Scenes Created.\n\nStart Auto-Rendering All Videos Now?`)) {
          generateAllSlots();
        }
        // Reset status to idle so we don't trigger again
        setProject(prev => ({ ...prev, status: 'idle' }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [project.status]);

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

  if (currentView === AppView.LIBRARY) {
    return (
      <Layout currentView={AppView.LIBRARY} onViewChange={setCurrentView} onResetKey={handleResetKey}>
        <AssetLibrary
          library={library}
          onUpdateLibrary={setLibrary}
          onImport={(slot) => {
            importFromLibrary(slot);
            setCurrentView(AppView.GENERATOR);
          }}
          onSetView={setCurrentView}
          projectSettings={project.settings}
        />
      </Layout>
    );
  }

  return (
    <Layout currentView={AppView.GENERATOR} onViewChange={setCurrentView} onResetKey={handleResetKey}>
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
              onClick={() => setCurrentView(AppView.LIBRARY)}
              className="px-8 py-4 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 rounded-2xl font-black uppercase text-xs transition-all shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              The Vault
            </button>
            <div className="h-14 w-[1px] bg-slate-800 mx-2"></div>
            <div className="h-14 w-[1px] bg-slate-800 mx-2"></div>

            <button
              onClick={() => {
                const productUrl = prompt("Enter Product URL (Amazon/Shopify):");
                if (!productUrl) return;
                const videoUrl = prompt("Enter Reference Video URL (YouTube/TikTok):");
                if (!videoUrl) return;

                runAgentWorkflow(productUrl, videoUrl);
              }}
              className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] transition-all flex items-center gap-2 shadow-2xl shadow-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5 5A2 2 0 009 10.172V5L8 4z" /></svg>
              Deploy Agent Team
            </button>

            <button
              onClick={handleResetKey}
              className="px-4 py-4 bg-slate-950 border border-slate-800 hover:border-red-500 text-red-500/50 hover:text-red-500 rounded-2xl font-black transition-all flex items-center gap-2"
              title="Wipe API Key (Burn Protocol)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
          </div>
        </div>

        {/* Studio Compliance & Diagnostics Panel */}
        <div className="mb-12 glass-panel p-8 rounded-[3rem] border border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-10">
          <div className="flex flex-wrap items-center gap-10">
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={project.settings.isAffiliatePromotion}
                  onChange={(e) => setProject(prev => ({ ...prev, settings: { ...prev.settings, isAffiliatePromotion: e.target.checked } }))}
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Affiliate Mode</span>
              </label>
            </div>

            {project.settings.isAffiliatePromotion && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                <span className="text-[10px] font-black text-slate-600 uppercase">Disclosure:</span>
                <input
                  type="text"
                  value={project.settings.legalDisclosureText}
                  onChange={(e) => setProject(prev => ({ ...prev, settings: { ...prev.settings, legalDisclosureText: e.target.value } }))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-bold text-emerald-400 uppercase outline-none focus:border-emerald-500/50 min-w-[200px]"
                />
              </div>
            )}

            <div className="h-4 w-[1px] bg-slate-800"></div>

            <label className="relative inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={project.settings.debugMode}
                onChange={(e) => setProject(prev => ({ ...prev, settings: { ...prev.settings, debugMode: e.target.checked } }))}
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Diagnostic Mode</span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Secure Engine Active</span>
            </div>
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

          {/* Box Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-4 mb-6">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Story Timeline</h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const goal = prompt("What is the goal of this video? (e.g. 'Fast Paced Teaser', 'In-Depth Review', 'ASMR Unboxing')");
                    if (!goal) return;

                    if (library.slots.length === 0) {
                      alert("Your Vault is empty! Go to 'The Vault' and run a Director's Cut scan first.");
                      return;
                    }

                    setGlobalStatus("AI Editor: Sheldon is curating the best clips...");
                    try {
                      const selectedIds = await GeminiService.curateSequence(library.slots, goal);
                      const selectedSlots = selectedIds
                        .map(id => library.slots.find(s => s.id === id))
                        .filter(s => s !== undefined) as CountdownSlot[];

                      if (selectedSlots.length === 0) {
                        alert("AI couldn't find suitable clips. Try a different goal.");
                        setGlobalStatus("");
                        return;
                      }

                      // Transform them into project slots (giving new IDs)
                      const projectSlots = selectedSlots.map((s, i) => ({
                        ...s,
                        id: Math.random().toString(36).substr(2, 9),
                        rank: i + 1,
                        excludeFromMaster: false,
                        generated: { status: 'idle' } // Reset status so we can generate fresh
                      })) as CountdownSlot[];

                      setProject(prev => ({
                        ...prev,
                        slots: projectSlots
                      }));
                      setGlobalStatus(`AI Editor: Assembled ${projectSlots.length} clip sequence for '${goal}'!`);

                    } catch (e: any) {
                      alert(e.message);
                      setGlobalStatus("Auto-Build Failed");
                    }
                  }}
                  className="px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-lg transition-all"
                  title="AI Auto-Build Sequence"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  AI Build
                </button>

                <button
                  onClick={async () => {
                    const style = prompt("Enter a Visual Style to Remix (e.g. 'Cyberpunk', 'Soft Pastel Gameplay', 'Dark Mode Tech')");
                    if (!style) return;

                    setGlobalStatus(`Studio: Applying '${style}' aesthetic to all clips...`);

                    const updatedSlots = await Promise.all(project.slots.map(async (slot) => {
                      if (!slot.generated.videoPrompt) return slot;
                      const newPrompt = await GeminiService.applyStyleTransform(slot.generated.videoPrompt, style);
                      return {
                        ...slot,
                        generated: {
                          ...slot.generated,
                          videoPrompt: newPrompt,
                          status: 'idle' as const, // Reset to idle to force regeneration
                          videoUrl: undefined
                        }
                      };
                    }));

                    setProject(prev => ({ ...prev, slots: updatedSlots }));
                    setGlobalStatus(`Style Transfer Complete! Click 'Generate' on boxes to see results.`);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-lg transition-all"
                  title="Remix Visual Style"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                  Remix
                </button>

                <button
                  onClick={addSlot}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg transition-all border border-slate-700"
                  title="Add Manual Box"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
              </div>
            </div>
            {project.slots.map((slot) => (
              <div key={slot.id} className="relative group">
                <div
                  onClick={() => setActiveSlotId(slot.id)}
                  className={`w-full p-6 rounded-[2.5rem] border transition-all text-left flex items-center gap-4 relative overflow-hidden cursor-pointer ${activeSlotId === slot.id
                    ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-105 z-10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
                    } ${slot.excludeFromMaster ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className="flex flex-col gap-1 items-center">
                    <div
                      onClick={(e) => { e.stopPropagation(); reorderSlot(slot.id, 'up'); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg ${activeSlotId === slot.id ? 'bg-white text-indigo-950' : 'bg-slate-900 text-slate-400'
                      }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <div
                      onClick={(e) => { e.stopPropagation(); reorderSlot(slot.id, 'down'); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </div>
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

                  <div
                    onClick={(e) => { e.stopPropagation(); toggleSlotInclusion(slot.id); }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${slot.excludeFromMaster
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
                  </div>

                  {slot.generated.status === 'generating' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/40 animate-progress-indefinite"></div>
                  )}
                </div>
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
                  <select
                    value={project.settings.videoType || 'SHOWCASE'}
                    onChange={(e) => setProject(prev => ({ ...prev, settings: { ...prev.settings, videoType: e.target.value } }))}
                    className="text-[9px] font-black bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-md px-2 py-1 uppercase outline-none"
                  >
                    <option value="SHOWCASE">Showcase</option>
                    <option value="UNBOXING">Unboxing</option>
                    <option value="HOW_TO">How-To Guide</option>
                    <option value="TROUBLESHOOTING">Troubleshooting</option>
                    <option value="COMPARISON">Comparison</option>
                  </select>
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
                  placeholder="Optional narration that connects all clips together..."
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
                  Box Editor
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
                    onClick={() => activeSlot && duplicateSlot(activeSlot.id)}
                    className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/50 text-indigo-400 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2"
                    title="Duplicate this box for another feature"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Duplicate
                  </button>
                  <button
                    onClick={() => activeSlot && saveToLibrary(activeSlot.id)}
                    disabled={activeSlot?.generated?.status !== 'done'}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-400 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save to Library
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {activeSlot ? (
                  <>
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
                      <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Feature Focus (One Feature Per Box)
                      </label>
                      <textarea
                        value={activeSlot.description}
                        onChange={(e) => updateSlot(activeSlot.id, { description: e.target.value })}
                        placeholder="Describe ONE specific feature to showcase in this 8-second clip (e.g. 'Wireless charging capability - show placing phone on pad and it starts charging instantly')"
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
                      <div className="flex justify-end">
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
                    <p className="text-sm font-bold uppercase tracking-widest">No Active Box Selected</p>
                    <p className="text-[10px] opacity-50">Select a box from the timeline to edit</p>
                  </div>
                )}
                <p className="text-[9px] text-slate-500 italic uppercase">AI Director will use this script as a base.</p>
              </div>
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

            {/* YouTube Reference URLs */}
            <div className="space-y-3 p-6 bg-red-500/5 border border-red-500/20 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-4 px-2">
                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube Reference Videos
                </label>
                <span className="text-[8px] font-black bg-red-500/10 px-2 py-0.5 rounded text-red-300">Optional Style Reference</span>
              </div>
              <p className="text-[9px] text-slate-500 font-bold px-2 mb-4">Add YouTube video URLs to help the AI understand the style, pacing, and format you want.</p>

              {/* List of added URLs */}
              {activeSlot.referenceYoutubeUrls && activeSlot.referenceYoutubeUrls.length > 0 && (
                <div className="space-y-2 mb-4">
                  {activeSlot.referenceYoutubeUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-950/50 rounded-xl px-4 py-3 group">
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span className="text-[10px] font-bold text-red-300 truncate flex-1">{url}</span>
                      <button
                        onClick={() => {
                          const newUrls = activeSlot.referenceYoutubeUrls?.filter((_, i) => i !== index) || [];
                          updateSlot(activeSlot.id, { referenceYoutubeUrls: newUrls });
                        }}
                        className="w-6 h-6 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new URL input */}
              <div className="flex gap-2">
                <input
                  id={`youtube-url-input-${activeSlot.id}`}
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  className="flex-1 bg-slate-950/50 border border-red-500/10 rounded-xl px-4 py-3 text-[10px] font-bold text-red-100 focus:border-red-500/50 transition-all outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      const url = input.value.trim();
                      if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
                        const currentUrls = activeSlot.referenceYoutubeUrls || [];
                        if (!currentUrls.includes(url)) {
                          updateSlot(activeSlot.id, { referenceYoutubeUrls: [...currentUrls, url] });
                        }
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(`youtube-url-input-${activeSlot.id}`) as HTMLInputElement;
                    const url = input?.value.trim();
                    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
                      const currentUrls = activeSlot.referenceYoutubeUrls || [];
                      if (!currentUrls.includes(url)) {
                        updateSlot(activeSlot.id, { referenceYoutubeUrls: [...currentUrls, url] });
                      }
                      input.value = '';
                    }
                  }}
                  className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add
                </button>
              </div>
              <p className="text-[8px] text-slate-500 font-bold uppercase mt-2 px-2 italic">※ The AI will analyze these videos for style, format, and pacing reference.</p>
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
                'Regenerate Box'
              ) : (
                'Generate Box'
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
        <div className="flex items-center justify-between px-4 mb-6">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Program Monitor</h2>
          {project.settings.debugMode && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-400 animate-pulse">
              <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
              DIAGNOSTIC STREAM
            </span>
          )}
        </div>

        {project.settings.debugMode && activeSlot.generated.debugLog && (
          <div className="glass-panel p-6 rounded-[2rem] border border-indigo-500/20 bg-slate-950/80 font-mono text-[9px] text-indigo-300/70 space-y-1 max-h-40 overflow-y-auto animate-in slide-in-from-top-4">
            <p className="text-white font-black mb-2 uppercase opacity-100 flex items-center justify-between">
              <span>Engine Forensic Logs</span>
              <span className="opacity-50 tracking-tighter">Box ID: {activeSlot.id}</span>
            </p>
            {activeSlot.generated.debugLog.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="opacity-30">[{i}]</span>
                <span className={log.includes('ERROR') ? 'text-red-400' : log.includes('LEGAL') ? 'text-emerald-400' : ''}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        )}

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
                  <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md text-[8px] font-black uppercase rounded-full border border-slate-700">8 sec</span>
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
            <h3 className="text-xl font-black text-slate-500 uppercase tracking-tight italic mb-2">No Video Yet</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed max-w-[180px]">Generate a box to see the preview here.</p>
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
    </Layout >
  );
};

export default App;
