import React, { useState, useRef, useEffect } from 'react';
import { TimestampedEditConsole } from './TimestampedEditConsole';
import { SocialPublisherModal } from './SocialPublisherModal';
import { VoiceSelector } from './VoiceSelector';
import { ALL_DEEPGRAM_VOICES, VoiceOption } from '../constants/voices';

export interface CommercialScene {
  sceneNum: number;
  title: string;
  narration: string;
  visualType: 'omni_video' | 'software_simulation';
  visualPrompt: string;
  sourceAsset?: string | null;
  durationSec?: number;
}

export interface CommercialPlan {
  title: string;
  logline: string;
  targetDurationSeconds: number;
  scenes: CommercialScene[];
  outroText: string;
}

interface CommercialStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase?: string;
}

const PRESET_CONCEPTS = [
  {
    title: "100 Rejections to Hired",
    desc: "A candidate exhausted by 100 job rejections discovers practical simulation at Krechet Academy, manages real client crises, builds proof of work, and lands an agency job."
  },
  {
    title: "Mid-Week Client Havoc Call",
    desc: "A student managing Jenny's Artisan Java gets an unexpected panic call: CPC spiked 40% and sales cratered. They triage under pressure and save the account."
  },
  {
    title: "Proof Over Certificates",
    desc: "A recruiter reality-check: everyone has certificates, but employers only hire candidates who can manage real ad spend and prove it."
  }
];

