import React, { useState, useEffect, useCallback } from 'react';

// --- Block Timeline Types ---
interface TimelineBlock {
  id: string;
  duration: number; // seconds
  action: string;
}

/** Parse a natural-language recording directive into structured TimelineBlocks.
 *  Handles patterns like:
 *   "first 10 seconds showing X, 10 seconds hovering Y, final 10 seconds clicking Z"
 *   "spend 10s on X, then 10s on Y, last 10s on Z"
 */
function parseDirectiveToTimeline(text: string, url?: string): { blocks: TimelineBlock[]; detectedUrl: string | null } {
  const detectedUrl = text.match(/https?:\/\/[^\s,]+/)?.[0] ?? null;

  // Patterns that extract (duration, action):
  // "first 10 seconds showing X"  |  "10 seconds hovering Y"  |  "final 10 seconds clicking Z"
  const pattern = /(?:first|next|then|last|final|and the final|spend(?: the first)?|the last)?\s*(\d+)\s*(?:second|sec|s)\s+(?:of\s+)?(?:on\s+)?(.+?)(?=,\s*(?:(?:next|then|last|final|and the final|spend|the last)?\s*\d+\s*(?:second|sec|s)\b)|[.\n]|$)/gi;

  const blocks: TimelineBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const dur = parseInt(match[1], 10);
    const action = match[2]
      .replace(/^(?:showing|hovering|clicking|demonstrating|highlighting|displaying|navigating to|scrolling through)\s+/i, (m) => m) // keep verb
      .trim();
    if (dur > 0 && action.length > 1) {
      blocks.push({ id: `blk_${Date.now()}_${blocks.length}`, duration: dur, action });
    }
  }

  return { blocks, detectedUrl };
}

interface RecordAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClipRecorded: (clip: any) => void;
  apiBase: string;
  initialUrl?: string;
  initialAction?: string;
}

