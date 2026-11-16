import React, { useState, useRef, useEffect } from 'react';

export interface AppFeature {
  id: string;
  title: string;
  locationOrRoute: string;
  editOrActionTrigger: string;
  description: string;
  suggestedHighlights?: string[];
}

export interface AppBlueprint {
  appName: string;
  overview: string;
  targetUrl?: string;
  keyFeatures: AppFeature[];
  suggestedStoryline?: Array<{
    step: number;
    title: string;
    voiceoverGoal: string;
    visualAction: string;
  }>;
  duration?: number;
  timestamp: string;
}

interface RecordTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlueprintCreated: (blueprint: AppBlueprint) => void;
  apiBase: string;
  targetUrl: string;
}

export const RecordTourModal: React.FC<RecordTourModalProps> = ({
  isOpen,
  onClose,
  onBlueprintCreated,
  apiBase,
  targetUrl
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  const micStreamRef = useRef<MediaStream | null>(null);

  const cleanupStream = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  const handleStartScreenCapture = async () => {
    setErrorMsg('');
    recordedChunksRef.current = [];
    try {
      // 1. Request microphone permission FIRST while tab is in focus
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        micStreamRef.current = micStream;
      } catch (micErr) {
        console.warn('Microphone permission skipped or denied:', micErr);
      }

      // 2. Request browser screen / tab capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      // Combine video track + microphone audio track
      const tracks: MediaStreamTrack[] = [...displayStream.getVideoTracks()];
      if (micStream && micStream.getAudioTracks().length > 0) {
        tracks.push(micStream.getAudioTracks()[0]);
      } else if (displayStream.getAudioTracks().length > 0) {
        tracks.push(displayStream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = displayStream;
        previewVideoRef.current.play().catch(() => {});
      }

      // Detect when user stops sharing via browser chrome bar
      displayStream.getVideoTracks()[0].onended = () => {
        console.log('[Tour] User stopped sharing via browser bar. Finalizing tour...');
        handleStopRecording();
      };

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        cleanupStream();
        setTimeout(() => {
          processRecordedBlob();
        }, 150);
      };

      recorder.start(1000); // 1s slice
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Screen capture cancelled or failed:', err);
      cleanupStream();
      if (err.name !== 'NotAllowedError') {
        setErrorMsg(`Capture failed: ${err.message || 'Permission denied'}`);
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch (_) {}
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const processRecordedBlob = async () => {
    if (recordedChunksRef.current.length === 0) {
      console.warn('[Tour] No recorded chunks collected');
      return;
    }
    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    console.log('[Tour] Recorded blob size:', blob.size, 'bytes');
    if (blob.size < 500) {
      setErrorMsg('Recording was too short. Please record for at least 5 seconds.');
      return;
    }
    const file = new File([blob], `blueprint_tour_${Date.now()}.webm`, { type: 'video/webm' });
    await uploadAndAnalyzeTour(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndAnalyzeTour(file);
  };

  const uploadAndAnalyzeTour = async (videoFile: File) => {
    setIsProcessing(true);
    setProcessingStatus('Uploading your walkthrough tour video to the Director...');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('tourVideo', videoFile);
      formData.append('targetUrl', targetUrl || 'https://krechet.academy');

      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const headers: Record<string, string> = {};
      if (geminiKey) headers['x-gemini-key'] = geminiKey;

      setProcessingStatus('✨ Gemini 3.8 Flash Vision analyzing screen actions, edit triggers & routes...');

      const res = await fetch(`${apiBase}/api/blueprint/tour`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${res.status})`);
      }

      const data = await res.json();
      if (!data.blueprint) {
        throw new Error('No blueprint returned by vision analyzer');
      }

      const newClipsCount = data.newClips?.length || 0;
      setProcessingStatus(
        newClipsCount > 0
          ? `✅ Blueprint verified & ${newClipsCount} authentic clips added to your library!`
          : '✅ Blueprint created and verified! Ready for production.'
      );
      setTimeout(() => {
        setIsProcessing(false);
        onBlueprintCreated(data.blueprint);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Blueprint processing error:', err);
      setErrorMsg(`Analysis error: ${err.message}`);
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
        maxWidth: '680px',
        padding: '1.75rem',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        color: '#f8fafc'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1' }}>
              <span>🗺️</span> Record App Blueprint Tour
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Show the Director what does what and how to get there. Zero pressure, no script needed!
            </p>
          </div>
          <button
            onClick={() => {
              cleanupStream();
              onClose();
            }}
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

        {/* Instructions Card */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          fontSize: '0.82rem',
          color: '#c7d2fe',
          lineHeight: '1.45'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
              🎙️ MIC ACTIVE
            </span>
            <strong>Talk out loud as you click!</strong>
          </div>
          <ul style={{ margin: '6px 0 0', paddingLeft: '1.2rem' }}>
            <li>Click <strong>Start Screen Tour</strong> and select your <code>{targetUrl || 'application'}</code> browser tab.</li>
            <li>Speak casually into your mic while clicking: <em>"Here is the edit button, click here to unlock H1 tags, here is the crisis call..."</em></li>
            <li>Hit <strong>Done</strong>. Gemini Vision watches your clicks AND listens to your voice explanation to create the Master Blueprint!</li>
          </ul>
        </div>

        {/* Live Stream / Camera Preview */}
        {isRecording && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            background: '#090a0f',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={previewVideoRef}
              muted
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(239, 68, 68, 0.9)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ffffff',
                animation: 'pulse 1s infinite'
              }} />
              RECORDING TOUR • {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div style={{
            background: '#181825',
            border: '1px solid #4f46e5',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite' }}>⚙️</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
              {processingStatus}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              The Director is mapping out interactive buttons, edit toggles, and narrative flow...
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.65rem 0.9rem',
            color: '#fca5a5',
            fontSize: '0.82rem'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Controls / Action Buttons */}
        {!isProcessing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!isRecording ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleStartScreenCapture}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.9rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <span>🔴</span> Start Screen Tour (1-Click)
                </button>

                <label style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}>
                  <span>📁</span> Upload Video File
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '1rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)'
                  }}
                >
                  <span>⏹️</span> Finish Tour & Send Blueprint to Director
                </button>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.78rem',
                  color: '#6ee7b7',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  💡 <strong>Easy way to finish:</strong> When you're done talking and clicking on Krechet Academy, just click the browser's blue <strong>[Stop sharing]</strong> bar at the bottom/top of your screen!
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
              Records natively in 1080p from your browser. No extra software or logins required.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
