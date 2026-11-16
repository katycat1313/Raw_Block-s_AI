import React, { useState, useEffect } from 'react';

interface StockBrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClipImported: (clip: any) => void;
  apiBase: string;
}

export const StockBrollModal: React.FC<StockBrollModalProps> = ({
  isOpen,
  onClose,
  onClipImported,
  apiBase
}) => {
  const [query, setQuery] = useState('coffee barista espresso');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleSearch('coffee barista espresso');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setQuery(searchQuery);
    try {
      const res = await fetch(`${apiBase}/api/broll/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('B-roll search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (item: any) => {
    setImportingId(item.id);
    try {
      const res = await fetch(`${apiBase}/api/broll/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          title: item.title
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed importing B-roll clip');
      }

      const data = await res.json();
      onClipImported(data.clip);
      onClose();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  const QUICK_TAGS = [
    { label: '☕ Artisan Coffee (Jenny\'s Java)', q: 'coffee barista espresso' },
    { label: '📊 Marketing Agency Team', q: 'digital marketing team' },
    { label: '💻 Strategy & Analytics', q: 'laptop analytics data' },
    { label: '🤝 Client Handshake & Hired', q: 'business handshake interview' },
    { label: '🤦 Frustration / Outdated Courses', q: 'frustrated person computer' }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)',
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#121217',
        border: '1px solid #2d2d3a',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '800px',
        width: '95%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#f0f0f5',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎥 Stock Reaction B-Roll (100% Free Commercial Use)
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Pull authentic human reactions to contrast against your software simulations
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Free Commercial License Guarantee */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '8px',
          padding: '0.55rem 0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          color: '#6ee7b7'
        }}>
          <span style={{ fontSize: '1rem' }}>🛡️</span>
          <span>
            <strong>100% Free & Royalty-Free for Commercial Use:</strong> All B-roll clips are pulled exclusively from royalty-free public domain / permissive creative commons catalogs (Pexels, Pixabay, & Local Studio Stock) with zero royalties, zero subscription fees, and no attribution required.
          </span>
        </div>

        {/* Quick Search Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.q}
              onClick={() => handleSearch(tag.q)}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                border: `1px solid ${query.toLowerCase() === tag.q.toLowerCase() ? '#818cf8' : '#334155'}`,
                background: query.toLowerCase() === tag.q.toLowerCase() ? 'rgba(99,102,241,0.2)' : '#181824',
                color: query.toLowerCase() === tag.q.toLowerCase() ? '#818cf8' : '#cbd5e1',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Search B-roll footage (e.g. job interview, frustrated, laptop)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            style={{
              flex: 1,
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#090a0f',
              color: '#f8fafc',
              fontSize: '0.88rem'
            }}
          />
          <button
            onClick={() => handleSearch(query)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#6366f1',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>

        {/* Results Grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          paddingRight: '0.25rem'
        }}>
          {isSearching ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#818cf8' }}>
              <span style={{ fontSize: '2rem', display: 'block', animation: 'spin 1.5s linear infinite' }}>⏳</span>
              Searching royalty-free B-roll clips...
            </div>
          ) : results.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No clips found for "{query}". Try one of the quick tags above.
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#181824',
                  border: '1px solid #28283a',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Video Preview */}
                <div style={{ position: 'relative', width: '100%', height: '130px', background: '#090a0f', overflow: 'hidden' }}>
                  {item.previewUrl && (
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <video
                    src={item.videoUrl}
                    poster={item.previewUrl}
                    controls
                    muted
                    loop
                    preload="metadata"
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'cover', background: 'transparent' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(16, 185, 129, 0.9)',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }}>
                    ✓ Free License
                  </span>
                  <span style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#f8fafc',
                    fontSize: '0.65rem',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>
                    {item.duration ? `${item.duration}s` : 'HD'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.title}
                  </span>

                  <button
                    onClick={() => handleImport(item)}
                    disabled={importingId === item.id}
                    style={{
                      marginTop: 'auto',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: importingId === item.id ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: importingId === item.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {importingId === item.id ? (
                      <>⏳ Downloading to Library...</>
                    ) : (
                      <>⬇️ Add to Video Library</>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
