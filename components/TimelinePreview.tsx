import React, { useState, useEffect, useRef } from 'react';
import { getBlockRole } from './ClipLibrary';
import { TimestampedEditConsole } from './TimestampedEditConsole';

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:3001`
  : '';

const normalizeUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

export interface TimelineClip {
  beatIndex: number;
  beatText: string;
  clipId: string;
  title: string;
  filePath: string;
  contentType: string;
  lightingProfile: string;
  in: number;
  out: number;
  duration: number;
  speed?: number;
  effects: {
    zoom?: boolean;
    spotlight?: boolean;
    lighting?: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
  };
  transition: string;
}

export interface EDL {
  projectTitle: string;
  partInfo?: {
    label: string;
    partNumber: number;
    videoNumber?: number;
  } | null;
  totalDuration: number;
  voiceoverAudioPath: string;
  voiceoverDuration: number;
  selectedVoice: string;
  musicTrack: string | null;
  clips: TimelineClip[];
  beats: Array<{
    id: string;
    text: string;
    exactDuration: number;
    visualGoal: string;
  }>;
}

export interface SeriesPart {
  id: string;
  label: string;
  videoUrl: string;
  duration: number;
  partNumber?: number;
  videoNumber?: number;
  createdAt: number;
}

interface TimelinePreviewProps {
  edl: EDL | null;
  onRender: () => void;
  isRendering: boolean;
  renderProgress: string;
  renderedVideoUrl: string | null;
  seriesParts?: SeriesPart[];
  onAddSeriesPart?: (part: Omit<SeriesPart, 'id'>) => void;
  onRemoveSeriesPart?: (id: string) => void;
  onStitchParts?: (partUrls: string[], musicId?: string, voiceoverOptions?: {
    text: string;
    mode: 'exact' | 'ai_generate';
    voice: string;
  }) => Promise<void>;
  isStitching?: boolean;
  stitchedVideoUrl?: string | null;
  selectedMusicId?: string;
  musicTracks?: Array<{ id: string; name: string }>;
  onGoToNextPart?: (targetPartNumber?: number) => void;
  onGenerateFullSequence?: () => void;
  onClearSeriesVault?: () => void;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  edl,
  onRender,
  isRendering,
  renderProgress,
  renderedVideoUrl,
  seriesParts = [],
  onAddSeriesPart,
  onRemoveSeriesPart,
  onStitchParts,
  isStitching = false,
  stitchedVideoUrl = null,
  selectedMusicId = '',
  musicTracks = [],
  onGoToNextPart,
  onGenerateFullSequence,
  onClearSeriesVault
}) => {
  const singleVideoRef = useRef<HTMLVideoElement | null>(null);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);

  const [stitchMusicChoice, setStitchMusicChoice] = useState<string>('preserve');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(renderedVideoUrl);

  const [renderedList, setRenderedList] = useState<Array<{
    filename: string;
    url: string;
    title: string;
    badge: string;
    duration?: number | null;
    sizeMb: string;
    createdAt: number;
    timeString: string;
    dateString: string;
  }>>([]);

  const fetchRenders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/renders`);
      if (res.ok) {
        const data = await res.json();
        if (data.renders && data.renders.length > 0) {
          const list = data.renders.map((r: any) => ({
            ...r,
            url: normalizeUrl(r.url)
          }));
          setRenderedList(list);
          setActiveVideoUrl((prev) => prev || list[0].url);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchRenders();
  }, [renderedVideoUrl, activeVideoUrl]);

  const handleDeleteRender = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/renders/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRenders();
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (renderedVideoUrl) setActiveVideoUrl(renderedVideoUrl);
  }, [renderedVideoUrl]);

  const getDownloadUrl = (url?: string | null, customName?: string) => {
    if (!url) return undefined;
    const filename = url.split('/').pop()?.split('?')[0] || 'video.mp4';
    const nameParam = customName ? `&name=${encodeURIComponent(customName)}` : '';
    return `${API_BASE}/api/download?file=${encodeURIComponent(filename)}${nameParam}`;
  };

  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState(false);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [isAddingVoiceover, setIsAddingVoiceover] = useState(false);
  const [voiceoverSuccess, setVoiceoverSuccess] = useState('');

  // Selected Music & Voice for Salvage / Remixing
  const [salvageMusicChoice, setSalvageMusicChoice] = useState<string>('acoustic_warm_groove.mp3');
  const [salvageVoiceChoice, setSalvageVoiceChoice] = useState<string>('flux-wade-en');

  // Master Stitched Video Voiceover State
  const [activeStitchedVideoUrl, setActiveStitchedVideoUrl] = useState<string | null>(stitchedVideoUrl);

  useEffect(() => {
    if (stitchedVideoUrl) setActiveStitchedVideoUrl(stitchedVideoUrl);
  }, [stitchedVideoUrl]);
  const [isMasterVoiceoverOpen, setIsMasterVoiceoverOpen] = useState(false);
  const [masterVoiceoverText, setMasterVoiceoverText] = useState('');
  const [isAddingMasterVoiceover, setIsAddingMasterVoiceover] = useState(false);
  const [masterVoiceoverSuccess, setMasterVoiceoverSuccess] = useState('');

  // Pre-Stitch Master Voiceover Configuration (Under Background Alignment Tool)
  const [isStitchVoiceoverOpen, setIsStitchVoiceoverOpen] = useState(true);
  const [stitchVoiceoverMode, setStitchVoiceoverMode] = useState<'exact' | 'ai_generate'>('exact');
  const [stitchVoiceoverInput, setStitchVoiceoverInput] = useState('');
  const [stitchVoicePersona, setStitchVoicePersona] = useState('flux-wade-en');
  const [isGeneratingAiScript, setIsGeneratingAiScript] = useState(false);
  const [aiScriptStatus, setAiScriptStatus] = useState('');

  const handleGenerateAiMasterScript = async () => {
    if (!stitchVoiceoverInput.trim()) {
      alert('Please enter prompt notes for the AI script generator.');
      return;
    }
    setIsGeneratingAiScript(true);
    setAiScriptStatus('');
    try {
      const res = await fetch(`${API_BASE}/api/generate-master-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: stitchVoiceoverInput.trim(),
          totalDuration: totalVaultDuration || 60,
          partsCount: seriesParts.length || 4,
          geminiKey: typeof window !== 'undefined' ? (localStorage.getItem('GEMINI_API_KEY') || '') : ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate script');
      if (data.script) {
        setStitchVoiceoverInput(data.script);
        setAiScriptStatus('✓ Full master narration generated! You can edit or stitch now.');
      }
    } catch (err: any) {
      alert(`AI Script Error: ${err.message}`);
    } finally {
      setIsGeneratingAiScript(false);
    }
  };

  useEffect(() => {
    setActiveVideoUrl(renderedVideoUrl);
    if (edl && edl.clips && edl.clips.length > 0) {
      setVoiceoverText(edl.clips.map((c) => c.beatText).join(' '));
    }
  }, [renderedVideoUrl, edl]);

  useEffect(() => {
    setActiveStitchedVideoUrl(stitchedVideoUrl);
    const defaultScript = `Welcome to Krechet Academy. Instead of outdated theory, our students learn by executing live digital marketing campaigns with real clients and modern AI workflows. Build your portfolio, master practical automation, and future-proof your career today.`;
    if (seriesParts.length > 0 && !masterVoiceoverText) {
      setMasterVoiceoverText(defaultScript);
    }
    if (seriesParts.length > 0 && !stitchVoiceoverInput) {
      setStitchVoiceoverInput(defaultScript);
    }
  }, [stitchedVideoUrl, seriesParts]);

  const handleAddMasterVoiceover = async (onlyMusic = false) => {
    const targetUrl = activeStitchedVideoUrl || stitchedVideoUrl;
    if (!targetUrl) return;
    if (!onlyMusic && !masterVoiceoverText.trim()) {
      alert('Please enter voiceover narration text to speak, or click "Swap Music Only".');
      return;
    }

    setIsAddingMasterVoiceover(true);
    setMasterVoiceoverSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/add-voiceover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: targetUrl,
          voiceoverText: onlyMusic ? '' : masterVoiceoverText.trim(),
          selectedVoice: salvageVoiceChoice,
          selectedMusicId: salvageMusicChoice
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update audio');

      setActiveStitchedVideoUrl(normalizeUrl(data.videoUrl));
      setMasterVoiceoverSuccess(onlyMusic ? '✓ Background music track updated successfully!' : '✓ Real voiceover & music attached to Master Video successfully!');
      setTimeout(() => {
        setIsMasterVoiceoverOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(`Error updating audio: ${err.message}`);
    } finally {
      setIsAddingMasterVoiceover(false);
    }
  };

  const handleAddVoiceover = async (onlyMusic = false) => {
    if (!activeVideoUrl) return;
    if (!onlyMusic && !voiceoverText.trim()) {
      alert('Please enter voiceover narration text to speak, or click "Swap Music Only".');
      return;
    }

    setIsAddingVoiceover(true);
    setVoiceoverSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/add-voiceover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: activeVideoUrl,
          voiceoverText: onlyMusic ? '' : voiceoverText.trim(),
          selectedVoice: salvageVoiceChoice,
          selectedMusicId: salvageMusicChoice
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update audio');

      setActiveVideoUrl(normalizeUrl(data.videoUrl));
      setVoiceoverSuccess(onlyMusic ? '✓ Background music track updated successfully!' : '✓ Real voiceover attached and video salvaged successfully!');
      setTimeout(() => {
        setIsVoiceoverModalOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(`Error updating audio: ${err.message}`);
    } finally {
      setIsAddingVoiceover(false);
    }
  };

  // If no EDL, no series parts in vault, and no rendered video, don't show timeline
  if (!edl && seriesParts.length === 0 && !renderedVideoUrl && !activeVideoUrl) return null;

  const isAlreadyInVault = !!(
    renderedVideoUrl &&
    seriesParts.some((p) => p.videoUrl === renderedVideoUrl)
  );

  const totalVaultDuration = seriesParts.reduce((acc, p) => acc + (p.duration || 0), 0);

  const handleStitch = () => {
    if (!onStitchParts || seriesParts.length < 2) return;
    const urls = seriesParts.map((p) => p.videoUrl);
    const musicParam = stitchMusicChoice === 'preserve' ? 'none' : stitchMusicChoice;
    onStitchParts(urls, musicParam, {
      text: stitchVoiceoverInput.trim(),
      mode: stitchVoiceoverMode,
      voice: stitchVoicePersona
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      marginTop: '1.5rem'
    }}>
      {/* 1. Master Timeline Storyboard or Rendered Video Preview */}
      {(edl || activeVideoUrl || renderedVideoUrl) && (
        <div style={{
          background: '#121217',
          border: '1px solid #23232f',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎞️ {edl ? 'Master Timeline & Edit Decision List' : 'Rendered Master Video & Interactive Edit Console'}
                </h3>
                {edl?.partInfo && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    fontWeight: 700
                  }}>
                    🎬 {edl.partInfo.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {edl ? `${edl.clips.length} scenes synchronized to voiceover • Part runtime: ~${edl.totalDuration.toFixed(1)}s` : 'Review your video, mark exact timestamps, and point out edits below'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {edl && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontWeight: 600
                }}>
                  Voice: {edl.selectedVoice}
                </span>
              )}
              {edl?.musicTrack && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  color: '#f472b6',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  fontWeight: 600
                }}>
                  Music: Ducked
                </span>
              )}
            </div>
          </div>

          {/* Rendered Video Player (If finished) */}
          {(activeVideoUrl || renderedVideoUrl) && (
            <div style={{
              background: '#090a0f',
              border: '2px solid #818cf8',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              {/* 🎞️ All Created Videos History & Switcher Gallery */}
              {renderedList.length > 0 && (
                <div style={{
                  background: '#13141f',
                  border: '1px solid #2d2d42',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎞️</span> Created Videos Gallery ({renderedList.length} Available)
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Switch between your CapCut master demo, re-mastered takes, and agent versions below:
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#1e1e2f', color: '#818cf8', padding: '3px 8px', borderRadius: '5px', fontWeight: 600 }}>
                      ⚡ 1-Click Version Switcher
                    </span>
                  </div>

                  {/* Video Cards Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {renderedList.map((item, idx) => {
                      const currentFile = (activeVideoUrl || renderedVideoUrl)?.split('/').pop()?.split('?')[0];
                      const isActive = currentFile === item.filename;
                      return (
                        <div
                          key={item.filename || idx}
                          onClick={() => setActiveVideoUrl(item.url)}
                          style={{
                            background: isActive ? 'rgba(99, 102, 241, 0.16)' : '#181926',
                            border: isActive ? '2px solid #818cf8' : '1px solid #28283c',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease',
                            boxShadow: isActive ? '0 0 16px rgba(129, 140, 248, 0.25)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.borderColor = '#4f46e5';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.borderColor = '#28283c';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: item.badge.includes('Master') ? '#10b981' : '#6366f1',
                              color: '#ffffff'
                            }}>
                              {item.badge}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              ⏱️ {item.duration ? `${item.duration}s` : ''} • {item.sizeMb}MB
                            </span>
                          </div>

                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#c7d2fe' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.title}
                          </div>

                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📅 {item.dateString} at {item.timeString}</span>
                            {isActive ? (
                              <span style={{ color: '#4ade80', fontWeight: 700 }}>▶ Playing in Player</span>
                            ) : (
                              <span style={{ color: '#818cf8', fontWeight: 600 }}>Click to Load ➔</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', justifyContent: 'flex-end' }}>
                            <a
                              href={getDownloadUrl(item.filename, item.filename)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: '0.68rem',
                                color: '#a5b4fc',
                                textDecoration: 'none',
                                background: '#242438',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: '1px solid #373752'
                              }}
                            >
                              ⬇️ Download
                            </a>
                            {renderedList.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRender(item.filename, e)}
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#f87171',
                                  background: '#241a22',
                                  border: '1px solid #451a22',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Delete render"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h4 style={{ margin: '0 0 0.75rem 0', color: '#818cf8', fontSize: '1.1rem' }}>
                🎉 Rendered Video Ready {edl?.partInfo ? `(${edl.partInfo.label})` : ''}!
              </h4>
              <video
                ref={singleVideoRef}
                key={activeVideoUrl || renderedVideoUrl}
                src={activeVideoUrl || renderedVideoUrl || undefined}
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: '420px',
                  borderRadius: '8px',
                  background: '#000',
                  display: 'block',
                  margin: '0 auto 0.75rem auto'
                }}
              />

              {/* Audio / Voiceover Notice Alert Banner */}
              <div style={{
                margin: '0 auto 1.25rem auto',
                maxWidth: '680px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                fontSize: '0.82rem',
                color: '#e9d5ff'
              }}>
                <span>
                  🎙️ <strong>Video has no sound or need custom narration?</strong> Click <strong>"🎙️ Salvage Video: Add / Replace Voiceover"</strong> below to attach real voice in ~1s without re-rendering!
                </span>
                <button
                  type="button"
                  onClick={() => setIsVoiceoverModalOpen(true)}
                  style={{
                    background: '#a855f7',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Open Voiceover Tool
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={getDownloadUrl(activeVideoUrl || renderedVideoUrl, `${edl?.partInfo ? edl.partInfo.label.replace(/\s+/g, '_').toLowerCase() : 'krechet_master_video'}.mp4`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  ⬇️ Download This Video (MP4)
                </a>

                {/* 🎙️ Add / Replace Voiceover Button to Salvage Video */}
                <button
                  id="single-voiceover-button"
                  type="button"
                  onClick={() => setIsVoiceoverModalOpen(!isVoiceoverModalOpen)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.45)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🎙️</span> {isVoiceoverModalOpen ? '▲ Close Voiceover Tool' : '🎙️ Salvage Video: Add / Replace Voiceover'}
                </button>

                {edl && onAddSeriesPart && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddSeriesPart({
                        label: edl.partInfo?.label || `Part ${seriesParts.length + 1}`,
                        videoUrl: renderedVideoUrl,
                        duration: edl.totalDuration,
                        partNumber: edl.partInfo?.partNumber || seriesParts.length + 1,
                        videoNumber: edl.partInfo?.videoNumber || 1,
                        createdAt: Date.now()
                      });
                    }}
                    disabled={isAlreadyInVault}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      background: isAlreadyInVault
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: isAlreadyInVault ? '#a5b4fc' : '#ffffff',
                      border: isAlreadyInVault ? '1px solid #6366f1' : 'none',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: isAlreadyInVault ? 'default' : 'pointer',
                      boxShadow: isAlreadyInVault ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    {isAlreadyInVault ? (
                      <>
                        <span>✓</span>
                        Saved in Series Vault
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Save as [{edl.partInfo?.label || `Part ${seriesParts.length + 1}`}] in Series Vault
                      </>
                    )}
                  </button>
                )}

                {/* Continue to Next Part Direct Trigger */}
                {edl && onGoToNextPart && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAlreadyInVault && onAddSeriesPart) {
                        onAddSeriesPart({
                          label: edl.partInfo?.label || `Part ${seriesParts.length + 1}`,
                          videoUrl: activeVideoUrl || renderedVideoUrl,
                          duration: edl.totalDuration,
                          partNumber: edl.partInfo?.partNumber || seriesParts.length + 1,
                          videoNumber: edl.partInfo?.videoNumber || 1,
                          createdAt: Date.now()
                        });
                      }
                      onGoToNextPart(seriesParts.length + 1);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0px)')}
                  >
                    <span>🎬</span>
                    Create Part {seriesParts.length + 1} Next ➔
                  </button>
                )}
              </div>

              {/* Voiceover Salvage Drawer */}
              {isVoiceoverModalOpen && (
                <div style={{
                  width: '100%',
                  marginTop: '1.25rem',
                  background: '#12121c',
                  border: '1px solid #4f46e5',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🎙️</span> Salvage Video: Add / Replace Spoken Voiceover
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Muxes real spoken voice narration directly onto this video in ~1s without re-encoding!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVoiceoverModalOpen(false)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      ✕
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="Type or paste the narration you want spoken out loud over this video..."
                    value={voiceoverText}
                    onChange={(e) => setVoiceoverText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #6366f1',
                      background: '#181824',
                      color: '#f8fafc',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      lineHeight: '1.4'
                    }}
                  />

                  {/* Audio Controls: Voice Persona & Background Music */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '0.75rem',
                    background: '#181826',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #312e52'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.25rem' }}>
                        🎵 Background Music Track:
                      </label>
                      <select
                        value={salvageMusicChoice}
                        onChange={(e) => setSalvageMusicChoice(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0d0d16',
                          border: '1px solid #4338ca',
                          color: '#f8fafc',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="acoustic_warm_groove.mp3">🎸 Acoustic Warm Groove (Redwood Trail - Guitar & Beat)</option>
                        <option value="cycles_upbeat_inspiration.mp3">⚡ Cycles Upbeat Inspiration (Modern Uplifting Beat)</option>
                        <option value="serenity_chill_ambient.mp3">🌿 Serenity Chill Ambient (Peaceful Acoustic Flow)</option>
                        <option value="snappy_commercial_beat.mp3">🥁 Snappy Commercial Beat (Fun Bouncy Groove)</option>
                        <option value="none">🔇 Mute Background Music (Voice Only)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.25rem' }}>
                        🎙️ Spoken Voice Persona:
                      </label>
                      <select
                        value={salvageVoiceChoice}
                        onChange={(e) => setSalvageVoiceChoice(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0d0d16',
                          border: '1px solid #4338ca',
                          color: '#f8fafc',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="flux-wade-en">🎙️ Deepgram Wade (Natural Conversational Male - Recommended)</option>
                        <option value="aura-orion-en">🎙️ Aura Orion (Confident Male - Deep & Authoritative)</option>
                        <option value="aura-luna-en">🎙️ Aura Luna (Professional Female - Calm & Clear)</option>
                        <option value="aura-asteria-en">🎙️ Aura Asteria (Warm Narrative Female)</option>
                        <option value="aura-arcass-en">🎙️ Aura Arcass (Direct Energetic Male)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleAddVoiceover(true)}
                      disabled={isAddingVoiceover}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        background: '#1e1e2e',
                        border: '1px solid #4338ca',
                        color: '#c7d2fe',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: isAddingVoiceover ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>🎵</span> Swap Music Track Only (1-Sec)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddVoiceover(false)}
                      disabled={isAddingVoiceover || !voiceoverText.trim()}
                      style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: isAddingVoiceover || !voiceoverText.trim() ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {isAddingVoiceover ? (
                        <>
                          <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                          Applying Audio...
                        </>
                      ) : (
                        <>
                          <span>⚡</span> Attach Voiceover + Music (1-Sec)
                        </>
                      )}
                    </button>
                  </div>

                  {voiceoverSuccess && (
                    <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700, marginTop: '0.25rem' }}>
                      {voiceoverSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* 🎯 Timestamped Edit Director & Feedback Console */}
              <TimestampedEditConsole
                videoRef={singleVideoRef}
                videoUrl={activeVideoUrl || renderedVideoUrl || ''}
                onVideoUpdated={(newUrl) => {
                  setActiveVideoUrl(newUrl);
                }}
                selectedVoice={salvageVoiceChoice}
                selectedMusicId={salvageMusicChoice}
              />
            </div>
          )}

          {/* Storyboard Beats Grid */}
          {edl?.clips && edl.clips.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.85rem'
            }}>
              {edl.clips.map((clip, idx) => {
              const role = getBlockRole({ title: clip.title, description: clip.beatText });
              return (
                <div
                  key={idx}
                  style={{
                    background: '#181824',
                    border: `1px solid ${role.badgeBorder || '#28283a'}`,
                    borderRadius: '10px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {/* Beat Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                        SCENE #{idx + 1}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: role.badgeBg,
                        color: role.badgeColor,
                        border: `1px solid ${role.badgeBorder}`
                      }}>
                        {role.icon} {role.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: '#090a0f', padding: '2px 6px', borderRadius: '4px' }}>
                      {clip.duration.toFixed(1)}s ({clip.in.toFixed(1)}s - {clip.out.toFixed(1)}s)
                    </span>
                  </div>

                {/* Voiceover Line */}
                <p style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  color: '#f8fafc',
                  fontStyle: 'italic',
                  background: 'rgba(99, 102, 241, 0.06)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #6366f1',
                  lineHeight: '1.4'
                }}>
                  "{clip.beatText}"
                </p>

                {/* Assigned Clip */}
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  📹 <strong>Asset:</strong> {clip.title}
                </div>

                {/* Effects badges */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.25rem' }}>
                  {clip.speed && clip.speed > 1.0 && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                      ⚡ {clip.speed}x Speed
                    </span>
                  )}
                  {clip.effects?.spotlight && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      🎯 Spotlight
                    </span>
                  )}
                  {clip.effects?.zoom && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                      🔍 Focus Zoom
                    </span>
                  )}
                  {clip.effects?.lighting && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                      💡 Balanced Eq
                    </span>
                  )}
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: '#0f172a', color: '#64748b' }}>
                    Cut: {clip.transition}
                  </span>
                </div>
              </div>
            );})}
          </div>
        )}

          {/* Render Action Button */}
          {edl && (
            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onRender}
                disabled={isRendering}
                style={{
                  padding: '0.85rem 2.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isRendering
                    ? '#334155'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: isRendering ? 'not-allowed' : 'pointer',
                  boxShadow: isRendering ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                {isRendering ? (
                  <>
                    <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                    {renderProgress || 'Rendering Video with FFmpeg...'}
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Render {edl?.partInfo ? `${edl.partInfo.label}` : 'Master MP4'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Episodic Series & Multi-Part Vault Section */}
      <div style={{
        background: 'linear-gradient(145deg, #12121c 0%, #171424 100%)',
        border: '1px solid #3b3658',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Vault Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🎬</span> Episodic Series & Multi-Part Vault
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#a5b4fc' }}>
              Assemble multiple ~20s episode videos into a cohesive 45s-60s+ full-length master film
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onGenerateFullSequence && (
              <button
                type="button"
                onClick={onGenerateFullSequence}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>⚡</span> Generate Full Sequence
              </button>
            )}
            <span style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#c7d2fe',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontWeight: 700
            }}>
              {seriesParts.length} {seriesParts.length === 1 ? 'Part' : 'Parts'} in Vault
            </span>
            {totalVaultDuration > 0 && (
              <span style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 700
              }}>
                Total Runtime: ~{totalVaultDuration.toFixed(1)}s
              </span>
            )}
            {seriesParts.length > 0 && onClearSeriesVault && (
              <button
                type="button"
                onClick={onClearSeriesVault}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Clear all stored episodes from Series Vault"
              >
                🗑️ Clear Vault & Reset
              </button>
            )}
          </div>
        </div>

        {/* Narrative & Agent Alignment Guide */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.07)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px',
          padding: '0.9rem 1.1rem',
          fontSize: '0.84rem',
          color: '#cbd5e1',
          lineHeight: '1.5'
        }}>
          💡 <strong>How to Direct Multi-Part Videos:</strong>
          <span style={{ display: 'block', marginTop: '0.25rem', color: '#94a3b8' }}>
            Add tags like <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>[Part 1]</code>, <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>Part 1. Video 1</code>, or <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>p1.v1</code> / <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>p2.v1</code> to your prompts.
            The agents automatically align voice persona, snappy 1.25x tempo, and background music so each chapter flows naturally without contrasting styles. Render each part, save it to this vault, and click <strong>Stitch Parts</strong> to generate your final full-length master video!
          </span>
        </div>

        {/* Parts Cards List */}
        {seriesParts.length === 0 ? (
          <div style={{
            background: '#090a0f',
            border: '1px dashed #334155',
            borderRadius: '12px',
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🗃️</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
              Series Vault is Empty
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Render a video part above and click "Save as Part in Series Vault" to queue it here.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            {seriesParts.map((part, index) => (
              <div
                key={part.id}
                style={{
                  background: '#0b0c13',
                  border: '1px solid #2d2b45',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#6366f1',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '5px'
                    }}>
                      EP #{index + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {part.label}
                    </span>
                  </div>
                  {onRemoveSeriesPart && (
                    <button
                      type="button"
                      onClick={() => onRemoveSeriesPart(part.id)}
                      title="Remove from vault"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '2px 4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Inline Video Player Preview */}
                <video
                  src={part.videoUrl}
                  controls
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    background: '#000',
                    objectFit: 'contain'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Duration: ~{part.duration.toFixed(1)}s</span>
                  <a
                    href={getDownloadUrl(part.videoUrl, `${part.label.replace(/\s+/g, '_').toLowerCase()}.mp4`)}
                    style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Download Clip
                  </a>
                </div>
              </div>
            ))}

            {/* Next Episode Slot Prompt Card */}
            {onGoToNextPart && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.04)',
                  border: '2px dashed rgba(99, 102, 241, 0.4)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '0.65rem',
                  minHeight: '220px'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 700
                }}>
                  +
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Part {seriesParts.length + 1}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem', maxWidth: '190px' }}>
                    Direct next scene or chapter to stitch with EP #{seriesParts.length}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToNextPart(seriesParts.length + 1)}
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0px)')}
                >
                  <span>🎬</span> Direct Part {seriesParts.length + 1} ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stitching Controls & Music Option */}
        {seriesParts.length > 0 && (
          <div style={{
            background: '#090a0f',
            borderRadius: '12px',
            border: '1px solid #232238',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.2rem' }}>
                  🎵 Background Music Alignment for Master Film:
                </label>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Choose whether to keep original ducked audio per clip or lay a continuous master track
                </span>
              </div>

              <select
                value={stitchMusicChoice}
                onChange={(e) => setStitchMusicChoice(e.target.value)}
                style={{
                  background: '#181824',
                  border: '1px solid #3b3955',
                  color: '#f8fafc',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="none">🔇 No Background Music (Voiceover Only)</option>
                <option value="serenity_chill_ambient.mp3">🌿 Chill Ambient Sound (Soft & Calm)</option>
                <option value="cycles_upbeat_inspiration.mp3">⚡ Modern Tech Beat (Electronic / Inspiring)</option>
                <option value="snappy_commercial_beat.mp3">🥁 Snappy Commercial Beat</option>
                <option value="acoustic_warm_groove.mp3">🎸 Acoustic Guitar Groove (Bluegrass)</option>
                <option value="preserve">Keep each part's original ducked audio</option>
              </select>
            </div>

            {/* 🎙️ Master Series Voiceover & Narration Script Section (Right under background alignment) */}
            <div style={{
              background: '#12121d',
              border: '1px solid #3d3b5e',
              borderRadius: '10px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>🎙️</span> Master Film Voiceover & Narration Script
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Spreads narration smoothly across all {seriesParts.length} scenes, or specifically by [Scene 1], [Scene 2]
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStitchVoiceoverOpen(!isStitchVoiceoverOpen)}
                  style={{
                    background: isStitchVoiceoverOpen ? '#27263d' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 1.1rem',
                    borderRadius: '7px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: isStitchVoiceoverOpen ? 'none' : '0 2px 10px rgba(168, 85, 247, 0.35)'
                  }}
                >
                  <span>🎙️</span> {isStitchVoiceoverOpen ? 'Hide Voice Script Box' : 'Add Voice Script to Master Video'}
                </button>
              </div>

              {isStitchVoiceoverOpen && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid #232238'
                }}>
                  {/* Choice: Exact Script vs AI Generated */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1' }}>
                      Narration Mode:
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: stitchVoiceoverMode === 'exact' ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontWeight: stitchVoiceoverMode === 'exact' ? 700 : 500 }}>
                      <input
                        type="radio"
                        name="stitchVoiceoverMode"
                        checked={stitchVoiceoverMode === 'exact'}
                        onChange={() => setStitchVoiceoverMode('exact')}
                      />
                      🔘 Use My Exact Script (Verbatim across scenes)
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: stitchVoiceoverMode === 'ai_generate' ? '#f472b6' : '#94a3b8', cursor: 'pointer', fontWeight: stitchVoiceoverMode === 'ai_generate' ? 700 : 500 }}>
                      <input
                        type="radio"
                        name="stitchVoiceoverMode"
                        checked={stitchVoiceoverMode === 'ai_generate'}
                        onChange={() => setStitchVoiceoverMode('ai_generate')}
                      />
                      ✨ Have Agents Create Script from My Input
                    </label>
                  </div>

                  {/* Input Box */}
                  <textarea
                    rows={4}
                    value={stitchVoiceoverInput}
                    onChange={(e) => setStitchVoiceoverInput(e.target.value)}
                    placeholder={stitchVoiceoverMode === 'exact'
                      ? 'Type or paste the exact narration script to be spoken across the master film. Write continuous narration to spread smoothly, or prefix with [Scene 1], [Scene 2]... for scene-specific timing.'
                      : 'Type your notes or prompt here, then click "Generate Script with Agents" to preview, or stitch directly...'
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #6366f1',
                      background: '#181826',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      lineHeight: '1.45'
                    }}
                  />

                  {/* Controls: Persona + AI Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
                        Voice Persona:
                      </label>
                      <select
                        value={stitchVoicePersona}
                        onChange={(e) => setStitchVoicePersona(e.target.value)}
                        style={{
                          background: '#181826',
                          border: '1px solid #4338ca',
                          color: '#f8fafc',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          outline: 'none'
                        }}
                      >
                        <option value="flux-wade-en">🎙️ Deepgram Wade (Natural Conversational Male - Recommended)</option>
                        <option value="aura-orion-en">🎙️ Aura Orion (Confident Male)</option>
                        <option value="aura-luna-en">🎙️ Aura Luna (Professional Female)</option>
                        <option value="aura-asteria-en">🎙️ Aura Asteria (Warm Narrative Female)</option>
                        <option value="aura-arcass-en">🎙️ Aura Arcass (Direct Energetic Male)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setStitchVoiceoverInput(
                            'Welcome to Krechet Academy. Instead of outdated theory, our students learn by executing live digital marketing campaigns with real clients and modern AI workflows. Build your portfolio, master practical automation, and future-proof your career today.'
                          );
                        }}
                        style={{
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#c7d2fe',
                          border: '1px solid #6366f1',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Load verified Krechet Academy narration"
                      >
                        📝 Load Krechet Script
                      </button>
                    </div>

                    {stitchVoiceoverMode === 'ai_generate' && (
                      <button
                        type="button"
                        onClick={handleGenerateAiMasterScript}
                        disabled={isGeneratingAiScript || !stitchVoiceoverInput.trim()}
                        style={{
                          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.45rem 1.1rem',
                          borderRadius: '7px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: isGeneratingAiScript || !stitchVoiceoverInput.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 2px 8px rgba(236, 72, 153, 0.35)'
                        }}
                      >
                        {isGeneratingAiScript ? '⏳ Generating Script...' : '✨ Generate & Preview Script with Agents'}
                      </button>
                    )}
                  </div>

                  {/* Direct Action Buttons Right Inside the Script Box */}
                  <div style={{
                    marginTop: '0.4rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed #332d52',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    {(activeStitchedVideoUrl || stitchedVideoUrl) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!stitchVoiceoverInput.trim()) {
                            alert('Please enter or generate a voiceover script first.');
                            return;
                          }
                          setMasterVoiceoverText(stitchVoiceoverInput.trim());
                          setSalvageVoiceChoice(stitchVoicePersona);
                          // Trigger master video update directly
                          const targetUrl = activeStitchedVideoUrl || stitchedVideoUrl;
                          if (!targetUrl) return;
                          setIsAddingMasterVoiceover(true);
                          setAiScriptStatus('⏳ Synthesizing voice & attaching to master video...');
                          try {
                            const res = await fetch(`${API_BASE}/api/add-voiceover`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                videoUrl: targetUrl,
                                voiceoverText: stitchVoiceoverInput.trim(),
                                selectedVoice: stitchVoicePersona,
                                selectedMusicId: stitchMusicChoice === 'preserve' ? 'acoustic_warm_groove.mp3' : stitchMusicChoice
                              })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to apply voiceover');
                            setActiveStitchedVideoUrl(normalizeUrl(data.videoUrl));
                            setAiScriptStatus('✓ Real voiceover attached to Master Video successfully! Scroll down to listen.');
                          } catch (err: any) {
                            alert(`Error: ${err.message}`);
                          } finally {
                            setIsAddingMasterVoiceover(false);
                          }
                        }}
                        disabled={isAddingMasterVoiceover || !stitchVoiceoverInput.trim()}
                        style={{
                          padding: '0.65rem 1.4rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          cursor: isAddingMasterVoiceover || !stitchVoiceoverInput.trim() ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem'
                        }}
                      >
                        {isAddingMasterVoiceover ? (
                          <>
                            <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                            Attaching Voiceover to Master Film...
                          </>
                        ) : (
                          <>
                            <span>⚡</span> Apply Script to Master Video (1-Sec)
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStitch}
                      disabled={seriesParts.length < 2 || isStitching}
                      style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: '8px',
                        background: seriesParts.length < 2
                          ? '#334155'
                          : isStitching
                          ? '#475569'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: seriesParts.length < 2 || isStitching ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}
                    >
                      {isStitching ? (
                        <>
                          <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                          Stitching & Applying Voiceover...
                        </>
                      ) : (
                        <>
                          <span>🧵</span> Stitch All {seriesParts.length} Parts + Apply This Script
                        </>
                      )}
                    </button>
                  </div>

                  {aiScriptStatus && (
                    <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                      {aiScriptStatus}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stitch Button */}
            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleStitch}
                disabled={seriesParts.length < 2 || isStitching}
                style={{
                  padding: '0.9rem 2.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: seriesParts.length < 2
                    ? '#334155'
                    : isStitching
                    ? '#475569'
                    : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  cursor: seriesParts.length < 2 || isStitching ? 'not-allowed' : 'pointer',
                  boxShadow: seriesParts.length < 2 || isStitching ? 'none' : '0 6px 25px rgba(236, 72, 153, 0.4)',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                {isStitching ? (
                  <>
                    <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                    Stitching {seriesParts.length} Parts with FFmpeg...
                  </>
                ) : seriesParts.length < 2 ? (
                  <>
                    <span>🧵</span>
                    Need at least 2 parts to stitch ({seriesParts.length} / 2 loaded)
                  </>
                ) : (
                  <>
                    <span>🧵</span>
                    Stitch {seriesParts.length} Parts into Master Full-Length Video (~{totalVaultDuration.toFixed(1)}s)
                  </>
                )}
              </button>

              {seriesParts.length === 1 && onGoToNextPart && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => onGoToNextPart(2)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)')}
                  >
                    <span>🎬</span> Click here to direct Part 2 & unlock full-length stitching ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stitched Master Video Player */}
        {stitchedVideoUrl && (
          <div style={{
            background: 'linear-gradient(180deg, #090a0f 0%, #131221 100%)',
            border: '2px solid #ec4899',
            borderRadius: '14px',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(236, 72, 153, 0.3)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👑</span>
              <h4 style={{ margin: 0, color: '#f472b6', fontSize: '1.25rem', fontWeight: 800 }}>
                Master Full-Length Video Ready!
              </h4>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              All {seriesParts.length} parts stitched seamlessly into a master 1080p feature video (~{totalVaultDuration.toFixed(1)}s)
            </p>

            <video
              ref={masterVideoRef}
              key={activeStitchedVideoUrl || stitchedVideoUrl}
              src={activeStitchedVideoUrl || stitchedVideoUrl || undefined}
              controls
              autoPlay
              style={{
                width: '100%',
                maxHeight: '440px',
                borderRadius: '10px',
                background: '#000',
                display: 'block',
                margin: '0 auto 0.75rem auto'
              }}
            />

            {/* Audio / Voiceover Notice Alert Banner */}
            <div
              id="master-voiceover-banner"
              style={{
                margin: '0 auto 1.25rem auto',
                maxWidth: '680px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                fontSize: '0.84rem',
                color: '#e9d5ff'
              }}
            >
              <span>
                🎙️ <strong>Master video silent or need custom speech?</strong> Click <strong>"🎙️ Salvage Video: Add / Replace Voiceover"</strong> to attach spoken audio in ~1s without re-rendering!
              </span>
              <button
                type="button"
                onClick={() => setIsMasterVoiceoverOpen(true)}
                style={{
                  background: '#a855f7',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Open Voiceover Tool
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={getDownloadUrl(activeStitchedVideoUrl || stitchedVideoUrl, 'krechet_master_full_length.mp4')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 2rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)'
                }}
              >
                <span>⬇️</span> Download Master Full-Length MP4 (~{totalVaultDuration.toFixed(1)}s)
              </a>

              {/* 🎙️ Add / Replace Voiceover on Master Video */}
              <button
                id="master-voiceover-button"
                type="button"
                onClick={() => setIsMasterVoiceoverOpen(!isMasterVoiceoverOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1.6rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(168, 85, 247, 0.45)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🎙️</span> {isMasterVoiceoverOpen ? '▲ Close Voiceover Tool' : '🎙️ Salvage Video: Add / Replace Voiceover'}
              </button>
            </div>

            {/* Master Voiceover Salvage Drawer */}
            {isMasterVoiceoverOpen && (
              <div style={{
                marginTop: '1.25rem',
                background: '#0c0b14',
                border: '1px solid #a855f7',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🎙️</span> Add Spoken Voiceover Narration to Master Video
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Type or paste your narration below. We synthesize loud, crystal-clear speech and attach it to this ~{totalVaultDuration.toFixed(1)}s video in ~1 second!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMasterVoiceoverOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  rows={5}
                  placeholder="Paste or type the full narration script to be spoken over the master video..."
                  value={masterVoiceoverText}
                  onChange={(e) => setMasterVoiceoverText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #8b5cf6',
                    background: '#151422',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: '1.45'
                  }}
                />

                {/* Audio Controls: Voice Persona & Background Music */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  background: '#151426',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #4338ca'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.25rem' }}>
                      🎵 Background Music Track:
                    </label>
                    <select
                      value={salvageMusicChoice}
                      onChange={(e) => setSalvageMusicChoice(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0d0d16',
                        border: '1px solid #6366f1',
                        color: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="acoustic_warm_groove.mp3">🎸 Acoustic Warm Groove (Redwood Trail - Guitar & Beat)</option>
                      <option value="cycles_upbeat_inspiration.mp3">⚡ Cycles Upbeat Inspiration (Modern Uplifting Beat)</option>
                      <option value="serenity_chill_ambient.mp3">🌿 Serenity Chill Ambient (Peaceful Acoustic Flow)</option>
                      <option value="snappy_commercial_beat.mp3">🥁 Snappy Commercial Beat (Fun Bouncy Groove)</option>
                      <option value="none">🔇 Mute Background Music (Voice Only)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.25rem' }}>
                      🎙️ Spoken Voice Persona:
                    </label>
                    <select
                      value={salvageVoiceChoice}
                      onChange={(e) => setSalvageVoiceChoice(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0d0d16',
                        border: '1px solid #6366f1',
                        color: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="flux-wade-en">🎙️ Deepgram Wade (Natural Conversational Male - Recommended)</option>
                      <option value="aura-orion-en">🎙️ Aura Orion (Confident Male - Deep & Authoritative)</option>
                      <option value="aura-luna-en">🎙️ Aura Luna (Professional Female - Calm & Clear)</option>
                      <option value="aura-asteria-en">🎙️ Aura Asteria (Warm Narrative Female)</option>
                      <option value="aura-arcass-en">🎙️ Aura Arcass (Direct Energetic Male)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleAddMasterVoiceover(true)}
                    disabled={isAddingMasterVoiceover}
                    style={{
                      padding: '0.65rem 1.3rem',
                      borderRadius: '8px',
                      background: '#1e1e2e',
                      border: '1px solid #6366f1',
                      color: '#c7d2fe',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isAddingMasterVoiceover ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span>🎵</span> Swap Music Track Only (1-Sec)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddMasterVoiceover(false)}
                    disabled={isAddingMasterVoiceover || !masterVoiceoverText.trim()}
                    style={{
                      padding: '0.65rem 1.6rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: isAddingMasterVoiceover || !masterVoiceoverText.trim() ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isAddingMasterVoiceover ? (
                      <>
                        <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                        Synthesizing & Attaching Voiceover...
                      </>
                    ) : (
                      <>
                        <span>⚡</span> Salvage & Attach Voiceover to Master Film
                      </>
                    )}
                  </button>
                </div>

                {masterVoiceoverSuccess && (
                  <div style={{ fontSize: '0.84rem', color: '#34d399', fontWeight: 700, marginTop: '0.25rem' }}>
                    {masterVoiceoverSuccess}
                  </div>
                )}
              </div>
            )}

            {/* 🎯 Timestamped Edit Director & Feedback Console for Master Film */}
            <TimestampedEditConsole
              videoRef={masterVideoRef}
              videoUrl={activeStitchedVideoUrl || stitchedVideoUrl || ''}
              onVideoUpdated={(newUrl) => {
                setActiveStitchedVideoUrl(newUrl);
              }}
              selectedVoice={salvageVoiceChoice}
              selectedMusicId={salvageMusicChoice}
            />
          </div>
        )}
      </div>
    </div>
  );
};
