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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [screenDimmed, setScreenDimmed] = useState(false);
  
  // Memory Anchor Photo State (Dr. Elahi Protocol)
  const [showMemoryAnchor, setShowMemoryAnchor] = useState(false);
  const [memoryAnchorOpacity, setMemoryAnchorOpacity] = useState(0);
  const [memoryAnchorPhoto, setMemoryAnchorPhoto] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStarted = useRef(false);
  const comfortAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveToLog = (speaker: 'patient' | 'companion' | 'system', text: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('everloved-conversation-log') || '[]');
      existing.push({ timestamp: new Date().toISOString(), speaker, text });
      localStorage.setItem('everloved-conversation-log', JSON.stringify(existing));
    } catch (e) { console.error('Log error:', e); }
  };

  const getCircadianColors = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 300 && totalMinutes < 420) {
      return { bg1: '#FFF5E6', bg2: '#FFE4CC', text: '#4A3D32' };
    }
    if (totalMinutes >= 420 && totalMinutes < 1020) {
      return { bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' };
    }
    if (totalMinutes >= 1020 && totalMinutes < 1260) {
      return { bg1: '#3D2914', bg2: '#2C1810', text: '#E8DDD4' };
    }
    return { bg1: '#2C1810', bg2: '#1A0F0A', text: '#E8DDD4' };
  };

  const [circadianColors, setCircadianColors] = useState({ bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' });

  const uiColors = {
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
    textMuted: '#8B7355',
  };

  const isSundowningWindow = () => {
    const hours = new Date().getHours();
    return hours >= 16 && hours < 20;
  };

  useEffect(() => {
    setMounted(true);
    setCircadianColors(getCircadianColors());
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

  // Get the starred/primary photo, or first available
  const getPrimaryPhoto = () => {
    if (comfortPhotos.length === 0) return null;
    const starredIndex = parseInt(localStorage.getItem('everloved-starred-photo') || '0');
    return comfortPhotos[starredIndex] || comfortPhotos[0];
  };

  // Memory Anchor: Slow fade-in over 4 seconds (Dr. Elahi Protocol)
  const showMemoryAnchorPhoto = (withAudio: boolean = false) => {
    const photo = getPrimaryPhoto();
    if (!photo) return;
    
    setMemoryAnchorPhoto(photo);
    setShowMemoryAnchor(true);
    setMemoryAnchorOpacity(0);
    
    // Clear any existing fade
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    // Smooth fade-in over 4 seconds (ease-in-out approximation)
    let progress = 0;
    const duration = 4000; // 4 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    
    fadeIntervalRef.current = setInterval(() => {
      progress += 1 / steps;
      // Ease-in-out curve: 3t^2 - 2t^3
      const eased = progress * progress * (3 - 2 * progress);
      setMemoryAnchorOpacity(eased);
      
      if (progress >= 1) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        setMemoryAnchorOpacity(1);
      }
    }, stepDuration);
    
    // Multi-modal sync hook: Start 528Hz-anchored audio if requested
    if (withAudio) {
      startBackgroundMusic();
    }
    
    saveToLog('system', 'Memory anchor photo displayed (fade-in)');
    
    // Auto-dismiss after 45 seconds with fade-out
    setTimeout(() => {
      hideMemoryAnchorPhoto();
    }, 45000);
  };

  const hideMemoryAnchorPhoto = () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    // Fade out over 2 seconds
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

  // Play background comfort music (528Hz-anchored audio from peak memory era)
  const startBackgroundMusic = () => {
    try {
      const musicData = localStorage.getItem('everloved-music');
      const musicArray = musicData ? JSON.parse(musicData) : [];
      const uploadedMusic = musicArray.length > 0 ? musicArray[0].data : null;
      
      if (uploadedMusic) {
        backgroundMusicRef.current = new Audio(uploadedMusic);
        backgroundMusicRef.current.loop = false; // Play full track once
        backgroundMusicRef.current.volume = 0.25;
        backgroundMusicRef.current.play().catch(console.error);
      }
    } catch (e) {
      console.error('Error playing background music:', e);
    }
  };

  const stopBackgroundMusic = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }
  };

  // Handle comfort interventions based on severity (Dr. Elahi Protocol)
  const handleComfortIntervention = (severity: number, state: string) => {
    console.log('Comfort intervention:', severity, state);
    saveToLog('system', `Comfort level ${severity}: ${state}`);
    
    const sundowning = isSundowningWindow();
    
    if (severity === 1 || (sundowning && severity >= 1)) {
      // Mild distress OR sundowning: Memory Anchor photo (no overlay, side placement)
      showMemoryAnchorPhoto(false);
    } else if (severity === 2) {
      // Moderate: Memory Anchor photo + background music (multi-modal)
      showMemoryAnchorPhoto(true);
    } else if (severity >= 3) {
      // Severe: Music only, dim screen (reduce visual stimulation)
      setScreenDimmed(true);
      startBackgroundMusic();
      setTimeout(() => {
        setScreenDimmed(false);
      }, 45000);
    }
  };

  const activateKillSwitch = () => {
    setKillSwitchActive(true);
    setIsListening(false);
    setIsProcessing(false);
    setStatusMessage('');
    setShowMemoryAnchor(false);
    // let music finish
    
    // Play 528Hz calming tone or uploaded music
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
    setScreenDimmed(false);
    
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

  const startListening = async () => {
    if (killSwitchActive) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isListening || isPlaying || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          wsRef.current?.send(JSON.stringify({ type: 'audio_data', audio: base64 }));
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setStatusMessage('I\'m listening...');

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    const ws = new WebSocket('wss://everloved-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      const patientName = localStorage.getItem('everloved-patient-name') || '';
      const caregiverName = localStorage.getItem('everloved-caregiver-name') || '';
      const lifeStory = localStorage.getItem('everloved-life-story') || '';
      ws.send(JSON.stringify({ type: 'start_session', patientName, caregiverName, lifeStory }));
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
      } else if (data.type === 'comfort_intervention') {
        handleComfortIntervention(data.severity, data.state);
      } else if (data.type === 'transcription') {
        setStatusMessage('You said: "' + data.text + '"');
        saveToLog('patient', data.text);
        setFailCount(0);
      } else if (data.type === 'response_text') {
        if (data.text.includes("didn't catch")) {
          setFailCount(prev => prev + 1);
        }
        setStatusMessage(data.text);
        saveToLog('companion', data.text);
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
      // let music finish
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [mounted, failCount, killSwitchActive]);

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleScreenTap = () => {
    // Dismiss memory anchor on tap
    if (showMemoryAnchor) {
      hideMemoryAnchorPhoto();
      return;
    }
    
    if (screenDimmed) {
      setScreenDimmed(false);
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
          width: '200px',
          height: '200px',
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
          background: screenDimmed 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, ' + circadianColors.bg1 + ' 0%, ' + circadianColors.bg2 + ' 100%)',
          display: 'flex', 
          flexDirection: 'row', // Changed to row for side-by-side layout
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px', 
          cursor: 'pointer', 
          transition: 'background 2s ease',
          position: 'relative',
          gap: '40px',
        }}
      >
        {/* Severe distress: dimmed screen with music indicator */}
        {screenDimmed && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 5,
          }}>
            <div style={{
              width: '150px', height: '150px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(100,149,237,0.4) 0%, rgba(100,149,237,0.1) 70%)',
              animation: 'pulse 4s ease-in-out infinite',
              marginBottom: '40px',
            }} />
            <p style={{ color: '#a0c4ff', fontSize: '1.2rem', opacity: 0.8 }}>
              🎵 Calming music playing...
            </p>
            <p style={{ color: '#a0c4ff', fontSize: '0.9rem', opacity: 0.5, marginTop: '20px' }}>
              Tap anywhere to dismiss
            </p>
          </div>
        )}

        {/* Main content area - puppy and status */}
        {!screenDimmed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
              <img src="/puppy.png" alt="Comfort companion" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
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
          </div>
        )}

        {/* Memory Anchor Photo - Side placement (Dr. Elahi Protocol) */}
        {showMemoryAnchor && memoryAnchorPhoto && !screenDimmed && (
          <div style={{
            flex: '0 0 auto',
            width: '35vw', // 30-40% of screen width
            maxWidth: '400px',
            opacity: memoryAnchorOpacity,
            transition: 'none', // We handle animation manually for precise control
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: `0 10px 40px rgba(0,0,0,${0.15 * memoryAnchorOpacity})`,
              border: '4px solid rgba(255,255,255,0.3)',
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
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
