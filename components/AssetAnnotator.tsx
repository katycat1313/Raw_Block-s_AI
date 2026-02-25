import React, { useState, useRef, useEffect } from 'react';

interface Annotation {
  x: number;
  y: number;
  text: string;
  id: string;
}

interface AssetAnnotatorProps {
  assetUrl: string;
  assetType: 'image' | 'video';
  onRegenerate: (feedback: string, annotations: Annotation[]) => void;
  onClose: () => void;
}

const AssetAnnotator: React.FC<AssetAnnotatorProps> = ({ assetUrl, assetType, onRegenerate, onClose }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        canvasRef.current.width = offsetWidth;
        canvasRef.current.height = offsetHeight;
        drawAnnotations();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Also trigger on asset change/load
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [annotations, assetUrl, isAddingAnnotation]);

  const drawAnnotations = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann, idx) => {
      // Draw marker
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((idx + 1).toString(), ann.x, ann.y);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAddingAnnotation || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentAnnotation({ x, y });
  };

  const handleAddAnnotation = () => {
    if (!currentAnnotation || !annotationText.trim()) return;

    const newAnnotation: Annotation = {
      ...currentAnnotation,
      text: annotationText,
      id: Math.random().toString(36).substr(2, 9)
    };

    setAnnotations([...annotations, newAnnotation]);
    setCurrentAnnotation(null);
    setAnnotationText('');
    setIsAddingAnnotation(false);
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
  };

  const handleRegenerate = () => {
    const annotationFeedback = annotations.map((ann, idx) =>
      `[Point ${idx + 1} at coordinates ${Math.round(ann.x)},${Math.round(ann.y)}]: ${ann.text}`
    ).join('\n');

    const fullFeedback = `${feedback}\n\nSpecific annotations:\n${annotationFeedback}`;
    onRegenerate(fullFeedback, annotations);
  };

  const handleVideoPause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPaused(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-8">
      <div className="bg-slate-900 rounded-[3rem] border border-slate-800 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Annotate & Regenerate</h2>
            <p className="text-xs text-slate-500 font-black uppercase mt-1">Mark areas for improvement and provide feedback</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Asset Preview */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden" ref={containerRef}>
                {assetType === 'image' ? (
                  <img src={assetUrl} alt="Asset" className="w-full h-auto block" />
                ) : (
                  <video
                    ref={videoRef}
                    src={assetUrl}
                    controls
                    className="w-full h-auto block"
                    onPause={handleVideoPause}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 cursor-crosshair"
                  onClick={handleCanvasClick}
                  style={{
                    pointerEvents: isAddingAnnotation ? 'auto' : 'none',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </div>

              <button
                onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                className={`w-full py-3 rounded-xl font-black uppercase text-xs transition-all ${isAddingAnnotation
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {isAddingAnnotation ? '📍 Click on image to add marker' : '+ Add Annotation Point'}
              </button>
            </div>

            {/* Feedback Panel */}
            <div className="space-y-6">
              {/* Annotation List */}
              <div className="glass-morphism rounded-2xl p-6 border border-slate-800">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Annotation Points ({annotations.length})</h3>
                {annotations.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No annotations yet. Click on the image to mark areas.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-auto">
                    {annotations.map((ann, idx) => (
                      <div key={ann.id} className="bg-slate-900/50 rounded-xl p-3 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-white">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300">{ann.text}</p>
                          <p className="text-[9px] text-slate-600 mt-1">Position: {Math.round(ann.x)}, {Math.round(ann.y)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAnnotation(ann.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Annotation Modal */}
              {currentAnnotation && (
                <div className="glass-morphism rounded-2xl p-6 border border-amber-500/30 bg-amber-500/5">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Describe this point</h3>
                  <textarea
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    placeholder="E.g., 'Make the product larger', 'Change lighting here', 'Add more emphasis on this feature'"
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500 transition-all mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAnnotation}
                      disabled={!annotationText.trim()}
                      className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-xs font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Point
                    </button>
                    <button
                      onClick={() => {
                        setCurrentAnnotation(null);
                        setAnnotationText('');
                        setIsAddingAnnotation(false);
                      }}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-black uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* General Feedback */}
              <div className="glass-morphism rounded-2xl p-6 border border-slate-800">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Overall Feedback</h3>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what changes you'd like overall... E.g., 'Make it more vibrant', 'Show more product detail', 'Change the angle to be more dynamic'"
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRegenerate}
                  disabled={!feedback.trim() && annotations.length === 0}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Regenerate with Feedback
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAnnotator;
