'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function PatientComfort() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [comfortPhotos, setComfortPhotos] = useState<string[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  
  // Tier-based intervention state
  const [currentTier, setCurrentTier] = useState(1);
  const [showMemoryAnchor, setShowMemoryAnchor] = useState(false);
  const [memoryAnchorOpacity, setMemoryAnchorOpacity] = useState(0);
  const [memoryAnchorPhoto, setMemoryAnchorPhoto] = useState<string | null>(null);
  const [showBreathPacer, setShowBreathPacer] = useState(false);
  const [breathPacerScale, setBreathPacerScale] = useState(1);
  const [breathCycleRate, setBreathCycleRate] = useState(20); // cycles per minute
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const isStreamingRef = useRef(false);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStarted = useRef(false);
  const comfortAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathDecelerationRef = useRef<NodeJS.Timeout | null>(null);

  const saveToLog = (speaker: 'patient' | 'companion' | 'system', text: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('everloved-conversation-log') || '[]');
      existing.push({ timestamp: new Date().toISOString(), speaker, text });
      localStorage.setItem('everloved-conversation-log', JSON.stringify(existing));
    } catch (e) { console.error('Log error:', e); }
  };

  // Circadian color system with smooth transitions
  const getCircadianColors = () => {
    const hours = new Date().getHours();
    
    if (hours >= 6 && hours < 12) {
      // Morning: Cool, bright (>5000K)
      return { bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' };
    }
    if (hours >= 12 && hours < 16) {
      // Afternoon: Neutral daylight (4000-5000K)
      return { bg1: '#FFFEF5', bg2: '#FFF9E6', text: '#3D3D3D' };
    }
    if (hours >= 16 && hours < 20) {
      // Evening/Sundowning: Warm amber (<3000K)
      return { bg1: '#FFF5E6', bg2: '#FFE4CC', text: '#4A3D32' };
    }
    // Night: Very warm, dim (<2500K)
    return { bg1: '#2C1810', bg2: '#1A0F0A', text: '#E8DDD4' };
  };

  const [circadianColors, setCircadianColors] = useState({ bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' });

  const uiColors = {
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
    textMuted: '#8B7355',
  };

  useEffect(() => {
    setMounted(true);
    setCircadianColors(getCircadianColors());
    // Update circadian colors every minute (slow, imperceptible changes)
    const interval = setInterval(() => setCircadianColors(getCircadianColors()), 60000);
    
    try {
      const photos = localStorage.getItem('everloved-memory-photos');
      if (photos) setComfortPhotos(JSON.parse(photos));
    } catch (e) {
      console.error('Error loading comfort photos:', e);
    }
    
    return () => clearInterval(interval);
  }, []);

  const isSessionActive = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everloved-session-active') === 'true';
  };

  const getPrimaryPhoto = () => {
    if (comfortPhotos.length === 0) return null;
    const starredIndex = parseInt(localStorage.getItem('everloved-starred-photo') || '0');
    return comfortPhotos[starredIndex] || comfortPhotos[0];
  };

  // TIER 2: Memory Anchor with slow fade-in (3-5 seconds)
  const showTier2MemoryAnchor = (withMusic: boolean = false) => {
    const photo = getPrimaryPhoto();
    if (!photo) return;
    
    // Stop any Tier 3 interventions
    stopBreathPacer();
    
    setMemoryAnchorPhoto(photo);
    setShowMemoryAnchor(true);
    setMemoryAnchorOpacity(0);
    
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    // Smooth fade-in over 4 seconds
    let progress = 0;
    const duration = 4000;
    const steps = 60;
    const stepDuration = duration / steps;
    
    fadeIntervalRef.current = setInterval(() => {
      progress += 1 / steps;
      const eased = progress * progress * (3 - 2 * progress);
      setMemoryAnchorOpacity(eased);
      
      if (progress >= 1) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        setMemoryAnchorOpacity(1);
      }
    }, stepDuration);
    
    // Start Iso-Principle music if requested
    if (withMusic) {
      startIsoMusicIntervention();
    }
    
    saveToLog('system', 'Tier 2: Memory anchor displayed');
    
    setTimeout(() => hideTier2MemoryAnchor(), 60000);
  };

  const hideTier2MemoryAnchor = () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    let progress = 1;
    const duration = 2000;
    const steps = 30;
    const stepDuration = duration / steps;
    
    fadeIntervalRef.current = setInterval(() => {
      progress -= 1 / steps;
      const eased = Math.max(0, progress * progress * (3 - 2 * progress));
      setMemoryAnchorOpacity(eased);
      
      if (progress <= 0) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        setShowMemoryAnchor(false);
        setMemoryAnchorPhoto(null);
      }
    }, stepDuration);
  };

  // Iso-Principle Music: Start at matched tempo, slowly decelerate
  const startIsoMusicIntervention = () => {
    try {
      const musicData = localStorage.getItem('everloved-music');
      const musicArray = musicData ? JSON.parse(musicData) : [];
      const uploadedMusic = musicArray.length > 0 ? musicArray[0].data : null;
      
      if (uploadedMusic) {
        backgroundMusicRef.current = new Audio(uploadedMusic);
        backgroundMusicRef.current.loop = false;
        backgroundMusicRef.current.volume = 0.3;
        backgroundMusicRef.current.playbackRate = 1.0; // Start at normal rate
        backgroundMusicRef.current.play().catch(console.error);
        
        // Slowly decrease playback rate over 60 seconds (Iso-Principle)
        let rate = 1.0;
        const rateInterval = setInterval(() => {
          rate = Math.max(0.85, rate - 0.005);
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.playbackRate = rate;
          }
          if (rate <= 0.85) clearInterval(rateInterval);
        }, 2000);
      }
    } catch (e) {
      console.error('Error playing music:', e);
    }
  };

  // TIER 3: Abstract Breath Pacer (no photos/memories)
  const startBreathPacer = () => {
    // CRITICAL: Stop all memory-based interventions
    setShowMemoryAnchor(false);
    setMemoryAnchorPhoto(null);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }
    
    setShowBreathPacer(true);
    setBreathCycleRate(22); // Start at agitated rate (~22 cycles/min)
    
    saveToLog('system', 'Tier 3: Breath pacer activated');
    
    // Start breath animation
    let expanding = true;
    breathIntervalRef.current = setInterval(() => {
      setBreathPacerScale(prev => {
        if (expanding) {
          if (prev >= 1.3) { expanding = false; return 1.3; }
          return prev + 0.02;
        } else {
          if (prev <= 0.8) { expanding = true; return 0.8; }
          return prev - 0.02;
        }
      });
    }, 60000 / breathCycleRate / 30); // Adjust interval based on cycle rate
    
    // Decelerate breath rate over 2 minutes (22 -> 6 cycles/min)
    breathDecelerationRef.current = setInterval(() => {
      setBreathCycleRate(prev => {
        const newRate = Math.max(6, prev - 0.5);
        // Update animation speed
        if (breathIntervalRef.current) {
          clearInterval(breathIntervalRef.current);
          let exp = true;
          breathIntervalRef.current = setInterval(() => {
            setBreathPacerScale(p => {
              if (exp) {
                if (p >= 1.3) { exp = false; return 1.3; }
                return p + 0.02;
              } else {
                if (p <= 0.8) { exp = true; return 0.8; }
                return p - 0.02;
              }
            });
          }, 60000 / newRate / 30);
        }
        return newRate;
      });
    }, 5000); // Adjust every 5 seconds
    
    // Start rhythmic audio (simple tone pulsing)
    startRhythmicAudio();
    
    // Auto-dismiss after 3 minutes
    setTimeout(() => stopBreathPacer(), 180000);
  };

  const stopBreathPacer = () => {
    setShowBreathPacer(false);
    if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    if (breathDecelerationRef.current) clearInterval(breathDecelerationRef.current);
    stopRhythmicAudio();
  };

  // Rhythmic audio for Tier 3 (simple, non-melodic)
  const startRhythmicAudio = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 60; // Low, deep tone
      oscillator.type = 'sine';
      gainNode.gain.value = 0;
      
      oscillator.start();
      
      // Pulse the gain to create rhythmic "heartbeat" effect
      let pulseInterval = setInterval(() => {
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      }, 60000 / breathCycleRate / 2);
      
      (window as any).tier3Oscillator = oscillator;
      (window as any).tier3AudioContext = audioContext;
      (window as any).tier3PulseInterval = pulseInterval;
    } catch (e) {
      console.error('Error starting rhythmic audio:', e);
    }
  };

  const stopRhythmicAudio = () => {
    if ((window as any).tier3Oscillator) {
      (window as any).tier3Oscillator.stop();
      (window as any).tier3AudioContext.close();
      clearInterval((window as any).tier3PulseInterval);
    }
  };

  // Handle tier-based interventions
  const handleIntervention = (tier: number, stressIndex: number, state: string, sundowning: boolean) => {
    console.log('Intervention:', { tier, stressIndex, state, sundowning });
    setCurrentTier(tier);
    
    if (tier === 1) {
      // TIER 1: Ambient only - NO active interventions
      // Circadian lighting is handled automatically
      // Do nothing - maintain calm
      saveToLog('system', `Tier 1: Ambient mode (${state})`);
    } else if (tier === 2) {
      // TIER 2: Memory anchor + Iso-Principle music
      showTier2MemoryAnchor(stressIndex > 0.5);
    } else if (tier === 3) {
      // TIER 3: Breath pacer - STOP all memory content
      startBreathPacer();
    }
  };

  const activateKillSwitch = () => {
    setKillSwitchActive(true);
    setIsListening(false);
    setIsProcessing(false);
    setStatusMessage('');
    setShowMemoryAnchor(false);
    stopBreathPacer();
    
    try {
      const musicData = localStorage.getItem('everloved-music');
      const musicArray = musicData ? JSON.parse(musicData) : [];
      const uploadedMusic = musicArray.length > 0 ? musicArray[0].data : null;
      
      if (uploadedMusic) {
        comfortAudioRef.current = new Audio(uploadedMusic);
        comfortAudioRef.current.loop = true;
        comfortAudioRef.current.volume = 0.3;
        comfortAudioRef.current.play().catch(console.error);
      } else {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 528;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        (window as any).killSwitchOscillator = oscillator;
        (window as any).killSwitchAudioContext = audioContext;
      }
    } catch (e) {
      console.error('Error playing comfort audio:', e);
    }
  };

  const resetKillSwitch = () => {
    setKillSwitchActive(false);
    setCurrentTier(1);
    
    if (comfortAudioRef.current) {
      comfortAudioRef.current.pause();
      comfortAudioRef.current = null;
    }
    
    if ((window as any).killSwitchOscillator) {
      (window as any).killSwitchOscillator.stop();
      (window as any).killSwitchAudioContext.close();
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset_kill_switch' }));
    }
  };

  const playAudio = (base64Audio: string) => {
    return new Promise<void>((resolve) => {
      setIsPlaying(true);
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => {
        setIsPlaying(false);
        resolve();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        resolve();
      };
      audio.play().catch(() => {
        setIsPlaying(false);
        resolve();
      });
    });
  };

  const queueAudio = (base64Audio: string) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlayingQueueRef.current) {
      playNextInQueue();
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      // Restart listening after audio finishes
      if (isSessionActive() && failCount < 2) {
        setTimeout(() => startListening(), 1000);
      }
      return;
    }
    
    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    const nextAudio = audioQueueRef.current.shift()!;
    
    const audio = new Audio(`data:audio/mp3;base64,${nextAudio}`);
    audio.onended = () => playNextInQueue();
    audio.onerror = () => playNextInQueue();
    audio.play().catch(() => playNextInQueue());
  };

  const startListening = async () => {
    if (killSwitchActive) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isListening || isPlaying || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      
      // Tell backend to start streaming
      wsRef.current?.send(JSON.stringify({ type: 'start_streaming' }));

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Stream each chunk immediately
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({ type: 'audio_chunk', audio: base64 }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsProcessing(true);
        // Tell backend streaming is done
        wsRef.current?.send(JSON.stringify({ type: 'end_streaming' }));
        stream.getTracks().forEach(track => track.stop());
      };

      // Start with 250ms chunks for real-time streaming
      mediaRecorder.start(250);
      setIsListening(true);
      setStatusMessage('I\'m listening...');

      // No timeout - let patient take as long as needed
      // Deepgram will detect when they finish speaking
      // Conversation ends only via caregiver action or kill switch

    } catch (error) {
      isStreamingRef.current = false;
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
    }
  };
  useEffect(() => {
    if (!mounted) return;
    
    const ws = new WebSocket('wss://ease-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Only start session if caregiver clicked "Start Interaction"
      if (localStorage.getItem('everloved-session-active') === 'true') {
        const patientName = localStorage.getItem('everloved-patient-name') || '';
        const caregiverName = localStorage.getItem('everloved-caregiver-name') || '';
        const lifeStory = localStorage.getItem('everloved-life-story') || '';
        ws.send(JSON.stringify({ type: 'start_session', patientName, caregiverName, lifeStory }));
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'session_started') {
        if (isSessionActive() && !hasAutoStarted.current) {
          hasAutoStarted.current = true;
          setTimeout(() => startListening(), 500);
        }
      } else if (data.type === 'kill_switch') {
        console.log('🚨 Kill switch activated:', data.reason);
        activateKillSwitch();
        localStorage.setItem('everloved-kill-switch', 'true');
        saveToLog('system', 'Kill switch activated: ' + data.reason);
      } else if (data.type === 'speech_complete') {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
        isStreamingRef.current = false;
      } else if (data.type === 'intervention') {
        handleIntervention(data.tier, data.stressIndex, data.state, data.sundowning);
      } else if (data.type === 'transcription') {
        setStatusMessage('You said: "' + data.text + '"');
        saveToLog('patient', data.text);
        setFailCount(0);
      } else if (data.type === 'response_audio_chunk') {
        // Queue audio chunks for sequential playback
        if (data.audio) {
          queueAudio(data.audio);
        }
        if (data.chunkIndex === 0) {
          setStatusMessage(data.text);
        }
      } else if (data.type === 'response_text') {
        if (data.text.includes("didn't catch")) {
          setFailCount(prev => prev + 1);
        }
        setStatusMessage(data.text);
        saveToLog('companion', data.text);
        // Only play audio if no chunks were sent (fallback)
        if (data.audio && audioQueueRef.current.length === 0 && !isPlayingQueueRef.current) {
          await playAudio(data.audio);
        }
      } else if (data.type === 'response_audio') {
        setIsProcessing(false);
        await playAudio(data.audio);
        
        if (isSessionActive() && failCount < 2) {
          setTimeout(() => startListening(), 1000);
        } else if (failCount >= 2) {
          setStatusMessage("I'm having trouble hearing. Tap the screen when you're ready to talk.");
          setFailCount(0);
        }
      } else if (data.type === 'response_end') {
        setIsProcessing(false);
        if (!isPlaying && isSessionActive() && failCount < 2) {
          setTimeout(() => startListening(), 1000);
        }
      } else if (data.type === 'error') {
        setIsProcessing(false);
        setStatusMessage('Let me try again...');
        if (isSessionActive()) {
          setTimeout(() => startListening(), 1500);
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!killSwitchActive) {
        setStatusMessage('Reconnecting...');
        setTimeout(() => window.location.reload(), 3000);
      }
    };

    return () => {
      ws.close();
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      if (breathDecelerationRef.current) clearInterval(breathDecelerationRef.current);
    };
  }, [mounted, failCount, killSwitchActive]);

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleScreenTap = () => {
    if (showMemoryAnchor) {
      hideTier2MemoryAnchor();
      return;
    }
    
    if (showBreathPacer) {
      // Don't dismiss breath pacer with tap - it's therapeutic
      return;
    }
    
    if (killSwitchActive) return;
    
    setFailCount(0);
    if (isListening) stopListening();
    else if (!isPlaying && !isProcessing) startListening();
  };

  // Kill switch UI
  if (killSwitchActive) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,149,237,0.6) 0%, rgba(100,149,237,0.1) 70%)',
          animation: 'pulse 4s ease-in-out infinite',
          marginBottom: '60px',
        }} />
        
        <p style={{
          color: '#a0c4ff',
          fontSize: '1.5rem',
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: 1.8,
          fontWeight: 300,
        }}>
          Everything is okay.
          <br />
          Just relax and breathe.
        </p>

        <Link
          href="/caregiver/monitoring"
          onClick={(e) => {
            e.preventDefault();
            resetKillSwitch();
          }}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          Caregiver Reset
        </Link>

        <style jsx>{`
          @keyframes photoBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Link 
        href="/caregiver/monitoring" 
        style={{ 
          position: 'absolute', top: '16px', right: '16px', zIndex: 10,
          padding: '10px 20px', borderRadius: '20px', 
          background: uiColors.cardBg, color: uiColors.textMuted, 
          fontWeight: 500, fontSize: '0.85rem', textDecoration: 'none', 
          border: '1px solid ' + uiColors.cardBorder, backdropFilter: 'blur(10px)',
        }}
      >
        Monitoring Dashboard
      </Link>

      <div
        onClick={handleScreenTap}
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, ' + circadianColors.bg1 + ' 0%, ' + circadianColors.bg2 + ' 100%)',
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px', 
          cursor: 'pointer', 
          transition: 'background 15s ease', // Slow circadian transition
          position: 'relative',
          gap: '40px',
        }}
      >
        {/* TIER 3: Breath Pacer (abstract, no photos) */}
        {showBreathPacer && (
          <div style={{
            position: 'absolute',
            right: '10%',
            width: '600px',
            height: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(100,180,200,0.5) 0%, rgba(80,150,180,0.2) 70%)',
              transform: `scale(${breathPacerScale})`,
              transition: 'transform 0.1s ease-out',
              boxShadow: '0 0 60px rgba(100,180,200,0.3)',
            }} />
          </div>
        )}

        {/* TIER 2: Memory Anchor Photo (side placement) */}
        {showMemoryAnchor && memoryAnchorPhoto && !showBreathPacer && (
          <div style={{
            flex: '0 0 auto',
            width: '35vw',
            maxWidth: '400px',
            opacity: memoryAnchorOpacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: `0 10px 40px rgba(0,0,0,${0.15 * memoryAnchorOpacity})`,
              border: "4px solid rgba(255,255,255,0.3)", animation: "photoBreath 4s ease-in-out infinite",
            }}>
              <img 
                src={memoryAnchorPhoto} 
                alt="Memory"
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '50vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <p style={{
              color: circadianColors.text,
              fontSize: '0.9rem',
              opacity: 0.5 * memoryAnchorOpacity,
              marginTop: '12px',
              textAlign: 'center',
            }}>
              Tap to dismiss
            </p>
          </div>
        )}

        {/* Main content area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <img src="/puppy.png" alt="Comfort companion" style={{ width: '600px', height: '600px', objectFit: 'contain' }} />
          </div>

          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: isConnected ? (isListening ? '#E74C3C' : isPlaying ? '#3498DB' : isProcessing ? '#F39C12' : '#7A9B6D') : '#999',
            marginBottom: '20px',
          }} />

          {statusMessage && (
            <p style={{
              color: circadianColors.text, fontSize: '1.8rem', textAlign: 'center',
              maxWidth: '500px', lineHeight: 1.6, fontWeight: 300,
            }}>
              {statusMessage}
            </p>
          )}

          {isListening && (
            <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
              🎙️ Listening...
            </p>
          )}

          {isPlaying && (
            <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
              🔊 Speaking...
            </p>
          )}

          {isProcessing && !isPlaying && (
            <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
              💭 Thinking...
            </p>
          )}
          
          {showBreathPacer && (
            <p style={{ color: circadianColors.text, opacity: 0.6, marginTop: '20px', fontSize: '1rem' }}>
              Breathe with the light...
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes photoBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
