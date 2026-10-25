import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: { geminiKey: string; deepgramKey: string; pexelsKey?: string }) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [deepgramKey, setDeepgramKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');

  useEffect(() => {
    const savedGemini = localStorage.getItem('GEMINI_API_KEY') || '';
    const savedDeepgram = localStorage.getItem('DEEPGRAM_API_KEY') || '';
    const savedPexels = localStorage.getItem('PEXELS_API_KEY') || '';
    setGeminiKey(savedGemini);
    setDeepgramKey(savedDeepgram);
    setPexelsKey(savedPexels);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    localStorage.setItem('DEEPGRAM_API_KEY', deepgramKey.trim());
    localStorage.setItem('PEXELS_API_KEY', pexelsKey.trim());
    onSave({ geminiKey: geminiKey.trim(), deepgramKey: deepgramKey.trim(), pexelsKey: pexelsKey.trim() });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#121216',
        border: '1px solid #2d2d3a',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '520px',
        width: '90%',
        color: '#f0f0f5',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚙️ API Keys & Services
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Keys can also be configured in your root <code>.env</code> file. When provided here, they are stored securely in your local browser session.
        </p>

        {/* Gemini Key */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
            Google Gemini API Key
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#090a0f',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Used for vision clip analysis and script generation. (Optional: Heuristic fallback active if omitted).
          </span>
        </div>

        {/* Deepgram Key */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
            Deepgram API Key
          </label>
          <input
            type="password"
            placeholder="Your Deepgram API Key..."
            value={deepgramKey}
            onChange={(e) => setDeepgramKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#090a0f',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Used for human-sounding Aura voiceover synthesis. (Optional: Simulated voice timing active if omitted).
          </span>
        </div>

        {/* Pexels Key */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
            Pexels API Key (Free)
          </label>
          <input
            type="password"
            placeholder="Your free Pexels API Key..."
            value={pexelsKey}
            onChange={(e) => setPexelsKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#090a0f',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Used for live search across millions of free 1080p stock videos. (Optional: Curated reaction clips active if omitted).
          </span>
        </div>

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
            onClick={handleSave}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
