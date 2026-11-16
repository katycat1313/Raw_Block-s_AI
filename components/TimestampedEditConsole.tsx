import React, { useState, useEffect, useRef } from 'react';
import { VoiceSelector } from './VoiceSelector';

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:3001`
  : '';

const normalizeUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

export interface VideoEditNote {
  id: string;
  timestamp: number;      // Seconds (start)
  endTime?: number;       // Seconds (end, optional for range edits)
  timecode: string;       // Formatted "00:14" or "00:04 - 00:09"
  category: 'voice' | 'script' | 'trim' | 'visual' | 'segment' | 'general';
  instruction: string;
}

interface TimestampedEditConsoleProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onVideoUpdated: (newUrl: string) => void;
  selectedVoice?: string;
  selectedMusicId?: string;
}

export const TimestampedEditConsole: React.FC<TimestampedEditConsoleProps> = ({
  videoRef,
  videoUrl,
  onVideoUpdated,
  selectedVoice = 'aura-angus-en',
  selectedMusicId = 'chill_tech_ambient.mp3'
}) => {
  // Playback & Video State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeVoice, setActiveVoice] = useState(selectedVoice);
  const [activeMusic, setActiveMusic] = useState(selectedMusicId);

  useEffect(() => {
    if (selectedVoice) setActiveVoice(selectedVoice);
  }, [selectedVoice]);

  // Segment Selection State (Start Time & End Time)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(5);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [isLoopingSegment, setIsLoopingSegment] = useState<boolean>(false);

  // References for reliable event listener access
  const isAuditioningRef = useRef(false);
  const isLoopingRef = useRef(false);
  const startTimeRef = useRef(0);
  const endTimeRef = useRef(5);

  useEffect(() => {
    isAuditioningRef.current = isAuditioning;
  }, [isAuditioning]);

  useEffect(() => {
    isLoopingRef.current = isLoopingSegment;
  }, [isLoopingSegment]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    endTimeRef.current = endTime;
  }, [endTime]);

  // Segment Action Tools Mode: 'slice' | 'omni' | 'note'
  const [activeSegmentTab, setActiveSegmentTab] = useState<'slice' | 'omni' | 'note'>('slice');
  const [segmentSliceLabel, setSegmentSliceLabel] = useState('');
  const [omniPrompt, setOmniPrompt] = useState('');
  const [isSlicing, setIsSlicing] = useState(false);
  const [isOmniTransforming, setIsOmniTransforming] = useState(false);

  // General Edit Notes Form State
  const [selectedCategory, setSelectedCategory] = useState<VideoEditNote['category']>('voice');
  const [instructionText, setInstructionText] = useState('');
  const [editNotes, setEditNotes] = useState<VideoEditNote[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Format seconds to MM:SS.S
  const formatTime = (secs: number) => {
    const safe = Math.max(0, isNaN(secs) ? 0 : secs);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    const ms = Math.floor((safe % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const formatShortTime = (secs: number) => {
    const safe = Math.max(0, isNaN(secs) ? 0 : secs);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync with video player time & events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const cur = video.currentTime || 0;
      setCurrentTime(cur);

      // Handle Segment Audition & Looping
      if (isAuditioningRef.current) {
        if (cur >= endTimeRef.current) {
          if (isLoopingRef.current) {
            video.currentTime = startTimeRef.current;
            video.play().catch(() => {});
          } else {
            video.pause();
            setIsAuditioning(false);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      const dur = video.duration || 0;
      setDuration(dur);
      if (dur > 0 && endTimeRef.current === 5) {
        const initialEnd = Math.min(dur, 5);
        setEndTime(initialEnd);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      setIsAuditioning(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    if (video.duration) {
      setDuration(video.duration);
      if (endTimeRef.current === 5 && video.duration < 5) {
        setEndTime(video.duration);
      }
    }
    if (video.currentTime) setCurrentTime(video.currentTime);
    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, videoUrl]);

  // Video Transport Play / Pause
  const handleTogglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  // Frame / Step Jogging
  const handleStep = (deltaSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const target = Math.max(0, Math.min(duration || 9999, (video.currentTime || 0) + deltaSec));
    video.currentTime = target;
    setCurrentTime(target);
  };

  // Seek video directly
  const handleSeekTo = (secs: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(duration || 9999, secs));
      video.pause();
      setCurrentTime(secs);
    }
  };

  // Timeline click / drag handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    handleSeekTo(targetTime);
  };

  // Set Start Time (In Point)
  const handleSetStartTime = (val?: number) => {
    const cur = typeof val === 'number' ? val : (videoRef.current ? videoRef.current.currentTime : currentTime);
    const validStart = Math.max(0, Math.min(duration || 9999, cur));
    setStartTime(validStart);
    if (endTime <= validStart) {
      const newEnd = Math.min(duration || validStart + 5, validStart + 5);
      setEndTime(newEnd);
    }
  };

  // Set End Time (Out Point)
  const handleSetEndTime = (val?: number) => {
    const cur = typeof val === 'number' ? val : (videoRef.current ? videoRef.current.currentTime : currentTime);
    const validEnd = Math.max(startTime + 0.2, Math.min(duration || 9999, cur));
    setEndTime(validEnd);
  };

  // Play Segment from Start to End
  const handlePlaySegment = (loop = false) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startTime;
    setIsAuditioning(true);
    setIsLoopingSegment(loop);
    video.play().catch(console.error);
  };

  // Stop Audition
  const handleStopAudition = () => {
    const video = videoRef.current;
    if (video) video.pause();
    setIsAuditioning(false);
    setIsLoopingSegment(false);
  };

  // Quick Preset Chips for Edit Notes
  const applyPreset = (category: VideoEditNote['category'], text: string) => {
    setSelectedCategory(category);
    setInstructionText(text);
  };

  // Add a marked edit note (single timestamp or segment range)
  const handleAddNote = () => {
    if (!instructionText.trim()) return;

    const isRange = activeSegmentTab === 'note' && Math.abs(endTime - startTime) > 0.3;
    const timecodeStr = isRange
      ? `${formatShortTime(startTime)} - ${formatShortTime(endTime)} (${(endTime - startTime).toFixed(1)}s)`
      : formatShortTime(currentTime);

    const newNote: VideoEditNote = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: isRange ? startTime : currentTime,
      endTime: isRange ? endTime : undefined,
      timecode: timecodeStr,
      category: isRange ? 'segment' : selectedCategory,
      instruction: instructionText.trim()
    };

    setEditNotes((prev) => [...prev, newNote].sort((a, b) => a.timestamp - b.timestamp));
    setInstructionText('');
    setStatusMessage(`Added edit note at [${timecodeStr}]`);
  };

  // Remove a marked note
  const handleRemoveNote = (id: string) => {
    setEditNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Action 1: Slice & Save Segment to Library
  const handleSliceSegment = async () => {
    if (!videoUrl) {
      alert('No video loaded to slice.');
      return;
    }
    const segmentLength = endTime - startTime;
    if (segmentLength < 0.3) {
      alert('Segment must be at least 0.3 seconds long.');
      return;
    }

    setIsSlicing(true);
    setStatusMessage(`✂️ Slicing segment ${formatTime(startTime)} → ${formatTime(endTime)} (${segmentLength.toFixed(1)}s)...`);

    try {
      const res = await fetch(`${API_BASE}/api/segment/slice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          startTime,
          endTime,
          label: segmentSliceLabel.trim() || `Segment [${formatShortTime(startTime)} - ${formatShortTime(endTime)}]`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to slice segment');

      setStatusMessage(`🎉 Segment sliced & saved to Clip Library! (${data.clip?.originalName || 'New Clip'})`);
      setSegmentSliceLabel('');
    } catch (err: any) {
      console.error('Slice error:', err);
      setStatusMessage(`⚠️ Error slicing segment: ${err.message}`);
    } finally {
      setIsSlicing(false);
    }
  };

  // Action 2: Transform Segment with Gemini Omni
  const handleOmniTransform = async () => {
    if (!videoUrl) {
      alert('No video loaded to transform.');
      return;
    }
    if (!omniPrompt.trim()) {
      alert('Please enter a transformation prompt describing how Gemini Omni should edit this segment.');
      return;
    }

    setIsOmniTransforming(true);
    setStatusMessage(`✨ Gemini Omni transforming segment ${formatShortTime(startTime)} → ${formatShortTime(endTime)} with prompt: "${omniPrompt}"...`);

    try {
      const res = await fetch(`${API_BASE}/api/segment/omni-transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          startTime,
          endTime,
          prompt: omniPrompt.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to transform segment');

      setStatusMessage(`🎉 Gemini Omni transformation complete! Updated segment rendered.`);
      if (data.videoUrl) {
        onVideoUpdated(normalizeUrl(data.videoUrl));
      }
      setOmniPrompt('');
    } catch (err: any) {
      console.error('Omni transform error:', err);
      setStatusMessage(`⚠️ Gemini Omni error: ${err.message}`);
    } finally {
      setIsOmniTransforming(false);
    }
  };

  // Master Action: Apply all edits via AI Director
  const handleApplyEdits = async () => {
    if (editNotes.length === 0 && !instructionText.trim()) {
      alert('Please add at least one timestamped edit note or type your instruction.');
      return;
    }

    let notesToSubmit = [...editNotes];
    if (instructionText.trim()) {
      const pending: VideoEditNote = {
        id: `edit_${Date.now()}`,
        timestamp: startTime,
        endTime,
        timecode: `${formatShortTime(startTime)} - ${formatShortTime(endTime)}`,
        category: selectedCategory,
        instruction: instructionText.trim()
      };
      notesToSubmit.push(pending);
      setEditNotes(notesToSubmit);
      setInstructionText('');
    }

    setIsApplying(true);
    setStatusMessage('🤖 AI Director analyzing timestamped segment notes & re-mastering video with natural voice...');

    try {
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const deepgramKey = localStorage.getItem('DEEPGRAM_API_KEY') || '';

      const res = await fetch(`${API_BASE}/api/video-feedback/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          edits: notesToSubmit,
          selectedVoice: activeVoice,
          selectedMusicId: activeMusic,
          geminiKey,
          deepgramKey
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply edits');

      setStatusMessage('🎉 Edits applied successfully! Video re-mastered with studio voiceover.');
      if (data.updatedVideoUrl) {
        onVideoUpdated(normalizeUrl(data.updatedVideoUrl));
      }
    } catch (err: any) {
      console.error('Apply edits error:', err);
      setStatusMessage(`⚠️ Error: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const segmentLength = Math.max(0, endTime - startTime);
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const widthPercent = duration > 0 ? Math.min(100 - startPercent, (segmentLength / duration) * 100) : 0;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      marginTop: '1.25rem',
      background: 'linear-gradient(180deg, #13121f 0%, #0d0c15 100%)',
      border: '1px solid #2d2b45',
      borderRadius: '14px',
      padding: '1.25rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
      textAlign: 'left'
    }}>
      {/* 1. Header & Live Timecode Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>✂️</span> Video Segment Selector & Timestamped Director
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Pause video, select exact start & end times of any segment, slice to library, or transform with Gemini Omni.
          </span>
        </div>

        {/* Live Playhead Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: isPlaying ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: isPlaying ? '1px solid #10b981' : '1px solid #ef4444',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: isPlaying ? '#34d399' : '#f87171',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {isPlaying ? '● PLAYING' : '⏸ PAUSED'}
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '8px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.82rem',
            color: '#a5b4fc',
            fontWeight: 700
          }}>
            <span>⏱️ Playhead:</span>
            <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
            {duration > 0 && <span style={{ color: '#64748b', fontFamily: 'monospace' }}>/ {formatTime(duration)}</span>}
          </div>
        </div>
      </div>

      {/* 2. Unified Video Transport Bar (Play/Pause, Frame Steps, Jump) */}
      <div style={{
        background: '#090a0f',
        border: '1px solid #25243b',
        borderRadius: '10px',
        padding: '0.65rem 0.85rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Play/Pause & Step Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTogglePlayPause}
            style={{
              background: isPlaying ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: isPlaying ? '0 2px 8px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(16, 185, 129, 0.4)'
            }}
          >
            <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleStep(-1)}
            title="Step back 1 second"
            style={{
              background: '#1a1928',
              border: '1px solid #363452',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ◀◀ -1s
          </button>

          <button
            type="button"
            onClick={() => handleStep(-0.1)}
            title="Step back 1 frame (0.1s)"
            style={{
              background: '#1a1928',
              border: '1px solid #363452',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ◀ -0.1s
          </button>

          <button
            type="button"
            onClick={() => handleStep(0.1)}
            title="Step forward 1 frame (0.1s)"
            style={{
              background: '#1a1928',
              border: '1px solid #363452',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            +0.1s ▶
          </button>

          <button
            type="button"
            onClick={() => handleStep(1)}
            title="Step forward 1 second"
            style={{
              background: '#1a1928',
              border: '1px solid #363452',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            +1s ▶▶
          </button>

          <button
            type="button"
            onClick={() => handleSeekTo(0)}
            title="Jump to beginning"
            style={{
              background: '#141322',
              border: '1px solid #2a2942',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            ⏮ 00:00
          </button>
        </div>

        {/* Set In/Out Quick Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => handleSetStartTime()}
            title="Set Segment Start (In Point) to current playhead"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>[</span> Mark In (Start)
          </button>

          <button
            type="button"
            onClick={() => handleSetEndTime()}
            title="Set Segment End (Out Point) to current playhead"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid #a855f7',
              color: '#c084fc',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            Mark Out (End) <span>]</span>
          </button>
        </div>
      </div>

      {/* 3. Interactive Visual Segment Scrubber & Timeline Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Interactive Segment Timeline (Click to scrub playhead):</span>
          <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>
            Segment: {formatTime(startTime)} → {formatTime(endTime)} ({segmentLength.toFixed(1)}s)
          </span>
        </div>

        <div
          onClick={handleTimelineClick}
          style={{
            position: 'relative',
            height: '28px',
            background: '#090a0f',
            border: '1px solid #2d2b45',
            borderRadius: '6px',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          {/* Highlighted Selected Segment Band */}
          {duration > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                top: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%)',
                borderLeft: '2px solid #38bdf8',
                borderRight: '2px solid #a855f7',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
              }}
            />
          )}

          {/* Current Playhead Line */}
          {duration > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${playheadPercent}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#ffffff',
                boxShadow: '0 0 8px #ffffff',
                zIndex: 2,
                pointerEvents: 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-4px',
                width: '10px',
                height: '6px',
                background: '#ffffff',
                borderRadius: '2px'
              }} />
            </div>
          )}

          {/* Start (In) Marker Label */}
          {duration > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${startPercent}%`,
                bottom: '2px',
                transform: 'translateX(2px)',
                fontSize: '0.65rem',
                color: '#38bdf8',
                fontWeight: 800,
                pointerEvents: 'none',
                zIndex: 3
              }}
            >
              [IN: {formatShortTime(startTime)}]
            </div>
          )}

          {/* End (Out) Marker Label */}
          {duration > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${startPercent + widthPercent}%`,
                bottom: '2px',
                transform: 'translateX(-100%)',
                fontSize: '0.65rem',
                color: '#a855f7',
                fontWeight: 800,
                pointerEvents: 'none',
                zIndex: 3
              }}
            >
              [OUT: {formatShortTime(endTime)}]
            </div>
          )}
        </div>
      </div>

      {/* 4. Segment Control Panel: Start Time, End Time & Audition */}
      <div style={{
        background: '#090a0f',
        border: '1px solid #29283e',
        borderRadius: '10px',
        padding: '0.85rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Start Time (In) Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>Start Time (In):</span>
          <button
            type="button"
            onClick={() => handleSetStartTime(Math.max(0, startTime - 0.5))}
            style={{ background: '#1c1b2c', border: '1px solid #393755', color: '#cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            -0.5s
          </button>
          <input
            type="number"
            step="0.1"
            min="0"
            max={duration || 9999}
            value={parseFloat(startTime.toFixed(2))}
            onChange={(e) => handleSetStartTime(parseFloat(e.target.value) || 0)}
            style={{
              width: '64px',
              background: '#13121f',
              border: '1px solid #38bdf8',
              borderRadius: '4px',
              color: '#38bdf8',
              padding: '3px 6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              textAlign: 'center'
            }}
          />
          <button
            type="button"
            onClick={() => handleSetStartTime(Math.min(endTime - 0.2, startTime + 0.5))}
            style={{ background: '#1c1b2c', border: '1px solid #393755', color: '#cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            +0.5s
          </button>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({formatTime(startTime)})</span>
        </div>

        {/* End Time (Out) Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#a855f7', fontWeight: 700 }}>End Time (Out):</span>
          <button
            type="button"
            onClick={() => handleSetEndTime(Math.max(startTime + 0.2, endTime - 0.5))}
            style={{ background: '#1c1b2c', border: '1px solid #393755', color: '#cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            -0.5s
          </button>
          <input
            type="number"
            step="0.1"
            min={startTime + 0.2}
            max={duration || 9999}
            value={parseFloat(endTime.toFixed(2))}
            onChange={(e) => handleSetEndTime(parseFloat(e.target.value) || (startTime + 0.5))}
            style={{
              width: '64px',
              background: '#13121f',
              border: '1px solid #a855f7',
              borderRadius: '4px',
              color: '#c084fc',
              padding: '3px 6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              textAlign: 'center'
            }}
          />
          <button
            type="button"
            onClick={() => handleSetEndTime(Math.min(duration || 9999, endTime + 0.5))}
            style={{ background: '#1c1b2c', border: '1px solid #393755', color: '#cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            +0.5s
          </button>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({formatTime(endTime)})</span>
        </div>

        {/* Audition & Loop Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => handlePlaySegment(false)}
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>▶</span> Play Segment
          </button>

          <button
            type="button"
            onClick={() => handlePlaySegment(true)}
            style={{
              background: isLoopingSegment ? '#6366f1' : 'rgba(99, 102, 241, 0.2)',
              border: '1px solid #6366f1',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>🔁</span> Loop Segment
          </button>

          {isAuditioning && (
            <button
              type="button"
              onClick={handleStopAudition}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* 5. Segment Action Tabs: [Slice & Save] | [Gemini Omni Transform] | [Director Note] */}
      <div style={{
        background: '#090a0f',
        border: '1px solid #2d2b45',
        borderRadius: '10px',
        padding: '0.85rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #25243b', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveSegmentTab('slice')}
            style={{
              background: activeSegmentTab === 'slice' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: activeSegmentTab === 'slice' ? '1px solid #38bdf8' : 'none',
              color: activeSegmentTab === 'slice' ? '#38bdf8' : '#94a3b8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✂️ 1. Slice & Save to Clip Library
          </button>

          <button
            type="button"
            onClick={() => setActiveSegmentTab('omni')}
            style={{
              background: activeSegmentTab === 'omni' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: activeSegmentTab === 'omni' ? '1px solid #a855f7' : 'none',
              color: activeSegmentTab === 'omni' ? '#c084fc' : '#94a3b8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✨ 2. Transform with Gemini Omni
          </button>

          <button
            type="button"
            onClick={() => setActiveSegmentTab('note')}
            style={{
              background: activeSegmentTab === 'note' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: activeSegmentTab === 'note' ? '1px solid #818cf8' : 'none',
              color: activeSegmentTab === 'note' ? '#c7d2fe' : '#94a3b8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📝 3. Queue Edit Note for AI Director
          </button>
        </div>

        {/* Tab 1: Slice Segment to Library */}
        {activeSegmentTab === 'slice' && (
          <div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Cut this exact segment (<span style={{ color: '#38bdf8', fontWeight: 700 }}>{formatTime(startTime)} → {formatTime(endTime)}</span>, {segmentLength.toFixed(1)}s) with audio preserved, generate a thumbnail, and save it into your permanent Clip Library.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={segmentSliceLabel}
                onChange={(e) => setSegmentSliceLabel(e.target.value)}
                placeholder={`Clip Label (e.g. "Customer Problem Setup ${formatShortTime(startTime)}")`}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: '#13121f',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  padding: '6px 10px',
                  fontSize: '0.8rem'
                }}
              />
              <button
                type="button"
                onClick={handleSliceSegment}
                disabled={isSlicing || segmentLength < 0.3}
                style={{
                  background: isSlicing ? '#334155' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isSlicing ? 'not-allowed' : 'pointer'
                }}
              >
                {isSlicing ? '⏳ Slicing...' : '✂️ Slice Segment to Library'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Gemini Omni Segment Transformation */}
        {activeSegmentTab === 'omni' && (
          <div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Send this segment (<span style={{ color: '#c084fc', fontWeight: 700 }}>{formatTime(startTime)} → {formatTime(endTime)}</span>) to <strong style={{ color: '#facc15' }}>Gemini Omni 1.2 Flash</strong> for video-to-video editing (relighting, background replacement, cinematic grading, style transfer).
            </div>
            <textarea
              rows={2}
              value={omniPrompt}
              onChange={(e) => setOmniPrompt(e.target.value)}
              placeholder={`Gemini Omni prompt (e.g. "Relight scene with warm late-afternoon golden hour glow, make the lighting cinematic and grounded, remove artificial flare")`}
              style={{
                width: '100%',
                background: '#13121f',
                border: '1px solid #4338ca',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '6px 10px',
                fontSize: '0.82rem',
                boxSizing: 'border-box',
                marginBottom: '0.5rem'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleOmniTransform}
                disabled={isOmniTransforming || !omniPrompt.trim()}
                style={{
                  background: isOmniTransforming ? '#334155' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isOmniTransforming || !omniPrompt.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)'
                }}
              >
                {isOmniTransforming ? '⏳ Gemini Omni Transforming...' : '✨ Transform Segment with Omni'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Queue Segment Note */}
        {activeSegmentTab === 'note' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                Note Range: <strong style={{ color: '#a5b4fc' }}>{formatShortTime(startTime)} → {formatShortTime(endTime)} ({segmentLength.toFixed(1)}s)</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  style={{
                    background: '#13121f',
                    border: '1px solid #3b3856',
                    color: '#cbd5e1',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="voice">🎙️ Voice & Tone</option>
                  <option value="script">📝 Script & Copy</option>
                  <option value="trim">✂️ Trim & Pacing</option>
                  <option value="visual">🔄 Visual Clip</option>
                  <option value="segment">🎞️ Segment Range</option>
                  <option value="general">💬 General Note</option>
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              placeholder={`Describe the change for this segment (e.g. "Change spoken words to: Jenny is bleeding $28 to acquire an $18 coffee customer. Make the narration punchy.")`}
              style={{
                width: '100%',
                background: '#13121f',
                border: '1px solid #2b2940',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                padding: '0.65rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('voice', 'Make voice natural and energetic here, not robotic.')}
                  style={{ background: '#1a1928', border: '1px solid #2e2c48', color: '#94a3b8', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  🎙️ Natural Tone
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('script', 'Rewrite spoken narration here to: ')}
                  style={{ background: '#1a1928', border: '1px solid #2e2c48', color: '#94a3b8', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  📝 Rewrite Words
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('trim', `Trim / shorten this ${segmentLength.toFixed(1)}s section.`)}
                  style={{ background: '#1a1928', border: '1px solid #2e2c48', color: '#94a3b8', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  ✂️ Trim
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddNote}
                disabled={!instructionText.trim()}
                style={{
                  background: instructionText.trim() ? '#4f46e5' : '#1e1d2d',
                  color: instructionText.trim() ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: instructionText.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                ➕ Queue Segment Note [{formatShortTime(startTime)} - {formatShortTime(endTime)}]
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Human Voiceover Engine Selector (Solves Robotic Voice) */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🎙️</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#34d399' }}>
              Human Voiceover Engine (All 54 Deepgram Aura-2, Aura-1 & Flux Voices)
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Replaces robotic synthetic speech with broadcast-quality founder narration
            </div>
          </div>
        </div>

        <VoiceSelector
          value={activeVoice}
          onChange={setActiveVoice}
          apiBase={API_BASE}
          label=""
          compact
          borderColor="#10b981"
          backgroundColor="#090a0f"
        />
      </div>

      {/* 7. Marked Edits Queue List */}
      {editNotes.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>📋</span> Marked Edits for AI Director ({editNotes.length}):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
            {editNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#090a0f',
                  border: '1px solid #232238',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  fontSize: '0.78rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                  {/* Clickable Timestamp */}
                  <button
                    type="button"
                    onClick={() => handleSeekTo(note.timestamp)}
                    title="Click to seek playhead"
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    ⏱️ {note.timecode}
                  </button>

                  <span style={{
                    fontSize: '0.7rem',
                    color: note.category === 'voice' ? '#34d399' : note.category === 'script' ? '#38bdf8' : note.category === 'trim' ? '#f87171' : note.category === 'segment' ? '#c084fc' : '#fbbf24',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    [{note.category}]
                  </span>

                  <span style={{ color: '#e2e8f0', flex: 1 }}>
                    {note.instruction}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveNote(note.id)}
                  title="Remove this edit"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '2px 5px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Status Alert */}
      {statusMessage && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          background: statusMessage.startsWith('🎉') ? 'rgba(16, 185, 129, 0.15)' : statusMessage.startsWith('⚠️') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          border: statusMessage.startsWith('🎉') ? '1px solid #10b981' : statusMessage.startsWith('⚠️') ? '1px solid #ef4444' : '1px solid #818cf8',
          color: '#ffffff',
          fontSize: '0.8rem',
          marginBottom: '0.85rem'
        }}>
          {statusMessage}
        </div>
      )}

      {/* 9. Master Execution Button */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleApplyEdits}
          disabled={isApplying || (editNotes.length === 0 && !instructionText.trim())}
          style={{
            background: isApplying
              ? 'rgba(99, 102, 241, 0.3)'
              : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.65rem 1.6rem',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: isApplying || (editNotes.length === 0 && !instructionText.trim()) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <span>{isApplying ? '⏳' : '⚡'}</span>
          <span>{isApplying ? 'AI Director Applying Edits...' : 'Apply Queued Edits & Re-Master Video'}</span>
        </button>
      </div>
    </div>
  );
};
