'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AnimatedPuppy } from '@/components/AnimatedPuppy';

// ============================================
// SAND PAINTER - STAGE 3 GAME HELPERS
// ============================================
const noise3D = (x: number, y: number, z: number): number => {
  const n = Math.floor(x) + Math.floor(y) * 256 + Math.floor(z) * 65536;
  return (Math.sin(n * 12.9898 + n * 78.233) * 43758.5453) % 1;
};

const curlNoise = (x: number, y: number, time: number): { dx: number; dy: number } => {
  const eps = 0.001;
  const n1 = noise3D(x, y + eps, time);
  const n2 = noise3D(x, y - eps, time);
  const n3 = noise3D(x + eps, y, time);
  const n4 = noise3D(x - eps, y, time);
  return {
    dx: (n1 - n2) / (2 * eps) * 0.3,
    dy: -(n3 - n4) / (2 * eps) * 0.3,
  };
};

const GAME_PALETTES = {
  day: {
    primary: [1.0, 0.7, 0.2],      // Amber gold
    secondary: [1.0, 0.5, 0.1],    // Deep amber
    glow: [1.0, 0.75, 0.3],
    bg1: '#0a0a18',                // Very dark blue-black
    bg2: '#12122a',
  },
  sunset: {
    primary: [1.0, 0.55, 0.1],     // Warm amber
    secondary: [0.95, 0.4, 0.1],   // Burnt orange
    glow: [1.0, 0.6, 0.2],
    bg1: '#0f0805',                // Very dark warm
    bg2: '#1a100a',
  }
};

