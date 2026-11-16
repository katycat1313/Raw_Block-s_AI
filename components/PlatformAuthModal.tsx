import React, { useState, useEffect } from 'react';

interface PlatformAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  onScoutComplete: () => void;
}

export const PlatformAuthModal: React.FC<PlatformAuthModalProps> = ({
  isOpen,
  onClose,
  apiBase,
  onScoutComplete
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/auth/status`);
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      }
    } catch (_) {}
  };

  const handleLoginAndScout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsProcessing(true);

    try {
      if (!isAuthenticated) {
        if (!email.trim() || !password.trim()) {
          setErrorMsg('Please enter both your email/username and password.');
          setIsProcessing(false);
          return;
        }

        setStatus('🔐 Authenticating headless bot on Krechet Academy...');
        const loginRes = await fetch(`${apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password.trim() })
        });

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          throw new Error(loginData.error || 'Authentication failed. Please verify credentials.');
        }

        setIsAuthenticated(true);
        setStatus('✅ Signed in successfully! Bot session saved.');
      }

      setStatus('🚀 Scout Agent launched: Navigating & slicing 4 core feature blocks in 1080p...');
      const scoutRes = await fetch(`${apiBase}/api/scout-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const scoutData = await scoutRes.json().catch(() => ({}));
      if (!scoutRes.ok) {
        throw new Error(scoutData.error || 'Scout failed during recording.');
      }

      setStatus(`✅ Success! ${scoutData.count || 4} reusable action blocks captured and indexed.`);
      setTimeout(() => {
        setIsProcessing(false);
        onScoutComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Auth/Scout error:', err);
      setErrorMsg(err.message || 'Error occurred');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#12121a',
        border: '1px solid #2d2d3f',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        padding: '1.75rem',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
              <span>🤖</span> Connect & Scout Platform Blocks
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              The bot signs into Krechet Academy, scouts key tools, and slices them into reusable blocks.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        {/* Security Notice */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          fontSize: '0.78rem',
          color: '#a7f3d0',
          lineHeight: '1.4'
        }}>
          🔒 <strong>Local-Only Storage:</strong> Credentials and cookies are stored exclusively on your local machine in <code>server/storage/auth.json</code>. They are never transmitted to third parties or shared in chat.
        </div>

        {/* What Will Be Captured */}
        <div style={{
          background: '#181825',
          border: '1px solid #28283d',
          borderRadius: '10px',
          padding: '0.85rem',
          fontSize: '0.8rem',
          color: '#cbd5e1'
        }}>
          <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '0.4rem' }}>
            Blocks the Scout will capture & slice:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
            <li><code>[B1] Dashboard Overview</code> (High Reuse)</li>
            <li><code>[B2] Jenny's Artisan Java: 15-Lesson Action Plan</code> (High Reuse)</li>
            <li><code>[B3] SEO & Website Studio Simulation Workbench</code> (Targeted Reuse)</li>
            <li><code>[C1] Skills Radar & Performance Analytics</code> (High Reuse)</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleLoginAndScout} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {!isAuthenticated ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  placeholder="katycat1313@gmail.com or katycat"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#090a0f',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#090a0f',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.82rem',
              color: '#c7d2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>✅ <strong>Bot Already Authenticated</strong> with saved session cookies.</span>
              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fca5a5',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change Login
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              color: '#fca5a5',
              fontSize: '0.8rem'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {status && (
            <div style={{
              background: '#181825',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '0.75rem 0.9rem',
              color: '#6ee7b7',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ animation: isProcessing ? 'spin 1.5s linear infinite' : 'none' }}>⚙️</span>
              {status}
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            style={{
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
            }}
          >
            {isProcessing ? '🤖 Scout Running (Recording 4 Blocks)...' : (isAuthenticated ? '🚀 Re-Run Platform Scout' : '🔐 Connect & Scout 4 Blocks (1-Click)')}
          </button>
        </form>
      </div>
    </div>
  );
};
