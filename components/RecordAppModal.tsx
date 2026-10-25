import React, { useState } from 'react';

interface RecordAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClipRecorded: (clip: any) => void;
  apiBase: string;
}

export const RecordAppModal: React.FC<RecordAppModalProps> = ({
  isOpen,
  onClose,
  onClipRecorded,
  apiBase
}) => {
  const [url, setUrl] = useState('https://krechetacademy.com');
  const [targetDuration, setTargetDuration] = useState(8);
  const [actionNotes, setActionNotes] = useState('Showcase simulation interface with smooth exploration');
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleStartRecord = async () => {
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
          actions: [] // Default smooth showcase motion
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
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#121217',
        border: '1px solid #2d2d3a',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '550px',
        width: '90%',
        color: '#f0f0f5',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 Agent Screen Recorder
          </h2>
          <button 
            onClick={onClose}
            disabled={isRecording}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: '1.45' }}>
          The autonomous browser agent navigates to your application URL, animates smooth human cursor movements, and records pristine <strong>1080p 60fps MP4</strong> footage directly into your library.
        </p>

        {/* Target URL */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
            App or Simulation URL
          </label>
          <input
            type="text"
            placeholder="https://krechetacademy.com/simulation or http://localhost:3000"
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

        {/* Duration Slider */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
              Target Clip Duration
            </label>
            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 700 }}>
              {targetDuration} seconds
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={20}
            step={1}
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
            disabled={isRecording}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
        </div>

        {/* Action description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
            Action Goal
          </label>
          <input
            type="text"
            placeholder="e.g. Explore dashboard, highlight weekly client simulation"
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

        {/* Progress or Actions */}
        {isRecording ? (
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.8rem', animation: 'spin 1.5s linear infinite' }}>🔴</span>
            <span style={{ fontSize: '0.88rem', color: '#a5b4fc', fontWeight: 600 }}>
              {statusMessage || 'Recording screen in progress...'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
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
              onClick={handleStartRecord}
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
                gap: '0.4rem',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
              }}
            >
              <span>🔴</span> Record 1080p Clip
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
