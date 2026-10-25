import React, { useState } from 'react';
import { DeepgramVoice } from './DirectorStudio';

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  voices: DeepgramVoice[];
  onAutoPilotComplete: (result: {
    newClips: any[];
    allClips: any[];
    edl: any;
    dialogue: any[];
  }) => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  apiBase,
  voices,
  onAutoPilotComplete
}) => {
  const [url, setUrl] = useState('https://krechetacademy.com');
  const [goalPrompt, setGoalPrompt] = useState(
    'Awareness video for Krechet Academy: Unlike regular digital marketing courses that only teach passive theory, our platform uses live simulations and workshops that mimic real clients and campaigns. All the work the student completes goes directly into a live portfolio that the certification links to, proving to employers they have genuine hands-on experience. 1-week free trial, then $97/month.'
  );
  const [selectedVoice, setSelectedVoice] = useState('aura-orion-en');
  const [recordDuration, setRecordDuration] = useState(4);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.25);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const partMatch = goalPrompt.match(/(?:\[|\b)(?:part|p)\s*([0-9]+)(?:\s*(?:\.|\:)\s*(?:video|v)\s*([0-9]+))?(?:\]|\:|\.|\s|$)/i);

  const handleInsertTag = (tag: string) => {
    const cleaned = goalPrompt.replace(/^\[?\b(?:part|p)\s*[0-9]+(?:\s*(?:\.|\:)\s*(?:video|v)\s*[0-9]+)?\]?[\:\.\-\s]*/i, '').trim();
    setGoalPrompt(`${tag} ${cleaned}`);
  };

  if (!isOpen) return null;

  const handleLaunch = async () => {
    if (!goalPrompt.trim()) {
      alert('Please enter a goal or pitch for the video.');
      return;
    }

    setIsRunning(true);
    setCurrentStep('Initializing Autonomous Agents...');
    setLogs(['🚀 Showrunner Agent initializing autonomous pipeline...']);

    try {
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const deepgramKey = localStorage.getItem('DEEPGRAM_API_KEY') || '';
      const pexelsKey = localStorage.getItem('PEXELS_API_KEY') || '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) headers['x-gemini-key'] = geminiKey;
      if (pexelsKey) headers['x-pexels-key'] = pexelsKey;

      setCurrentStep('Browser Agent recording live app interactions at 1080p...');
      setLogs(prev => [...prev, `🌐 Navigating to ${url || 'web application'} and capturing showcase actions...`]);

      const res = await fetch(`${apiBase}/api/autopilot`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          goalPrompt,
          selectedVoice,
          recordDuration,
          speedMultiplier,
          geminiKey,
          deepgramKey
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
        throw new Error(data.error || 'Autonomous production encountered an error.');
      }

      setCurrentStep('Production complete! Loading storyboard...');
      setLogs(prev => [...prev, '✨ Assembly complete! EDL storyboard generated with synchronized voiceover.']);

      setTimeout(() => {
        onAutoPilotComplete(data);
        onClose();
      }, 900);
    } catch (err: any) {
      alert(`Auto-Pilot Error: ${err.message}`);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#121217',
        border: '1px solid #312e81',
        borderRadius: '18px',
        padding: '2rem',
        maxWidth: '680px',
        width: '92%',
        color: '#f0f0f5',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🚀</span> Auto-Pilot Video Producer
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Autonomous App Recording + Reaction B-Roll + Script Polish + Deepgram Aura Voice
            </span>
          </div>
          <button 
            onClick={onClose}
            disabled={isRunning}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {isRunning ? (
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '1.75rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.5rem 0'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #312e81',
              borderTopColor: '#818cf8',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.3rem' }}>
                Agents in Production
              </div>
              <div style={{ fontSize: '0.9rem', color: '#a5b4fc' }}>
                {currentStep}
              </div>
            </div>

            {/* Live activity log */}
            <div style={{
              width: '100%',
              background: '#090a0f',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'left',
              maxHeight: '120px',
              overflowY: 'auto',
              fontSize: '0.78rem',
              color: '#94a3b8',
              fontFamily: 'monospace'
            }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '0.25rem' }}>{log}</div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Target App URL */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                1. Target App / Website URL (Playwright will record live 1080p clips)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://krechetacademy.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#090a0f',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                Optional: Leave blank if you only want to use your existing uploaded raw blocks and stock B-roll.
              </span>
            </div>

            {/* Video Goal / Prompt */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  2. Film Goal, Pitch & Key Angles
                </label>
                {partMatch && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    🎬 Part {partMatch[1]}{partMatch[2] ? ` (Video ${partMatch[2]})` : ''} Series Continuity Active
                  </span>
                )}
              </div>

              {/* Quick Series Continuity Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Series tags:</span>
                {['[Part 1]', '[Part 2]', '[Part 3]', 'p1.v1', 'p2.v1'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      cursor: 'pointer'
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
                rows={4}
                placeholder="Describe what you want the video to convey..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#090a0f',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Voice & Duration Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  🎙️ Deepgram Aura Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#090a0f',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender} - {v.style})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                    ⏱️ Micro-Clip Duration
                  </label>
                  <span style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 700 }}>
                    {recordDuration}s cut
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  {[
                    { sec: 3, label: '3s Cut' },
                    { sec: 4, label: '4s Ideal' },
                    { sec: 6, label: '6s Flow' }
                  ].map(p => (
                    <button
                      key={p.sec}
                      type="button"
                      onClick={() => setRecordDuration(p.sec)}
                      style={{
                        flex: 1,
                        padding: '0.25rem 0.3rem',
                        borderRadius: '5px',
                        border: `1px solid ${recordDuration === p.sec ? '#6366f1' : '#334155'}`,
                        background: recordDuration === p.sec ? 'rgba(99, 102, 241, 0.25)' : '#090a0f',
                        color: recordDuration === p.sec ? '#ffffff' : '#94a3b8',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={recordDuration}
                  onChange={(e) => setRecordDuration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#6366f1' }}
                />
              </div>
            </div>

            {/* Motion Speed Pacing */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                  ⚡ Screen Motion Pacing (Human Speed-Up)
                </label>
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                  {speedMultiplier === 1.0 ? '1.0x Real-time' : `${speedMultiplier}x Snappy Human`}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { val: 1.0, label: '1.0x Standard', desc: 'Real-time speed' },
                  { val: 1.25, label: '1.25x Snappy', desc: 'Human-like & brisk (Recommended)' },
                  { val: 1.5, label: '1.5x Fast Demo', desc: 'Punchy showcase cadence' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSpeedMultiplier(opt.val)}
                    style={{
                      padding: '0.5rem 0.3rem',
                      borderRadius: '8px',
                      border: `1px solid ${speedMultiplier === opt.val ? '#6366f1' : '#334155'}`,
                      background: speedMultiplier === opt.val ? 'rgba(99, 102, 241, 0.2)' : '#090a0f',
                      color: speedMultiplier === opt.val ? '#ffffff' : '#94a3b8',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div>{opt.label}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #1e293b', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunch}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 18px rgba(79, 70, 229, 0.45)'
                }}
              >
                <span>⚡</span> Launch Autonomous Production
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