export const RecordAppModal: React.FC<RecordAppModalProps> = ({
  isOpen,
  onClose,
  onClipRecorded,
  apiBase,
  initialUrl = '',
  initialAction = ''
}) => {
  // Mode selection: 'batch_scout' (Directive-driven 5-8s blocks) vs 'single_take'
  const [activeTab, setActiveTab] = useState<'batch_scout' | 'single_take'>('batch_scout');

  // Common URL
  const [url, setUrl] = useState(initialUrl || 'https://krechet.academy/dashboard');

  // Batch Directive Scout States
  const [directive, setDirective] = useState(
    'I want 30 seconds describing the different elements of the analytics page: Skills Radar, Client Retention, and Campaign ROAS metrics'
  );
  const [blockDuration, setBlockDuration] = useState(6); // 5 to 8s
  const [blockCount, setBlockCount] = useState(5); // 5 blocks * 6s = 30s
  const [speedMultiplier, setSpeedMultiplier] = useState(1.25);
  const [eventMarkers, setEventMarkers] = useState(''); // Key moments the agent must capture

  // Block Timeline Builder — per-block actions with individual durations
  const [blockTimeline, setBlockTimeline] = useState<TimelineBlock[]>([]);
  const timelineActive = blockTimeline.length > 0;
  const timelineTotalDuration = blockTimeline.reduce((s, b) => s + b.duration, 0);

  const handleParseDirective = useCallback(() => {
    const { blocks, detectedUrl } = parseDirectiveToTimeline(directive, url);
    if (blocks.length === 0) {
      alert('Could not detect time-segmented blocks in your description.\n\nTry a format like:\n"First 10 seconds showing X, 10 seconds hovering Y, final 10 seconds clicking Z"');
      return;
    }
    setBlockTimeline(blocks);
    if (detectedUrl && !url.startsWith('http')) setUrl(detectedUrl);
  }, [directive, url]);

  const handleAddBlock = () => {
    setBlockTimeline(prev => [...prev, { id: `blk_${Date.now()}`, duration: 6, action: '' }]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlockTimeline(prev => prev.filter(b => b.id !== id));
  };

  const handleUpdateBlock = (id: string, field: keyof Omit<TimelineBlock, 'id'>, value: string | number) => {
    setBlockTimeline(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleClearTimeline = () => setBlockTimeline([]);

  // Single Take States
  const [targetDuration, setTargetDuration] = useState(4);
  const [actionNotes, setActionNotes] = useState(initialAction || 'The mouse moves smoothly across the main features');

  // Execution states
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressSteps, setProgressSteps] = useState<string[]>([]);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
    if (initialAction) setActionNotes(initialAction);
  }, [initialUrl, initialAction, isOpen]);

  if (!isOpen) return null;

  // Handler for Batch Directive Scout
  const handleLaunchBatchScout = async () => {
    if (!url || !url.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }

    if (!directive.trim()) {
      alert('Please enter a directive telling the agents what elements to record.');
      return;
    }

    setIsRecording(true);
    setStatusMessage('Launching Autonomous Playwright Scout...');
    setProgressSteps([
      `🌐 Navigating to ${url}...`,
      `🎯 Targeting directive: "${directive.substring(0, 45)}..."`,
      timelineActive
        ? `🎞️ Executing ${blockTimeline.length} timeline blocks (${timelineTotalDuration}s total)...`
        : `🎬 Preparing to record ${blockCount} distinct ${blockDuration}s blocks (${(blockCount * blockDuration)}s total)...`
    ]);

    try {
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) headers['x-gemini-key'] = geminiKey;

      const res = await fetch(`${apiBase}/api/scout-directive-blocks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          directive,
          blockDuration: timelineActive ? undefined : blockDuration,
          blockCount: timelineActive ? blockTimeline.length : blockCount,
          speedMultiplier,
          eventMarkers: eventMarkers.trim() || undefined,
          // Structured per-block timeline (overrides flat blockDuration/blockCount when present)
          blockTimeline: timelineActive ? blockTimeline.map(b => ({ duration: b.duration, action: b.action })) : undefined
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned unexpected response (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scout and analyze blocks');
      }

      const clips = data.clips || [];
      setProgressSteps(prev => [
        ...prev,
        `👁️ Gemini Vision analyzed all ${clips.length} blocks!`,
        `🏷️ Assigned taxonomy: ${clips.map((c: any) => `[${c.blockCode || 'Block'}]`).join(' ')}`,
        `✨ Ingesting into library...`
      ]);

      // Add each clip to state
      clips.forEach((clip: any) => {
        onClipRecorded(clip);
      });

      setTimeout(() => {
        setIsRecording(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(`Scout error: ${err.message}`);
      setIsRecording(false);
      setStatusMessage('');
    }
  };

  // Handler for Single Clip Recording
  const handleStartSingleRecord = async () => {
    if (!url || !url.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsRecording(true);
    setStatusMessage('Launching automated browser recorder...');

    try {
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) headers['x-gemini-key'] = geminiKey;

      setStatusMessage('Recording page interactions at 1920x1080 with smooth cursor animation...');

      const res = await fetch(`${apiBase}/api/record-app`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          targetDuration,
          speedMultiplier,
          actionNotes,
          actions: []
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned unexpected response (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed recording application screen');
      }

      onClipRecorded(data.clip);
      onClose();
    } catch (err: any) {
      alert(`Recording error: ${err.message}`);
    } finally {
      setIsRecording(false);
      setStatusMessage('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.88)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: '#121218',
        border: '1px solid #2d2d3a',
        borderRadius: '18px',
        padding: '2rem',
        maxWidth: '640px',
        width: '92%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#f0f0f5',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              🤖 Autonomous Block Scout & Vision
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Direct the agent to gather, analyze, and taxonomize 5–8s raw blocks
            </p>
          </div>
          <button 
            onClick={onClose}
            disabled={isRecording}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#0a0b10', padding: '0.35rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #1e202e' }}>
          <button
            type="button"
            onClick={() => setActiveTab('batch_scout')}
            disabled={isRecording}
            style={{
              flex: 1,
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'batch_scout' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeTab === 'batch_scout' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: activeTab === 'batch_scout' ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none'
            }}
          >
            <span>⚡</span> Batch Directive Scout (5–8s Blocks)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single_take')}
            disabled={isRecording}
            style={{
              flex: 1,
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'single_take' ? '#272738' : 'transparent',
              color: activeTab === 'single_take' ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <span>🎥</span> Single Action Take
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: BATCH DIRECTIVE SCOUT (5 to 8-second blocks) */}
        {/* ======================================================== */}
        {activeTab === 'batch_scout' && (
          <div>
            {/* The Text Input Box: Directive / Goal */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e0e7ff' }}>
                <span>🎯</span> Tell the agents what blocks you want to gather:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. 'I want 30 seconds describing the different elements of the analytics page' or 'Capture 4 blocks showing keyword search, negative keywords, and ROAS chart'"
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                disabled={isRecording}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #4338ca',
                  background: '#0a0c14',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                }}
              />
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                💡 The agent navigates the live app, locates these specific UI elements, records human-paced micro-takes, and passes them to Gemini Vision to label with exact block types ([C1], [B1], etc.).
              </div>
            </div>

            {/* ── Block Timeline Builder ─────────────────────────────── */}
            <div style={{
              marginBottom: '1.25rem',
              background: timelineActive ? 'rgba(56, 189, 248, 0.05)' : 'rgba(99,102,241,0.04)',
              border: `1px solid ${timelineActive ? 'rgba(56,189,248,0.3)' : '#1e2030'}`,
              borderRadius: '12px',
              padding: '0.9rem 1rem'
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0e7ff' }}>🎞️ Block Timeline</span>
                  {timelineActive && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      background: 'rgba(56,189,248,0.2)', color: '#38bdf8',
                      border: '1px solid rgba(56,189,248,0.4)',
                      padding: '1px 7px', borderRadius: '5px'
                    }}>
                      {blockTimeline.length} blocks · {timelineTotalDuration}s total
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {timelineActive && (
                    <>
                      <button type="button" onClick={handleAddBlock} disabled={isRecording} style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px',
                        borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.4)'
                      }}>+ Add Block</button>
                      <button type="button" onClick={handleClearTimeline} disabled={isRecording} style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px',
                        borderRadius: '6px', cursor: 'pointer',
                        background: 'transparent', color: '#64748b',
                        border: '1px solid #2d3148'
                      }}>✕ Clear</button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleParseDirective}
                    disabled={isRecording || !directive.trim()}
                    title="Parse your directive description into structured per-block timeline"
                    style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                      borderRadius: '6px', cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                      color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.5)'
                    }}
                  >
                    ✨ Parse → Timeline
                  </button>
                </div>
              </div>

              {!timelineActive ? (
                <div style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center', padding: '0.6rem 0' }}>
                  Write your directive above then click <strong style={{ color: '#a5b4fc' }}>✨ Parse → Timeline</strong> to auto-build a per-block breakdown,
                  or <button type="button" onClick={handleAddBlock} disabled={isRecording} style={{
                    background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 700, padding: 0
                  }}>add blocks manually</button>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 56px 1fr 28px', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>#</span>
                    <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>DUR</span>
                    <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>ACTION / WHAT AGENT SHOULD DO</span>
                    <span />
                  </div>

                  {blockTimeline.map((blk, idx) => (
                    <div key={blk.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 56px 1fr 28px',
                      gap: '0.4rem',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.5rem',
                      border: '1px solid #1e2030'
                    }}>
                      {/* Index badge */}
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
                        fontSize: '0.72rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{idx + 1}</div>

                      {/* Duration input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <input
                          type="number"
                          min={1} max={30}
                          value={blk.duration}
                          onChange={e => handleUpdateBlock(blk.id, 'duration', Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={isRecording}
                          style={{
                            width: '38px', padding: '0.3rem 0.3rem',
                            borderRadius: '6px', border: '1px solid #334155',
                            background: '#090a0f', color: '#38bdf8',
                            fontSize: '0.85rem', fontWeight: 700,
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>s</span>
                      </div>

                      {/* Action description */}
                      <input
                        type="text"
                        value={blk.action}
                        onChange={e => handleUpdateBlock(blk.id, 'action', e.target.value)}
                        disabled={isRecording}
                        placeholder="e.g. hover the side-by-side preview panel"
                        style={{
                          width: '100%', padding: '0.35rem 0.6rem',
                          borderRadius: '6px', border: '1px solid #334155',
                          background: '#090a0f', color: '#f8fafc',
                          fontSize: '0.82rem', boxSizing: 'border-box'
                        }}
                      />

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(blk.id)}
                        disabled={isRecording}
                        style={{
                          background: 'transparent', border: 'none',
                          color: '#475569', cursor: 'pointer',
                          fontSize: '1rem', lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Remove block"
                      >✕</button>
                    </div>
                  ))}

                  {/* Timeline footer summary */}
                  <div style={{
                    marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.73rem', color: '#64748b', borderTop: '1px solid #1e2030', paddingTop: '0.5rem'
                  }}>
                    <span>📐 {blockTimeline.length} blocks · <strong style={{ color: '#10b981' }}>{timelineTotalDuration}s</strong> total footage</span>
                    <span style={{ color: '#475569' }}>Per-block durations override the preset controls below</span>
                  </div>
                </div>
              )}
            </div>

            {/* Event Markers */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e0e7ff' }}>
                <span>📍</span> Event Markers <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.78rem' }}>(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 'Must show the ROAS chart updating in real-time', 'Highlight the green success badge when campaign goes live', 'Capture the transition from 0 to 100% skill bar'"
                value={eventMarkers}
                onChange={(e) => setEventMarkers(e.target.value)}
                disabled={isRecording}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #7c3aed',
                  background: '#0a0c14',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                }}
              />
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                📌 Specific UI moments or interactions the agent <strong style={{ color: '#c4b5fd' }}>must</strong> capture — these are treated as mandatory checkpoints in the recording.
              </div>
            </div>

            {/* Target URL with quick presets */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                🌐 Target Application URL
              </label>
              <input
                type="text"
                placeholder="https://krechet.academy/dashboard or https://your-app.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isRecording}
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
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { label: '📊 Analytics Dashboard', link: 'https://krechet.academy/dashboard' },
                  { label: '⚡ SEO CMS Workbench', link: 'https://krechet.academy/seo-simulation/1' },
                  { label: '🎓 Client Tutorials', link: 'https://krechet.academy/tutorials' }
                ].map(s => (
                  <button
                    key={s.link}
                    type="button"
                    onClick={() => setUrl(s.link)}
                    disabled={isRecording}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid #2e334d',
                      borderRadius: '6px',
                      padding: '0.25rem 0.55rem',
                      color: '#a5b4fc',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Block Duration Selector (5s to 8s) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
                  ⏱️ Duration Per Block (5 to 8 Seconds)
                </label>
                <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                  {blockDuration}s per cut
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {[5, 6, 7, 8].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setBlockDuration(sec)}
                    disabled={isRecording}
                    style={{
                      padding: '0.5rem 0.2rem',
                      borderRadius: '8px',
                      border: `1px solid ${blockDuration === sec ? '#38bdf8' : '#334155'}`,
                      background: blockDuration === sec ? 'rgba(56, 189, 248, 0.2)' : '#090a0f',
                      color: blockDuration === sec ? '#ffffff' : '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {sec} Seconds
                  </button>
                ))}
              </div>
            </div>

            {/* Total Duration & Number of Blocks */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
                  📦 Total Blocks to Harvest
                </label>
                <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                  {blockCount} Blocks ({(blockCount * blockDuration)}s Total Footage)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {[
                  { count: 3, label: '3 Blocks', note: `${3 * blockDuration}s cut` },
                  { count: 5, label: '5 Blocks', note: `${5 * blockDuration}s cut (Ideal)` },
                  { count: 6, label: '6 Blocks', note: `${6 * blockDuration}s cut` },
                  { count: 8, label: '8 Blocks', note: `${8 * blockDuration}s cut` }
                ].map(opt => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setBlockCount(opt.count)}
                    disabled={isRecording}
                    style={{
                      padding: '0.5rem 0.2rem',
                      borderRadius: '8px',
                      border: `1px solid ${blockCount === opt.count ? '#10b981' : '#334155'}`,
                      background: blockCount === opt.count ? 'rgba(16, 185, 129, 0.2)' : '#090a0f',
                      color: blockCount === opt.count ? '#ffffff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div>{opt.label}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.75, marginTop: '2px' }}>{opt.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Progress Status */}
            {isRecording ? (
              <div style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.6rem', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
                  <span style={{ fontSize: '0.95rem', color: '#c7d2fe', fontWeight: 700 }}>
                    {statusMessage || 'Scouting application blocks...'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {progressSteps.map((step, idx) => (
                    <div key={idx} style={{ fontSize: '0.78rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.7rem 1.4rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchBatchScout}
                  style={{
                    padding: '0.7rem 1.8rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
                    fontSize: '0.92rem'
                  }}
                >
                  <span>🚀</span> Launch Autonomous Scout & Analyze
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SINGLE ACTION TAKE */}
        {/* ======================================================== */}
        {activeTab === 'single_take' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                App or Simulation URL
              </label>
              <input
                type="text"
                placeholder="https://krechet.academy/dashboard"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isRecording}
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
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Take Duration
                </label>
                <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 700 }}>
                  {targetDuration}s
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                disabled={isRecording}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                Action Goal / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Smoothly scroll and highlight skills radar"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                disabled={isRecording}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#090a0f',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {isRecording ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '1.8rem', animation: 'spin 1.5s linear infinite' }}>🔴</span>
                <div style={{ fontSize: '0.88rem', color: '#fca5a5', fontWeight: 600, marginTop: '0.4rem' }}>
                  {statusMessage || 'Recording 1080p take...'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.6rem 1.2rem',
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
                  onClick={handleStartSingleRecord}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>🔴</span> Record Single Take
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