export const CommercialStudioModal: React.FC<CommercialStudioModalProps> = ({
  isOpen,
  onClose,
  apiBase = 'http://localhost:3001'
}) => {
  const [goal, setGoal] = useState(PRESET_CONCEPTS[0].desc);
  const [targetDuration, setTargetDuration] = useState(60);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState('');
  const [plan, setPlan] = useState<CommercialPlan | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>(ALL_DEEPGRAM_VOICES);
  const [selectedVoice, setSelectedVoice] = useState('aura-angus-en');
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<string>('');
  const commercialVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isSocialOpen, setIsSocialOpen] = useState(false);

  // Automatically load voices and latest rendered commercial + storyboard when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${apiBase}/api/voices`)
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && data.voices.length > 0) {
          setVoices(data.voices);
        }
      })
      .catch(() => {});

    if (!renderedUrl) {
      fetch(`${apiBase}/api/commercial/latest`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.renderUrl) {
            setRenderedUrl(`${data.renderUrl}?t=${Date.now()}`);
            setRenderStatus(`Ready to play: ${data.filename} (${data.duration ? data.duration.toFixed(1) + 's' : ''})`);
            if (data.plan && !plan) {
              setPlan(data.plan);
            }
            if (data.voiceId) {
              setSelectedVoice(data.voiceId);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, apiBase, renderedUrl]);

  if (!isOpen) return null;

  const handleDraftPlan = async () => {
    setIsPlanning(true);
    setRenderedUrl(null);
    try {
      const res = await fetch(`${apiBase}/api/commercial/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, targetDuration })
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
      } else {
        alert(data.error || 'Failed to create plan');
      }
    } catch (err: any) {
      alert(`Error planning commercial: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleRefineWithAgent = async () => {
    if (!plan || !feedbackPrompt.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch(`${apiBase}/api/commercial/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPlan: plan, feedbackPrompt })
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        setFeedbackPrompt('');
      } else {
        alert(data.error || 'Failed to refine plan');
      }
    } catch (err: any) {
      alert(`Error refining plan: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleEmailVideo = () => {
    if (!renderedUrl) return;
    const fullUrl = renderedUrl.startsWith('http')
      ? renderedUrl
      : `${window.location.origin}${renderedUrl.startsWith('/') ? '' : '/'}${renderedUrl}`;

    const subject = encodeURIComponent('🎬 Raw Blocks AI Master Commercial Video (1080p)');
    const body = encodeURIComponent(`Here is the master commercial video produced in Raw Blocks AI Studio (Voiced by ${selectedVoice}):\n\n📥 Direct Video Link (Tap to Watch / Download):\n${fullUrl}\n\nProduced with Gemini Omni & Human Voiceover.`);

    if (navigator.share) {
      navigator.share({
        title: 'Raw Blocks AI Master Commercial',
        text: `Master Commercial Video (1080p Full HD)\n${fullUrl}`,
        url: fullUrl
      }).catch((e) => {
        if (e.name !== 'AbortError') window.location.href = `mailto:?subject=${subject}&body=${body}`;
      });
    } else {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const handleSceneChange = (idx: number, field: keyof CommercialScene, val: any) => {
    if (!plan) return;
    const updatedScenes = [...plan.scenes];
    updatedScenes[idx] = { ...updatedScenes[idx], [field]: val };
    setPlan({ ...plan, scenes: updatedScenes });
  };

  const handleDeleteScene = (idx: number) => {
    if (!plan) return;
    const updatedScenes = plan.scenes.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sceneNum: i + 1 }));
    setPlan({ ...plan, scenes: updatedScenes });
  };

  const handleAddScene = () => {
    if (!plan) return;
    const newScene: CommercialScene = {
      sceneNum: plan.scenes.length + 1,
      title: 'New Scene',
      narration: 'Write voiceover narration here...',
      visualType: 'software_simulation',
      visualPrompt: 'Live platform simulation workbench',
      sourceAsset: 'APP_UI_MarketSim_Home.png',
      durationSec: 3.5
    };
    setPlan({ ...plan, scenes: [...plan.scenes, newScene] });
  };

  const handleGenerateCommercial = async () => {
    if (!plan) return;
    setIsRendering(true);
    setRenderStatus('Initializing Gemini Omni Video & Audio Pipeline...');
    try {
      const res = await fetch(`${apiBase}/api/commercial/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          voiceId: selectedVoice,
          musicTrack: 'chill_tech_ambient.mp3'
        })
      });
      const data = await res.json();
      if (data.success && data.renderUrl) {
        const cleanUrl = data.renderUrl.startsWith('http')
          ? data.renderUrl
          : (data.renderUrl.startsWith('/storage/') ? data.renderUrl : `/storage${data.renderUrl}`);
        setRenderedUrl(cleanUrl);
        setRenderStatus(`Complete! Rendered in ${data.duration ? data.duration.toFixed(1) + 's' : ''}`);
      } else {
        alert(data.error || 'Failed to generate commercial');
        setRenderStatus('Generation failed');
      }
    } catch (err: any) {
      alert(`Production error: ${err.message}`);
      setRenderStatus('Production error occurred');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 5, 10, 0.88)',
      backdropFilter: 'blur(10px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        color: '#f8fafc',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#facc15', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🎬</span> Commercial Director AI <span style={{ fontSize: '12px', background: '#38bdf8', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>GEMINI OMNI POWERED</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Prompt the agent, inspect the scene storyboard, edit any script directly, and render broadcast-grade video blocks with zero desync.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Step 1: Base Goal & Presets */}
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Commercial Goal & Narrative Concept
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Length:</span>
                <select
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value={30}>30s (Social Teaser)</option>
                  <option value={45}>45s (Fast Paced)</option>
                  <option value={60}>60s (Standard Commercial)</option>
                  <option value={75}>75s (Deep Narrative)</option>
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what the commercial is about..."
              style={{
                width: '100%',
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />

            {/* Presets Chips */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Quick Presets:</span>
              {PRESET_CONCEPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setGoal(p.desc)}
                  style={{
                    background: '#334155',
                    border: '1px solid #475569',
                    borderRadius: '16px',
                    color: '#e2e8f0',
                    padding: '3px 10px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {p.title}
                </button>
              ))}
              <div style={{ flex: 1 }} />
                <button
                onClick={handleDraftPlan}
                disabled={isPlanning || !goal.trim()}
                style={{
                  background: isPlanning ? '#475569' : '#eab308',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isPlanning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPlanning ? 'Drafting Storyboard...' : '✨ Draft Storyboard with AI'}
              </button>
            </div>

            {/* Always-Visible Voice Selector Bar in Commercial Director */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
              <VoiceSelector
                value={selectedVoice}
                onChange={setSelectedVoice}
                voices={voices}
                apiBase={apiBase}
                label="🎙️ Commercial Narrator Voice (Choose & Preview All 54 Voices)"
                backgroundColor="#0f172a"
                borderColor="#475569"
              />
            </div>
          </div>

          {/* Step 2: Interactive Storyboard & Human Polish Loop */}
          {plan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#facc15' }}>{plan.title}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>{plan.logline} (~{plan.targetDurationSeconds}s)</p>
                </div>
                <button
                  onClick={handleAddScene}
                  style={{
                    background: '#1e293b',
                    border: '1px dashed #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + Add Scene
                </button>
              </div>

              {/* Scene Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '6px' }}>
                {plan.scenes.map((sc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                          SCENE {sc.sceneNum}
                        </span>
                        <input
                          type="text"
                          value={sc.title}
                          onChange={(e) => handleSceneChange(idx, 'title', e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f1f5f9',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                          value={sc.visualType}
                          onChange={(e) => handleSceneChange(idx, 'visualType', e.target.value)}
                          style={{
                            background: '#0f172a',
                            color: sc.visualType === 'omni_video' ? '#a855f7' : '#38bdf8',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          <option value="omni_video">Gemini Omni Video</option>
                          <option value="software_simulation">Live Platform UI</option>
                        </select>
                        <button
                          onClick={() => handleDeleteScene(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                          title="Delete Scene"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Narration Input */}
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Voiceover Narration:</span>
                      <textarea
                        rows={2}
                        value={sc.narration}
                        onChange={(e) => handleSceneChange(idx, 'narration', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          color: '#f8fafc',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Visual Prompt Input */}
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                        {sc.visualType === 'omni_video' ? 'Gemini Omni Video Prompt:' : 'Platform Screen / Motion:'}
                      </span>
                      <input
                        type="text"
                        value={sc.visualPrompt}
                        onChange={(e) => handleSceneChange(idx, 'visualPrompt', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          color: '#cbd5e1',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Agent Refinement Prompt Bar */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px' }}>💬</span>
                <input
                  type="text"
                  value={feedbackPrompt}
                  onChange={(e) => setFeedbackPrompt(e.target.value)}
                  placeholder="Tell the agent what to change (e.g. 'Make scene 4 more blunt', 'Shorten to 45s', 'Make the ending triumphant')..."
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRefineWithAgent(); }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleRefineWithAgent}
                  disabled={isRefining || !feedbackPrompt.trim()}
                  style={{
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isRefining ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isRefining ? 'Refining...' : 'Prompt Agent'}
                </button>
              </div>

              {/* Production Controls & One-Click Generate */}
              <div style={{
                background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)',
                border: '1px solid #4338ca',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <VoiceSelector
                      value={selectedVoice}
                      onChange={setSelectedVoice}
                      voices={voices}
                      apiBase={apiBase}
                      label="🎙️ Narrator Voice (54 Voices)"
                      compact
                      backgroundColor="#0f172a"
                      borderColor="#475569"
                    />
                  </div>
                  <div style={{ paddingBottom: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Music Track:</label>
                    <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>chill_tech_ambient.mp3 (Ducked)</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateCommercial}
                  disabled={isRendering}
                  style={{
                    background: isRendering ? '#475569' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: isRendering ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {isRendering ? '⚡ Producing Commercial...' : '🚀 Generate Commercial with Gemini Omni'}
                </button>
              </div>
            </div>
          )}

          {/* Progress & Result Player (Always visible when rendered) */}
          {renderStatus && (
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', fontSize: '13px', color: '#38bdf8' }}>
              {renderStatus}
            </div>
          )}

          {renderedUrl && (
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, color: '#10b981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎉</span> Commercial Rendered Successfully!
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleEmailVideo}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <span>📧</span> Email / Share Video
                  </button>

                  <button
                    onClick={() => setIsSocialOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #ff0050 0%, #1877f2 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(255, 0, 80, 0.3)'
                    }}
                  >
                    <span>🚀</span> Post to TikTok & FB
                  </button>

                  <a
                    href={renderedUrl}
                    download="krechet_commercial_master.mp4"
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    ⬇️ Download 1080p Master Video
                  </a>
                </div>
              </div>

              <video
                ref={commercialVideoRef}
                controls
                playsInline
                preload="auto"
                src={renderedUrl}
                style={{ width: '100%', maxHeight: '420px', borderRadius: '8px', background: 'black' }}
              />

              {/* Integrated Segment Selector, Frame Jogging & Timestamped Edit Console */}
              <TimestampedEditConsole
                videoRef={commercialVideoRef}
                videoUrl={renderedUrl}
                onVideoUpdated={(newUrl) => setRenderedUrl(newUrl)}
                selectedVoice={selectedVoice}
              />
            </div>
          )}
        </div>
      </div>

      {/* Social Publisher Modal for TikTok and Facebook */}
      <SocialPublisherModal
        isOpen={isSocialOpen}
        onClose={() => setIsSocialOpen(false)}
        apiBase={apiBase}
        defaultVideoUrl={renderedUrl}
      />
    </div>
  );
};
