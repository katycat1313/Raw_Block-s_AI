import React, { useEffect, useRef } from 'react';

export interface DialogueEvent {
  agent: string;
  role: string;
  message: string;
  type: 'thought' | 'debate' | 'prompt' | 'finding';
}

interface BoardroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: DialogueEvent[];
  status: string;
  isComplete: boolean;
  onViewTimeline: () => void;
}

export const BoardroomModal: React.FC<BoardroomModalProps> = ({
  isOpen,
  onClose,
  dialogue,
  status,
  isComplete,
  onViewTimeline
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue]);

  if (!isOpen) return null;

  const getAgentColor = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'scout': return '#38bdf8'; // Sky blue
      case 'screenplay': return '#a855f7'; // Purple
      case 'sound': return '#ec4899'; // Pink
      case 'director': return '#6366f1'; // Indigo
      case 'stylist': return '#fbbf24'; // Amber
      default: return '#94a3b8';
    }
  };

  const getAgentEmoji = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'scout': return '🕵️';
      case 'screenplay': return '✍️';
      case 'sound': return '🎙️';
      case 'director': return '🎬';
      case 'stylist': return '✨';
      default: return '🤖';
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
      zIndex: 9990,
      backdropFilter: 'blur(8px)',
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#101017',
        border: '1px solid #28283a',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.4)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isComplete ? '#10b981' : '#6366f1',
                boxShadow: `0 0 10px ${isComplete ? '#10b981' : '#6366f1'}`
              }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                Creative Boardroom: Autonomous Video Team
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {status || 'Agents deliberating script, video sequencing, and sound mixing...'}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Thought Stream */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {dialogue.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🧠</span>
              Initializing agent thought stream...
            </div>
          ) : (
            dialogue.map((item, idx) => {
              const color = getAgentColor(item.agent);
              const emoji = getAgentEmoji(item.agent);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    alignItems: 'flex-start',
                    background: '#161622',
                    border: `1px solid ${color}25`,
                    borderRadius: '12px',
                    padding: '1rem',
                    borderLeft: `4px solid ${color}`
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    {emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color }}>
                        {item.agent}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        • {item.role}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#e2e8f0', lineHeight: '1.45' }}>
                      {item.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.4)'
        }}>
          <span style={{ fontSize: '0.8rem', color: isComplete ? '#10b981' : '#a855f7', fontWeight: 600 }}>
            {isComplete ? '✅ Timeline & Script Successfully Assembled' : '⚡ Multi-agent reasoning active...'}
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.84rem'
              }}
            >
              Close Console
            </button>
            {isComplete && (
              <button
                onClick={() => {
                  onClose();
                  onViewTimeline();
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.84rem'
                }}
              >
                Inspect Master Timeline ➡️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
