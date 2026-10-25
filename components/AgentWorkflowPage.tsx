import React, { useState, useEffect } from 'react';
import { ClipLibrary, VideoClip } from './ClipLibrary';
import { DirectorStudio, DeepgramVoice, MusicTrack } from './DirectorStudio';
import { TimelinePreview, EDL, SeriesPart } from './TimelinePreview';
import { BoardroomModal, DialogueEvent } from './BoardroomModal';
import { ApiKeyModal } from './ApiKeyModal';
import { RecordAppModal } from './RecordAppModal';
import { StockBrollModal } from './StockBrollModal';
import { AutoPilotModal } from './AutoPilotModal';
import { BlockKeyModal } from './BlockKeyModal';

// Direct backend communication for high-performance video streaming & multipart uploads
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:3001`
  : '';

const normalizeUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

export const AgentWorkflowPage: React.FC = () => {
  // Clip Library State
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Automated Creation Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState('krechet_academy');

  // Director & Script State
  const [userPrompt, setUserPrompt] = useState('Create a clean, engaging walkthrough of the application workflow and final export.');
  const [scriptMode, setScriptMode] = useState<'prompt_generate' | 'rewrite' | 'user_direct'>('prompt_generate');
  const [rawScript, setRawScript] = useState('');

  // Audio & Voice State
  const [voices, setVoices] = useState<DeepgramVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('aura-orion-en');
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedMusicId, setSelectedMusicId] = useState('');

  // FX & Lighting Controls
  const [enableLightingEffects, setEnableLightingEffects] = useState(true);
  const [enableScreenRecordingSpotlight, setEnableScreenRecordingSpotlight] = useState(true);
  const [enableScreenRecordingSpeed, setEnableScreenRecordingSpeed] = useState(true);

  // Orchestration & Dialogue State
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isBoardroomOpen, setIsBoardroomOpen] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueEvent[]>([]);
  const [orchestratorStatus, setOrchestratorStatus] = useState('');
  const [isOrchestrationComplete, setIsOrchestrationComplete] = useState(false);

  // Timeline & Render State
  const [edl, setEdl] = useState<EDL | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState('');
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Episodic / Multi-Part Series State
  const [seriesParts, setSeriesParts] = useState<SeriesPart[]>(() => {
    try {
      const saved = localStorage.getItem('RAW_BLOCKS_SERIES_PARTS');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isStitching, setIsStitching] = useState(false);
  const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);

  // Persist Series Parts
  useEffect(() => {
    try {
      localStorage.setItem('RAW_BLOCKS_SERIES_PARTS', JSON.stringify(seriesParts));
    } catch (e) {
      console.warn('Failed saving series parts to localStorage:', e);
    }
  }, [seriesParts]);

  const handleAddSeriesPart = (newPart: Omit<SeriesPart, 'id'>) => {
    const id = `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSeriesParts((prev) => [...prev, { ...newPart, id }]);
  };

  const handleRemoveSeriesPart = (id: string) => {
    setSeriesParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleStitchParts = async (partUrls: string[], musicId?: string) => {
    if (!partUrls || partUrls.length < 2) {
      alert('Please save at least 2 video parts to stitch into a master video.');
      return;
    }
    setIsStitching(true);
    setStitchedVideoUrl(null);
    try {
      const res = await fetch(`${API_BASE}/api/stitch-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partUrls,
          selectedMusicId: musicId && musicId !== 'preserve' ? musicId : 'none'
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned error (${res.status}): ${responseText.substring(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to stitch video parts.');
      }

      setStitchedVideoUrl(normalizeUrl(data.videoUrl));
    } catch (err: any) {
      alert(`Stitching Error: ${err.message}`);
    } finally {
      setIsStitching(false);
    }
  };

  // Settings Modal & API Status
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<{
    geminiKeySet: boolean;
    deepgramKeySet: boolean;
    pexelsKeySet: boolean;
  }>({ geminiKeySet: false, deepgramKeySet: false, pexelsKeySet: false });

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Health check
      const healthRes = await fetch(`${API_BASE}/api/health`);
      if (healthRes.ok) {
        const data = await healthRes.json();
        const localGemini = localStorage.getItem('GEMINI_API_KEY');
        const localDeepgram = localStorage.getItem('DEEPGRAM_API_KEY');
        const localPexels = localStorage.getItem('PEXELS_API_KEY');
        setBackendHealth({
          geminiKeySet: data.geminiKeySet || !!localGemini,
          deepgramKeySet: data.deepgramKeySet || !!localDeepgram,
          pexelsKeySet: data.pexelsKeySet || !!localPexels
        });
      }

      // 2. Fetch Deepgram Voices
      const voicesRes = await fetch(`${API_BASE}/api/voices`);
      if (voicesRes.ok) {
        const vData = await voicesRes.json();
        setVoices(vData.voices || []);
      }

      // 3. Fetch Background Music
      const musicRes = await fetch(`${API_BASE}/api/music`);
      if (musicRes.ok) {
        const mData = await musicRes.json();
        setMusicTracks(mData.tracks || []);
      }

      // 4. Fetch existing uploaded clips
      const clipsRes = await fetch(`${API_BASE}/api/clips`);
      if (clipsRes.ok) {
        const cData = await clipsRes.json();
        if (cData.project) setActiveProject(cData.project);
        const mappedClips = (cData.clips || []).map((c: any) => ({
          ...c,
          videoUrl: normalizeUrl(c.videoUrl),
          thumbnailUrl: normalizeUrl(c.thumbnailUrl)
        }));
        setClips(mappedClips);
      }
    } catch (err) {
      console.warn('Initial data fetch warning:', err);
    }
  };

  // Upload Clips Handler
  const handleUploadClips = async (files: FileList) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('videos', files[i]);
      }

      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const headers: Record<string, string> = {};
      if (geminiKey) headers['x-gemini-key'] = geminiKey;

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(`Server returned unexpected response (${res.status}): ${responseText.substring(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      const newClips = (data.clips || []).map((c: any) => ({
        ...c,
        videoUrl: normalizeUrl(c.videoUrl),
        thumbnailUrl: normalizeUrl(c.thumbnailUrl)
      }));

      setClips((prev) => [...prev, ...newClips]);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Clip Handler
  const handleDeleteClip = async (clipId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/clips/${clipId}`, { method: 'DELETE' });
      if (res.ok) {
        setClips((prev) => prev.filter((c) => c.clipId !== clipId));
      }
    } catch (err: any) {
      console.error('Delete clip error:', err);
    }
  };

  // Add Clip from Playwright or Stock B-Roll
  const handleAddNewClip = (rawClip: any) => {
    const formatted = {
      ...rawClip,
      videoUrl: normalizeUrl(rawClip.videoUrl),
      thumbnailUrl: normalizeUrl(rawClip.thumbnailUrl)
    };
    setClips((prev) => [formatted, ...prev]);
  };

  // Orchestrate Video Production
  const handleStartOrchestration = async () => {
    if (clips.length === 0) {
      alert('Please upload, record, or import at least one video clip first.');
      return;
    }

    setIsOrchestrating(true);
    setIsBoardroomOpen(true);
    setIsOrchestrationComplete(false);
    setDialogue([]);
    setOrchestratorStatus('Deploying multi-agent production team...');

    try {
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const deepgramKey = localStorage.getItem('DEEPGRAM_API_KEY') || '';

      const res = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          scriptMode,
          rawScript,
          selectedVoice,
          selectedMusicId,
          enableLightingEffects,
          enableScreenRecordingSpotlight,
          enableScreenRecordingSpeed,
          screenRecordingSpeed: 1.25,
          geminiKey,
          deepgramKey
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned unexpected response (${res.status}): ${responseText.substring(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Agent orchestration failed');
      }

      setDialogue(data.dialogue || []);
      setEdl(data.edl);
      setIsOrchestrationComplete(true);
      setOrchestratorStatus('Master timeline successfully locked and approved.');
    } catch (err: any) {
      alert(`Orchestration error: ${err.message}`);
      setOrchestratorStatus(`Error: ${err.message}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  // Render Final Video with FFmpeg
  const handleRenderVideo = async () => {
    if (!edl) return;
    setIsRendering(true);
    setRenderProgress('Initializing FFmpeg render pipeline...');
    setRenderedVideoUrl(null);

    try {
      const res = await fetch(`${API_BASE}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edl })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned unexpected response (${res.status}): ${responseText.substring(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Video rendering failed');
      }

      setRenderedVideoUrl(normalizeUrl(data.videoUrl));
      setRenderProgress('Render complete!');
    } catch (err: any) {
      alert(`Render error: ${err.message}`);
      setRenderProgress(`Failed: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  const handleAutoPilotComplete = (result: any) => {
    if (result.allClips) {
      setClips(result.allClips.map((c: any) => ({
        ...c,
        videoUrl: normalizeUrl(c.videoUrl) || c.videoUrl,
        thumbnailUrl: normalizeUrl(c.thumbnailUrl)
      })));
    }
    if (result.edl) {
      setEdl(result.edl);
    }
    if (result.dialogue) {
      setDialogue(result.dialogue);
    }
    setRenderedVideoUrl(null);
    setIsBoardroomOpen(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#f8fafc',
      padding: '1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Top Navigation Bar */}
      <header style={{
        maxWidth: '1400px',
        margin: '0 auto 1.5rem auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#121217',
        border: '1px solid #23232f',
        borderRadius: '16px',
        padding: '1rem 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem'
          }}>
            🎬
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(90deg, #818cf8, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Raw Blocks AI Studio
            </h1>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              Semantic Video Assembler & Multi-Agent Production Pipeline
            </span>
          </div>
        </div>

        {/* Right side status badges & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '8px',
            background: backendHealth.geminiKeySet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: backendHealth.geminiKeySet ? '#10b981' : '#eab308',
            border: `1px solid ${backendHealth.geminiKeySet ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            fontWeight: 600
          }}>
            Gemini: {backendHealth.geminiKeySet ? 'Ready' : 'Heuristic Mode'}
          </span>

          <span style={{
            fontSize: '0.72rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '8px',
            background: backendHealth.deepgramKeySet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: backendHealth.deepgramKeySet ? '#10b981' : '#eab308',
            border: `1px solid ${backendHealth.deepgramKeySet ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            fontWeight: 600
          }}>
            Deepgram: {backendHealth.deepgramKeySet ? 'Aura Active' : 'Cadence Timing'}
          </span>

          <button
            onClick={() => setIsAutoPilotOpen(true)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.4)'
            }}
          >
            🚀 Auto-Pilot Producer
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600
            }}
          >
            ⚙️ Keys & Config
          </button>
        </div>
      </header>

      {/* Main Studio Work Area */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Top 2-Column Grid: Clip Library (Left) & Director Controls (Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch'
        }}>
          {/* Panel 1: Video Clip Ingest & Library */}
          <ClipLibrary
            clips={clips}
            onUpload={handleUploadClips}
            onDeleteClip={handleDeleteClip}
            isUploading={isUploading}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onOpenStockModal={() => setIsStockModalOpen(true)}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            activeProject={activeProject}
          />

          {/* Panel 2: Director Studio (Prompt, Script Modes, Audio & Effects) */}
          <DirectorStudio
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            scriptMode={scriptMode}
            setScriptMode={setScriptMode}
            rawScript={rawScript}
            setRawScript={setRawScript}
            voices={voices}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            musicTracks={musicTracks}
            selectedMusicId={selectedMusicId}
            setSelectedMusicId={setSelectedMusicId}
            enableLightingEffects={enableLightingEffects}
            setEnableLightingEffects={setEnableLightingEffects}
            enableScreenRecordingSpotlight={enableScreenRecordingSpotlight}
            setEnableScreenRecordingSpotlight={setEnableScreenRecordingSpotlight}
            enableScreenRecordingSpeed={enableScreenRecordingSpeed}
            setEnableScreenRecordingSpeed={setEnableScreenRecordingSpeed}
            onStartOrchestration={handleStartOrchestration}
            isOrchestrating={isOrchestrating}
            clipCount={clips.length}
          />
        </div>

        {/* Panel 3: Master Timeline & Storyboard (EDL) */}
        <TimelinePreview
          edl={edl}
          onRender={handleRenderVideo}
          isRendering={isRendering}
          renderProgress={renderProgress}
          renderedVideoUrl={renderedVideoUrl}
          seriesParts={seriesParts}
          onAddSeriesPart={handleAddSeriesPart}
          onRemoveSeriesPart={handleRemoveSeriesPart}
          onStitchParts={handleStitchParts}
          isStitching={isStitching}
          stitchedVideoUrl={stitchedVideoUrl}
          selectedMusicId={selectedMusicId}
          musicTracks={musicTracks}
        />
      </main>

      {/* Real-Time Agent Dialogue Modal */}
      <BoardroomModal
        isOpen={isBoardroomOpen}
        onClose={() => setIsBoardroomOpen(false)}
        dialogue={dialogue}
        status={orchestratorStatus}
        isComplete={isOrchestrationComplete}
        onViewTimeline={() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }}
      />

      {/* Agent Browser Recording Modal */}
      <RecordAppModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onClipRecorded={handleAddNewClip}
        apiBase={API_BASE}
      />

      {/* Stock Reaction B-Roll Modal */}
      <StockBrollModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onClipImported={handleAddNewClip}
        apiBase={API_BASE}
      />

      {/* Auto-Pilot Full Video Producer Modal */}
      <AutoPilotModal
        isOpen={isAutoPilotOpen}
        onClose={() => setIsAutoPilotOpen(false)}
        apiBase={API_BASE}
        voices={voices}
        onAutoPilotComplete={handleAutoPilotComplete}
      />

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(keys) => {
          setBackendHealth({
            geminiKeySet: !!keys.geminiKey,
            deepgramKeySet: !!keys.deepgramKey,
            pexelsKeySet: false
          });
        }}
      />

      {/* Block Key & Project Folder Modal */}
      <BlockKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiBase={API_BASE}
        onProjectSwitched={() => {
          fetchInitialData();
        }}
      />
    </div>
  );
};

export default AgentWorkflowPage;