export default function PatientComfort() {
  // ============================================
  // GAME STATE
  // ============================================
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isSundowning, setIsSundowning] = useState(false);
  const [colorTransition, setColorTransition] = useState(0);
  const [gameSessionDuration, setGameSessionDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [particleCount, setParticleCount] = useState(1500); // Low count for Alzheimer's patients
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAnimationRef = useRef<number>(0);
  const particlesRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const prevPointerRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);

  // ============================================
  // ORIGINAL PATIENT PAGE STATE
  // ============================================
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [comfortPhotos, setComfortPhotos] = useState<string[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  
  const [currentTier, setCurrentTier] = useState(1);
  const [earPerk, setEarPerk] = useState(false);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [showMemoryAnchor, setShowMemoryAnchor] = useState(false);
  const [memoryAnchorOpacity, setMemoryAnchorOpacity] = useState(0);
  const [memoryAnchorPhoto, setMemoryAnchorPhoto] = useState<string | null>(null);
  const [showBreathPacer, setShowBreathPacer] = useState(false);
  const [breathPacerScale, setBreathPacerScale] = useState(1);
  const [breathCycleRate, setBreathCycleRate] = useState(20);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const continuousStreamActive = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const isStreamingRef = useRef(false);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStarted = useRef(false);
  const patientAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const amplitudeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const comfortAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathDecelerationRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // GAME HELPER FUNCTIONS
  // ============================================
  const getGamePalette = useCallback(() => {
    const t = colorTransition;
    const lerp = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * t);
    return {
      primary: lerp(GAME_PALETTES.day.primary, GAME_PALETTES.sunset.primary),
      secondary: lerp(GAME_PALETTES.day.secondary, GAME_PALETTES.sunset.secondary),
      glow: lerp(GAME_PALETTES.day.glow, GAME_PALETTES.sunset.glow),
      bg1: t < 0.5 ? GAME_PALETTES.day.bg1 : GAME_PALETTES.sunset.bg1,
      bg2: t < 0.5 ? GAME_PALETTES.day.bg2 : GAME_PALETTES.sunset.bg2,
    };
  }, [colorTransition]);

  const initParticles = useCallback((count: number) => {
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 2] = 0.15 + Math.random() * 0.7;  // Wider spread
      positions[i * 2 + 1] = -0.1 - Math.random() * 0.5;
      velocities[i * 2] = (Math.random() - 0.5) * 0.0005;  // 50% slower
      velocities[i * 2 + 1] = 0.00025 + Math.random() * 0.0005;  // 50% slower
    }
    particlesRef.current = positions;
    velocitiesRef.current = velocities;
  }, []);

  const initGameAudio = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const frequencies = [55, 82.5, 110, 165];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.025 / (i + 1), ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorsRef.current.push(osc);
        gainNodesRef.current.push(gain);
      });
      setAudioEnabled(true);
    } catch (e) {
      console.log('Audio unavailable:', e);
    }
  }, []);

  const cleanupGameAudio = useCallback(() => {
    oscillatorsRef.current.forEach(osc => { try { osc.stop(); } catch (e) {} });
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    setAudioEnabled(false);
  }, []);

  const updateGameAudio = useCallback((avgVelocity: number) => {
    if (!audioContextRef.current) return;
    gainNodesRef.current.forEach((gain, i) => {
      const baseGain = 0.025 / (i + 1);
      gain.gain.setTargetAtTime(baseGain + avgVelocity * 0.08, audioContextRef.current!.currentTime, 0.1);
    });
  }, []);

  // ============================================
  // ORIGINAL HELPER FUNCTIONS
  // ============================================
  const saveToLog = (speaker: 'patient' | 'companion' | 'system', text: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('everloved-conversation-log') || '[]');
      existing.push({ timestamp: new Date().toISOString(), speaker, text });
      localStorage.setItem('everloved-conversation-log', JSON.stringify(existing));
    } catch (e) { console.error('Log error:', e); }
  };

  const getCircadianColors = () => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 12) return { bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' };
    if (hours >= 12 && hours < 16) return { bg1: '#FFFEF5', bg2: '#FFF9E6', text: '#3D3D3D' };
    if (hours >= 16 && hours < 20) return { bg1: '#FFF5E6', bg2: '#FFE4CC', text: '#4A3D32' };
    return { bg1: '#2C1810', bg2: '#1A0F0A', text: '#E8DDD4' };
  };

  const [circadianColors, setCircadianColors] = useState({ bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' });

  const uiColors = {
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
  };

  // ============================================
  // CHECK FOR ACTIVE GAME
  // ============================================
  useEffect(() => {
    const check = () => setActiveGame(localStorage.getItem('everloved-active-game'));
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Check sundowning
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      const inWindow = hour >= 16 && hour < 20;
      setIsSundowning(inWindow);
      if (inWindow) {
        setColorTransition(Math.min(1, ((hour - 16) * 60 + new Date().getMinutes()) / 240));
      } else {
        setColorTransition(0);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // Game session timer
  useEffect(() => {
    if (activeGame !== 'calm-current') return;
    const interval = setInterval(() => setGameSessionDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [activeGame]);

  // ============================================
  // GAME RENDER LOOP (SAND PAINTER)
  // ============================================
  useEffect(() => {
    if (activeGame !== 'calm-current') {
      if (gameAnimationRef.current) cancelAnimationFrame(gameAnimationRef.current);
      cleanupGameAudio();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    initParticles(particleCount);
    lastFrameTimeRef.current = performance.now();

    const render = () => {
      const now = performance.now();
      const deltaTime = Math.min((now - lastFrameTimeRef.current) / 16.67, 3);
      lastFrameTimeRef.current = now;
      timeRef.current += 0.005;  // 50% slower time progression

      // FPS-based quality scaling
      const fps = 1000 / Math.max(1, now - lastFrameTimeRef.current);
      fpsHistoryRef.current.push(fps);
      if (fpsHistoryRef.current.length > 180) {
        fpsHistoryRef.current.shift();
        const avg = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
        if (avg < 55 && particleCount > 500) {
          const newCount = Math.floor(particleCount * 0.8);
          setParticleCount(newCount);
          initParticles(newCount);
          fpsHistoryRef.current = [];
        }
      }

      const palette = getGamePalette();
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, palette.bg1);
      gradient.addColorStop(1, palette.bg2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const positions = particlesRef.current;
      const velocities = velocitiesRef.current;
      if (!positions || !velocities) {
        gameAnimationRef.current = requestAnimationFrame(render);
        return;
      }

      const count = positions.length / 2;
      const pointer = pointerRef.current;
      const prevPointer = prevPointerRef.current;
      const pointerVelX = (pointer.x - prevPointer.x) * 0.5;
      const pointerVelY = (pointer.y - prevPointer.y) * 0.5;

      let totalVelocity = 0;
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const idx = i * 2;
        let x = positions[idx];
        let y = positions[idx + 1];
        let vx = velocities[idx];
        let vy = velocities[idx + 1];

        // Gravity - 50% slower
        vy += 0.000015 * deltaTime;

        // Curl noise - 50% slower
        const curl = curlNoise(x * 3, y * 3, timeRef.current);
        vx += curl.dx * 0.000005 * deltaTime;
        vy += curl.dy * 0.000005 * deltaTime;

        // Pointer turbulence - 50% slower
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.15 && dist > 0.001) {
            const force = (1 - dist / 0.15) * 0.001 * deltaTime;
            vx += (dx / dist) * force + pointerVelX * force;
            vy += (dy / dist) * force + pointerVelY * force;
            vx += dy * force * 0.25;
            vy -= dx * force * 0.25;
          }
        }

        // Damping
        vx *= 0.995;
        vy *= 0.995;

        x += vx * deltaTime;
        y += vy * deltaTime;

        // Respawn at top with wider spread
        if (y > 1.1 || x < -0.1 || x > 1.1) {
          x = 0.15 + Math.random() * 0.7;
          y = -0.05;
          vx = (Math.random() - 0.5) * 0.0005;  // 50% slower
          vy = 0.00025 + Math.random() * 0.0005;  // 50% slower
        }

        positions[idx] = x;
        positions[idx + 1] = y;
        velocities[idx] = vx;
        velocities[idx + 1] = vy;
        totalVelocity += Math.abs(vx) + Math.abs(vy);

        // Render - larger particles since fewer
        const screenX = x * width;
        const screenY = y * height;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const size = 4 + speed * 300;
        const alpha = Math.min(0.9, 0.5 + speed * 60);
        const colorMix = Math.min(1, speed * 200);
        const r = Math.floor((palette.primary[0] * (1 - colorMix) + palette.secondary[0] * colorMix) * 255);
        const g = Math.floor((palette.primary[1] * (1 - colorMix) + palette.secondary[1] * colorMix) * 255);
        const b = Math.floor((palette.primary[2] * (1 - colorMix) + palette.secondary[2] * colorMix) * 255);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      updateGameAudio(totalVelocity / count);

      // Cursor glow
      if (pointer.active) {
        const glow = palette.glow;
        ctx.fillStyle = `rgba(${Math.floor(glow[0]*255)}, ${Math.floor(glow[1]*255)}, ${Math.floor(glow[2]*255)}, 0.15)`;
        ctx.beginPath();
        ctx.arc(pointer.x * width, pointer.y * height, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${Math.floor(glow[0]*255)}, ${Math.floor(glow[1]*255)}, ${Math.floor(glow[2]*255)}, 0.3)`;
        ctx.beginPath();
        ctx.arc(pointer.x * width, pointer.y * height, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      prevPointerRef.current = { x: pointer.x, y: pointer.y };
      gameAnimationRef.current = requestAnimationFrame(render);
    };

    gameAnimationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (gameAnimationRef.current) cancelAnimationFrame(gameAnimationRef.current);
    };
  }, [activeGame, particleCount, initParticles, getGamePalette, updateGameAudio, cleanupGameAudio]);

  // Game pointer handlers
  const handleGamePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    pointerRef.current = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
      active: true,
    };
    if ('vibrate' in navigator && 'touches' in e) navigator.vibrate(3);
  }, []);

  const handleGamePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (!audioEnabled) initGameAudio();
    handleGamePointerMove(e);
  }, [audioEnabled, initGameAudio, handleGamePointerMove]);

  const handleGamePointerUp = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  // ============================================
  // ORIGINAL PATIENT PAGE EFFECTS
  // ============================================
  useEffect(() => {
    setMounted(true);
    setCircadianColors(getCircadianColors());
    const colorInterval = setInterval(() => setCircadianColors(getCircadianColors()), 60000);
    const photos = localStorage.getItem('everloved-comfort-photos');
    if (photos) {
      try {
        const parsed = JSON.parse(photos);
        if (Array.isArray(parsed) && parsed.length > 0) setComfortPhotos(parsed);
      } catch (e) {}
    }
    return () => clearInterval(colorInterval);
  }, []);

  useEffect(() => {
    if (!mounted || activeGame) return;

    const connectWebSocket = () => {
      const ws = new WebSocket('wss://ease-backend-production.up.railway.app');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatusMessage('Tap anywhere to talk to me');
        setFailCount(0);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            setStatusMessage(data.text);
            saveToLog('patient', data.text);
            setIsListening(false);
            setIsProcessing(true);
          }
          if (data.type === 'llm_text') setStatusMessage(data.text);
          if (data.type === 'audio_chunk') {
            audioQueueRef.current.push(data.audio);
            if (!isPlayingQueueRef.current) playNextAudio();
          }
          if (data.type === 'response_complete') {
            if (data.fullText) {
              setStatusMessage(data.fullText);
              saveToLog('companion', data.fullText);
            }
            setIsProcessing(false);
          }
          if (data.type === 'tier_update') {
            setCurrentTier(data.tier);
            saveToLog('system', `Tier ${data.tier}: ${data.description || ''}`);
            if (data.tier === 2 && comfortPhotos.length > 0) {
              const randomPhoto = comfortPhotos[Math.floor(Math.random() * comfortPhotos.length)];
              setMemoryAnchorPhoto(randomPhoto);
              setShowMemoryAnchor(true);
              let opacity = 0;
              const fadeIn = setInterval(() => {
                opacity += 0.05;
                setMemoryAnchorOpacity(Math.min(1, opacity));
                if (opacity >= 1) clearInterval(fadeIn);
              }, 50);
            }
            if (data.tier === 3) {
              setShowBreathPacer(true);
              let rate = 20;
              breathDecelerationRef.current = setInterval(() => {
                rate = Math.max(6, rate - 0.5);
                setBreathCycleRate(rate);
                if (rate <= 6 && breathDecelerationRef.current) clearInterval(breathDecelerationRef.current);
              }, 2000);
            }
          }
          if (data.type === 'kill_switch') {
            setKillSwitchActive(true);
            localStorage.setItem('everloved-kill-switch', 'true');
            saveToLog('system', 'Kill switch activated - entering calm mode');
            stopMicrophone();
            if (wsRef.current) wsRef.current.close();
            setStatusMessage('Taking a gentle pause...');
          }
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      ws.onerror = () => setIsConnected(false);
      ws.onclose = () => {
        setIsConnected(false);
        if (!killSwitchActive && failCount < 5) {
          setTimeout(() => {
            setFailCount(prev => prev + 1);
            connectWebSocket();
          }, 2000);
        }
      };
    };

    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      stopMicrophone();
    };
  }, [mounted, activeGame]);

  useEffect(() => {
    if (!showBreathPacer) return;
    const cycleDuration = 60000 / breathCycleRate;
    breathIntervalRef.current = setInterval(() => {
      const cycleProgress = (Date.now() % cycleDuration) / cycleDuration;
      setBreathPacerScale(1 + Math.sin(cycleProgress * Math.PI * 2) * 1.25 + 1.25);
    }, 50);
    return () => { if (breathIntervalRef.current) clearInterval(breathIntervalRef.current); };
  }, [showBreathPacer, breathCycleRate]);

  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      if (isStreamingRef.current) restartListening();
      return;
    }
    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    setIsListening(false);
    const audioData = audioQueueRef.current.shift()!;
    try {
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => { URL.revokeObjectURL(audioUrl); playNextAudio(); };
      audio.onerror = () => { URL.revokeObjectURL(audioUrl); playNextAudio(); };
      await audio.play();
    } catch (e) {
      console.error('Audio play error:', e);
      playNextAudio();
    }
  };

  const startMicrophone = async () => {
    if (killSwitchActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({ type: 'audio', audio: base64 }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      mediaRecorder.start(250);
      isStreamingRef.current = true;
      setIsListening(true);
      setEarPerk(true);
      setTimeout(() => setEarPerk(false), 300);
    } catch (e) {
      console.error('Microphone error:', e);
      setStatusMessage('Please allow microphone access');
    }
  };

  const stopMicrophone = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    isStreamingRef.current = false;
    setIsListening(false);
  };

  const restartListening = () => {
    if (!killSwitchActive && isStreamingRef.current) {
      stopMicrophone();
      setTimeout(startMicrophone, 100);
    }
  };

  const handleScreenTap = () => {
    if (killSwitchActive) return;
    if (showMemoryAnchor) {
      let opacity = 1;
      const fadeOut = setInterval(() => {
        opacity -= 0.1;
        setMemoryAnchorOpacity(Math.max(0, opacity));
        if (opacity <= 0) { clearInterval(fadeOut); setShowMemoryAnchor(false); }
      }, 50);
      return;
    }
    if (!isStreamingRef.current && !isPlaying) startMicrophone();
  };

  if (!mounted) return null;

  const gamePalette = getGamePalette();

  // ============================================
  // RENDER: SAND PAINTER GAME
  // ============================================
  if (activeGame === 'calm-current') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          cursor: 'none',
          touchAction: 'none',
        }}
        onPointerMove={handleGamePointerMove}
        onPointerDown={handleGamePointerDown}
        onPointerUp={handleGamePointerUp}
        onPointerLeave={handleGamePointerUp}
        onTouchMove={handleGamePointerMove}
        onTouchStart={handleGamePointerDown}
        onTouchEnd={handleGamePointerUp}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />

        {/* Dashboard Link */}
        <Link
          href="/caregiver/monitoring"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.9)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.2)',
            zIndex: 100,
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Monitoring Dashboard
        </Link>

        {isSundowning && (
          <div style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'rgba(255,140,0,0.2)', border: '1px solid rgba(255,140,0,0.3)',
            borderRadius: '20px', padding: '8px 16px',
            color: 'rgba(255,200,150,0.8)', fontSize: '0.75rem', zIndex: 100,
          }}>
            ☀️ Sundowning Mode
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '20px', left: '20px',
          color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', zIndex: 100,
        }}>
          {Math.floor(gameSessionDuration / 60)}:{(gameSessionDuration % 60).toString().padStart(2, '0')}
        </div>

        {!audioEnabled && (
          <div style={{
            position: 'absolute', bottom: '30%', left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)', fontSize: '1rem', zIndex: 100, pointerEvents: 'none',
          }}>
            Touch to interact
          </div>
        )}

        <style jsx global>{`* { cursor: none !important; }`}</style>
      </div>
    );
  }

  // ============================================
  // RENDER: NORMAL PATIENT COMFORT PAGE
  // ============================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Link
        href="/caregiver/monitoring"
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 100,
          padding: '12px 20px', background: uiColors.cardBg, borderRadius: '12px',
          color: circadianColors.text, fontWeight: 500, fontSize: '0.85rem', textDecoration: 'none',
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
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          padding: '40px', cursor: 'pointer', transition: 'background 15s ease',
          position: 'relative', gap: '40px',
        }}
      >
        {showBreathPacer && (
          <div style={{
            position: 'absolute', right: '10%', width: '600px', height: '600px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '150px', height: '150px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(100,180,200,0.5) 0%, rgba(80,150,180,0.2) 70%)',
              transform: `scale(${breathPacerScale})`, transition: 'transform 0.1s ease-out',
              boxShadow: '0 0 60px rgba(100,180,200,0.3)',
            }} />
          </div>
        )}

        {showMemoryAnchor && memoryAnchorPhoto && !showBreathPacer && (
          <div style={{
            flex: '0 0 auto', width: '35vw', maxWidth: '400px', opacity: memoryAnchorOpacity,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              borderRadius: '20px', overflow: 'hidden',
              boxShadow: `0 10px 40px rgba(0,0,0,${0.15 * memoryAnchorOpacity})`,
              border: "4px solid rgba(255,255,255,0.3)", animation: "photoBreath 4s ease-in-out infinite",
            }}>
              <img src={memoryAnchorPhoto} alt="Memory" style={{
                width: '100%', height: 'auto', maxHeight: '50vh', objectFit: 'contain', display: 'block',
              }} />
            </div>
            <p style={{
              color: circadianColors.text, fontSize: '0.9rem', opacity: 0.5 * memoryAnchorOpacity,
              marginTop: '12px', textAlign: 'center',
            }}>
              Tap to dismiss
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <AnimatedPuppy isListening={isListening} isPlaying={isPlaying} earPerk={earPerk} currentTier={currentTier} audioAmplitude={audioAmplitude} />
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

          {isListening && <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>🎙️ Listening...</p>}
          {isPlaying && <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>🔊 Speaking...</p>}
          {isProcessing && !isPlaying && <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>💭 Thinking...</p>}
          {showBreathPacer && <p style={{ color: circadianColors.text, opacity: 0.6, marginTop: '20px', fontSize: '1rem' }}>Breathe with the light...</p>}
        </div>
      </div>

      <style jsx>{`
        @keyframes photoBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
      `}</style>
    </div>
  );
}
