'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AnimatedPuppy } from '@/components/AnimatedPuppy';

// ============================================
// GAME HELPERS
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
    primary: [1.0, 0.7, 0.2],
    secondary: [1.0, 0.5, 0.1],
    glow: [1.0, 0.75, 0.3],
    bg1: '#0a0a18',
    bg2: '#12122a',
  },
  sunset: {
    primary: [1.0, 0.55, 0.1],
    secondary: [0.95, 0.4, 0.1],
    glow: [1.0, 0.6, 0.2],
    bg1: '#0f0805',
    bg2: '#1a100a',
  }
};

// Bioluminescent Tide palettes - GREEN/CYAN day, warm amber night (no blue)
const TIDE_PALETTES = {
  day: {
    glow: [0.2, 0.9, 0.6],      // Green/cyan glow
    secondary: [0.1, 0.7, 0.5], // Soft aqua-green
    bg1: '#0a1520',             // Deep ocean blue
    bg2: '#061018',             // Darker ocean
  },
  night: {
    glow: [1.0, 0.6, 0.0],      // Warm amber (ZERO blue)
    secondary: [0.8, 0.4, 0.0], // Orange-amber
    bg1: '#0f0808',             // Deep warm black (no blue)
    bg2: '#080505',             // Darker warm black
  }
};

// Dolphin type
interface Dolphin {
  x: number;
  y: number;
  depth: number;
  speed: number;
  phase: number;
  direction: number;
}

export default function PatientComfort() {
  // ============================================
  // GAME STATE
  // ============================================
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isSundowning, setIsSundowning] = useState(false);
  const [colorTransition, setColorTransition] = useState(0);
  const [gameSessionDuration, setGameSessionDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [particleCount, setParticleCount] = useState(1500);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tideCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameAnimationRef = useRef<number>(0);
  const particlesRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const prevPointerRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const gameAudioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  
  // Bioluminescent Tide state
  const tidePlanktonRef = useRef<{x: number, y: number, brightness: number, targetBrightness: number, phase: number}[]>([]);
  const tideTimeRef = useRef(0);
  const pointerHistoryRef = useRef<{x: number, y: number, time: number}[]>([]);
  const dolphinsRef = useRef<Dolphin[]>([]);

  // ============================================
  // FROSTY WINDOW STATE
  // ============================================
  const frostyBgCanvasRef = useRef<HTMLCanvasElement>(null);
  const frostySnowCanvasRef = useRef<HTMLCanvasElement>(null);
  const frostyPhaseRef = useRef<'preview' | 'assault' | 'wipe'>('preview');
  const frostyPhaseStartRef = useRef<number>(0);
  const frostySnowballsRef = useRef<{x: number, y: number, size: number, rotation: number, progress: number, speed: number, landed: boolean, startX: number, startY: number}[]>([]);
  const frostySpawnQueueRef = useRef<{x: number, y: number}[]>([]);
  const frostyLastSpawnRef = useRef<number>(0);
  const frostyWipeTimerRef = useRef<number>(0);
  const frostyLastPointerRef = useRef<{x: number, y: number} | null>(null);
  const frostyBgImageRef = useRef<HTMLImageElement | null>(null);
  const frostySnowImageRef = useRef<HTMLImageElement | null>(null);
  const frostyAnimationRef = useRef<number>(0);
  const [frostyPhase, setFrostyPhase] = useState<'preview' | 'assault' | 'wipe'>('preview');

  // ============================================
  // ORIGINAL VOICE STATE (UNCHANGED)
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
  const audioContextRef = useRef<AudioContext | null>(null);
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

  const getTidePalette = useCallback(() => {
    const t = colorTransition;
    const lerp = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * t);
    return {
      glow: lerp(TIDE_PALETTES.day.glow, TIDE_PALETTES.night.glow),
      secondary: lerp(TIDE_PALETTES.day.secondary, TIDE_PALETTES.night.secondary),
      bg1: t < 0.5 ? TIDE_PALETTES.day.bg1 : TIDE_PALETTES.night.bg1,
      bg2: t < 0.5 ? TIDE_PALETTES.day.bg2 : TIDE_PALETTES.night.bg2,
    };
  }, [colorTransition]);

  const initParticles = useCallback((count: number) => {
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 2] = 0.15 + Math.random() * 0.7;
      positions[i * 2 + 1] = -0.1 - Math.random() * 0.5;
      velocities[i * 2] = (Math.random() - 0.5) * 0.0005;
      velocities[i * 2 + 1] = 0.00025 + Math.random() * 0.0005;
    }
    particlesRef.current = positions;
    velocitiesRef.current = velocities;
  }, []);

  const initTidePlankton = useCallback(() => {
    const plankton: {x: number, y: number, brightness: number, targetBrightness: number, phase: number}[] = [];
    const count = 3000;
    for (let i = 0; i < count; i++) {
      plankton.push({
        x: Math.random(),
        y: Math.random(),
        brightness: 0,
        targetBrightness: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
    tidePlanktonRef.current = plankton;
    
    // Initialize 3 dolphins at different depths
    dolphinsRef.current = [
      { x: -0.2, y: 0.3, depth: 0.6, speed: 0.008, phase: 0, direction: 1 },
      { x: 1.2, y: 0.6, depth: 0.8, speed: 0.006, phase: Math.PI, direction: -1 },
      { x: -0.3, y: 0.75, depth: 0.4, speed: 0.01, phase: Math.PI * 0.5, direction: 1 },
    ];
  }, []);

  const initGameAudio = useCallback(() => {
    if (gameAudioContextRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      gameAudioContextRef.current = ctx;
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
    if (gameAudioContextRef.current) gameAudioContextRef.current.close();
    gameAudioContextRef.current = null;
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    setAudioEnabled(false);
  }, []);

  const updateGameAudio = useCallback((avgVelocity: number) => {
    if (!gameAudioContextRef.current) return;
    gainNodesRef.current.forEach((gain, i) => {
      const baseGain = 0.025 / (i + 1);
      gain.gain.setTargetAtTime(baseGain + avgVelocity * 0.08, gameAudioContextRef.current!.currentTime, 0.1);
    });
  }, []);

  // ============================================
  // ORIGINAL HELPER FUNCTIONS (UNCHANGED)
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
    textMuted: '#8B7355',
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

  // Check sundowning for games
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      const inWindow = hour >= 16 || hour < 8; // Night mode for tide
      setIsSundowning(inWindow);
      if (hour >= 16 && hour < 20) {
        setColorTransition(Math.min(1, ((hour - 16) * 60 + new Date().getMinutes()) / 240));
      } else if (hour >= 20 || hour < 8) {
        setColorTransition(1);
      } else {
        setColorTransition(0);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // Game session timer - UPDATED to include frosty-window
  useEffect(() => {
    if (activeGame !== 'calm-current' && activeGame !== 'bioluminescent-tide' && activeGame !== 'frosty-window') return;
    const interval = setInterval(() => setGameSessionDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [activeGame]);

  // ============================================
  // FROSTY WINDOW: Load images
  // ============================================
  useEffect(() => {
    if (activeGame !== 'frosty-window') return;
    
    const bgImg = new Image();
    const snowImg = new Image();
    
    bgImg.onload = () => { frostyBgImageRef.current = bgImg; };
    snowImg.onload = () => { frostySnowImageRef.current = snowImg; };
    
    bgImg.src = '/games/switzerland_bg.jpg';
    snowImg.src = '/games/snowball.png';
    
    return () => {
      bgImg.onload = null;
      snowImg.onload = null;
    };
  }, [activeGame]);

  // ============================================
  // FROSTY WINDOW: Game loop
  // ============================================
  useEffect(() => {
    if (activeGame !== 'frosty-window') {
      if (frostyAnimationRef.current) cancelAnimationFrame(frostyAnimationRef.current);
      return;
    }

    const bgCanvas = frostyBgCanvasRef.current;
    const snowCanvas = frostySnowCanvasRef.current;
    if (!bgCanvas || !snowCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const snowCtx = snowCanvas.getContext('2d');
    if (!bgCtx || !snowCtx) return;

    // Generate coverage targets
    const generateTargets = (w: number, h: number) => {
      const targets: {x: number, y: number}[] = [];
      const cols = 6, rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          targets.push({
            x: (c + 0.5) * (w / cols) + (Math.random() - 0.5) * (w / cols) * 0.3,
            y: (r + 0.5) * (h / rows) + (Math.random() - 0.5) * (h / rows) * 0.3,
          });
        }
      }
      // Corners and edges
      targets.push({x: 50, y: 50}, {x: w - 50, y: 50}, {x: 50, y: h - 50}, {x: w - 50, y: h - 50});
      targets.push({x: w / 2, y: 30}, {x: w / 2, y: h - 30}, {x: 30, y: h / 2}, {x: w - 30, y: h / 2});
      for (let i = 0; i < 15; i++) targets.push({x: Math.random() * w, y: Math.random() * h});
      // Shuffle
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }
      return targets;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      bgCanvas.width = w * dpr; bgCanvas.height = h * dpr;
      bgCanvas.style.width = `${w}px`; bgCanvas.style.height = `${h}px`;
      bgCtx.scale(dpr, dpr);
      snowCanvas.width = w * dpr; snowCanvas.height = h * dpr;
      snowCanvas.style.width = `${w}px`; snowCanvas.style.height = `${h}px`;
      snowCtx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    frostyPhaseRef.current = 'preview';
    setFrostyPhase('preview');
    frostyPhaseStartRef.current = performance.now();
    frostySnowballsRef.current = [];
    frostySpawnQueueRef.current = [];

    const drawBg = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!frostyBgImageRef.current) return;
      const img = frostyBgImageRef.current;
      const imgR = img.width / img.height, canR = w / h;
      let dw, dh, dx, dy;
      if (canR > imgR) { dw = w; dh = w / imgR; dx = 0; dy = (h - dh) / 2; }
      else { dh = h; dw = h * imgR; dx = (w - dw) / 2; dy = 0; }
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const drawSnowball = (ctx: CanvasRenderingContext2D, s: typeof frostySnowballsRef.current[0]) => {
      if (!frostySnowImageRef.current) return;
      const cx = s.landed ? s.x : s.startX + (s.x - s.startX) * s.progress;
      const cy = s.landed ? s.y : s.startY + (s.y - s.startY) * s.progress;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.rotation);
      ctx.drawImage(frostySnowImageRef.current, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    };

    const spawnAt = (tx: number, ty: number, w: number, h: number) => {
      const edge = Math.floor(Math.random() * 4);
      let sx: number, sy: number;
      if (edge === 0) { sx = tx + (Math.random() - 0.5) * 150; sy = -200; }
      else if (edge === 1) { sx = w + 200; sy = ty + (Math.random() - 0.5) * 150; }
      else if (edge === 2) { sx = tx + (Math.random() - 0.5) * 150; sy = h + 200; }
      else { sx = -200; sy = ty + (Math.random() - 0.5) * 150; }
      frostySnowballsRef.current.push({
        x: tx, y: ty, startX: sx, startY: sy,
        size: 350 + Math.random() * 400, rotation: Math.random() * Math.PI * 2,
        progress: 0, speed: 0.12 + Math.random() * 0.08, landed: false,
      });
    };

    const redrawSnow = () => {
      snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
      for (const s of frostySnowballsRef.current) drawSnowball(snowCtx, s);
    };

    const gameLoop = () => {
      const now = performance.now();
      const elapsed = now - frostyPhaseStartRef.current;
      const w = window.innerWidth, h = window.innerHeight;

      // Draw background
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      drawBg(bgCtx, w, h);

      if (frostyPhaseRef.current === 'preview' && elapsed > 1500) {
        frostyPhaseRef.current = 'assault';
        setFrostyPhase('assault');
        frostyPhaseStartRef.current = now;
        frostySnowballsRef.current = [];
        frostySpawnQueueRef.current = generateTargets(w, h);
        frostyLastSpawnRef.current = now;
      }

      if (frostyPhaseRef.current === 'assault') {
        if (frostySpawnQueueRef.current.length > 0 && now - frostyLastSpawnRef.current >= 30) {
          const t = frostySpawnQueueRef.current.shift()!;
          spawnAt(t.x, t.y, w, h);
          frostyLastSpawnRef.current = now;
        }
        let allLanded = true;
        for (const s of frostySnowballsRef.current) {
          if (!s.landed) {
            s.progress += s.speed;
            if (s.progress >= 1) { s.progress = 1; s.landed = true; }
            else allLanded = false;
          }
        }
        redrawSnow();
        if (frostySpawnQueueRef.current.length === 0 && allLanded && frostySnowballsRef.current.length > 0) {
          frostyPhaseRef.current = 'wipe';
          setFrostyPhase('wipe');
          frostyPhaseStartRef.current = now;
          frostyWipeTimerRef.current = 0;
        }
      }

      if (frostyPhaseRef.current === 'wipe') {
        frostyWipeTimerRef.current = elapsed;
        if (elapsed > 24000) {
          frostyPhaseRef.current = 'assault';
          setFrostyPhase('assault');
          frostyPhaseStartRef.current = now;
          frostySnowballsRef.current = [];
          frostySpawnQueueRef.current = generateTargets(w, h);
          frostyLastSpawnRef.current = now;
        }
      }

      frostyAnimationRef.current = requestAnimationFrame(gameLoop);
    };

    frostyAnimationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      if (frostyAnimationRef.current) cancelAnimationFrame(frostyAnimationRef.current);
    };
  }, [activeGame]);

  // ============================================
  // FROSTY WINDOW: Wipe handlers
  // ============================================
  const handleFrostyWipe = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
    const canvas = frostySnowCanvasRef.current;
    if (!canvas || frostyPhaseRef.current !== 'wipe') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    const brush = 80;
    if (prevX !== undefined && prevY !== undefined) {
      const dx = x - prevX, dy = y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 10));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = prevX + dx * t, cy = prevY + dy * t;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, brush);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, brush, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, brush);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, brush, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const handleFrostyPointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    let x: number, y: number;
    if ('touches' in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    const prev = frostyLastPointerRef.current;
    handleFrostyWipe(x, y, prev?.x, prev?.y);
    frostyLastPointerRef.current = { x, y };
  }, [handleFrostyWipe]);

  const handleFrostyPointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    let x: number, y: number;
    if ('touches' in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    frostyLastPointerRef.current = { x, y };
    handleFrostyWipe(x, y);
  }, [handleFrostyWipe]);

  const handleFrostyPointerUp = useCallback(() => {
    frostyLastPointerRef.current = null;
  }, []);

  // ============================================
  // SAND PAINTER RENDER LOOP
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
      timeRef.current += 0.005;

      const palette = getGamePalette();
      const width = window.innerWidth;
      const height = window.innerHeight;

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

        vy += 0.000015 * deltaTime;

        const curl = curlNoise(x * 3, y * 3, timeRef.current);
        vx += curl.dx * 0.000005 * deltaTime;
        vy += curl.dy * 0.000005 * deltaTime;

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

        vx *= 0.995;
        vy *= 0.995;

        x += vx * deltaTime;
        y += vy * deltaTime;

        if (y > 1.1 || x < -0.1 || x > 1.1) {
          x = 0.15 + Math.random() * 0.7;
          y = -0.05;
          vx = (Math.random() - 0.5) * 0.0005;
          vy = 0.00025 + Math.random() * 0.0005;
        }

        positions[idx] = x;
        positions[idx + 1] = y;
        velocities[idx] = vx;
        velocities[idx + 1] = vy;
        totalVelocity += Math.abs(vx) + Math.abs(vy);

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

      if (pointer.active) {
        const glow = palette.glow;
        ctx.fillStyle = `rgba(${Math.floor(glow[0]*255)}, ${Math.floor(glow[1]*255)}, ${Math.floor(glow[2]*255)}, 0.15)`;
        ctx.beginPath();
        ctx.arc(pointer.x * width, pointer.y * height, 50, 0, Math.PI * 2);
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

  // ============================================
  // BIOLUMINESCENT TIDE RENDER LOOP - PASSIVE HOVER + DOLPHINS
  // ============================================
  useEffect(() => {
    if (activeGame !== 'bioluminescent-tide') return;

    const canvas = tideCanvasRef.current;
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

    initTidePlankton();
    tideTimeRef.current = 0;
    lastFrameTimeRef.current = performance.now();

    const render = () => {
      const now = performance.now();
      const deltaTime = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;
      tideTimeRef.current += deltaTime;

      const palette = getTidePalette();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isNightMode = colorTransition > 0.5;

      // Draw deep ocean background with hazy texture
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, palette.bg1);
      gradient.addColorStop(1, palette.bg2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add subtle atmospheric haze
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 5; i++) {
        const hx = width * (0.3 + Math.sin(tideTimeRef.current * 0.1 + i) * 0.2);
        const hy = height * (0.3 + Math.cos(tideTimeRef.current * 0.08 + i * 2) * 0.2);
        const hGradient = ctx.createRadialGradient(hx, hy, 0, hx, hy, 300);
        hGradient.addColorStop(0, `rgba(${Math.floor(palette.secondary[0]*255)}, ${Math.floor(palette.secondary[1]*255)}, ${Math.floor(palette.secondary[2]*255)}, 0.3)`);
        hGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = hGradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1;

      // Clean up old pointer history (keep last 5 seconds for trail effect)
      const currentTime = tideTimeRef.current;
      pointerHistoryRef.current = pointerHistoryRef.current.filter(p => currentTime - p.time < 5);

      // Update dolphins - slow swimming
      const dolphins = dolphinsRef.current;
      for (const dolphin of dolphins) {
        dolphin.x += dolphin.speed * dolphin.direction * deltaTime * 10;
        dolphin.y += Math.sin(tideTimeRef.current * 0.5 + dolphin.phase) * 0.001;
        
        // Wrap around
        if (dolphin.direction > 0 && dolphin.x > 1.3) {
          dolphin.x = -0.3;
          dolphin.y = 0.2 + Math.random() * 0.6;
        } else if (dolphin.direction < 0 && dolphin.x < -0.3) {
          dolphin.x = 1.3;
          dolphin.y = 0.2 + Math.random() * 0.6;
        }
      }

      // Update plankton brightness based on pointer proximity (PASSIVE HOVER)
      const plankton = tidePlanktonRef.current;
      const pointer = pointerRef.current;
      
      for (let i = 0; i < plankton.length; i++) {
        const p = plankton[i];
        
        // Base breathing brightness
        let targetBrightness = 0.02 + Math.sin(tideTimeRef.current * 0.5 + p.phase) * 0.01;
        
        // PASSIVE HOVER: Check proximity to current pointer (no click needed)
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 0.15) {
            const proximity = 1 - dist / 0.15;
            targetBrightness += proximity * 0.7;
          }
        }
        
        // Check proximity to pointer trail (3-5 second dissipation)
        for (const trail of pointerHistoryRef.current) {
          const dx = p.x - trail.x;
          const dy = p.y - trail.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const age = currentTime - trail.time;
          const fadeOut = Math.max(0, 1 - age / 5); // 5 second fade
          
          if (dist < 0.12 && fadeOut > 0) {
            const proximity = (1 - dist / 0.12) * fadeOut;
            targetBrightness += proximity * 0.5;
          }
        }
        
        // Check proximity to dolphins - they light up plankton as they pass
        for (const dolphin of dolphins) {
          const dx = p.x - dolphin.x;
          const dy = p.y - dolphin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 0.1) {
            const proximity = 1 - dist / 0.1;
            targetBrightness += proximity * 0.4 * dolphin.depth;
          }
        }
        
        p.targetBrightness = Math.min(1, targetBrightness);
        
        // GLACIAL: Very slow brightness transition
        p.brightness += (p.targetBrightness - p.brightness) * 0.015;
        
        // Only draw if visible
        if (p.brightness > 0.01) {
          const screenX = p.x * width;
          const screenY = p.y * height;
          const size = 2 + p.brightness * 4;
          const alpha = Math.min(0.9, p.brightness);
          
          // Night mode: ensure zero blue channel
          let r = palette.glow[0];
          let g = palette.glow[1];
          let b = isNightMode ? 0 : palette.glow[2]; // Zero blue at night
          
          ctx.globalCompositeOperation = 'lighter';
          const glowGradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, size * 3);
          glowGradient.addColorStop(0, `rgba(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)}, ${alpha})`);
          glowGradient.addColorStop(0.5, `rgba(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)}, ${alpha * 0.3})`);
          glowGradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(screenX, screenY, size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw dolphins as soft, translucent silhouettes
      ctx.globalCompositeOperation = 'source-over';
      for (const dolphin of dolphins) {
        const dx = dolphin.x * width;
        const dy = dolphin.y * height;
        const scale = 40 + dolphin.depth * 60;
        
        // Check if dolphin is near active plankton for glow effect
        let dolphinGlow = 0;
        for (const p of plankton) {
          const pdx = p.x - dolphin.x;
          const pdy = p.y - dolphin.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pdist < 0.1 && p.brightness > 0.1) {
            dolphinGlow += p.brightness * (1 - pdist / 0.1) * 0.3;
          }
        }
        dolphinGlow = Math.min(0.5, dolphinGlow);
        
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(dolphin.direction, 1);
        
        // Soft blur effect
        ctx.filter = `blur(${8 - dolphin.depth * 4}px)`;
        ctx.globalAlpha = 0.15 + dolphin.depth * 0.15 + dolphinGlow;
        
        // Dolphin color - catches glow
        let dolphinR = 100 + dolphinGlow * palette.glow[0] * 155;
        let dolphinG = 180 + dolphinGlow * palette.glow[1] * 75;
        let dolphinB = isNightMode ? 0 : (200 + dolphinGlow * palette.glow[2] * 55);
        
        ctx.fillStyle = `rgb(${Math.floor(dolphinR)}, ${Math.floor(dolphinG)}, ${Math.floor(dolphinB)})`;
        
        // Draw dolphin shape
        ctx.beginPath();
        ctx.moveTo(-scale, 0);
        ctx.quadraticCurveTo(-scale * 0.5, -scale * 0.4, scale * 0.2, -scale * 0.1);
        ctx.quadraticCurveTo(scale * 0.8, -scale * 0.3, scale, 0);
        ctx.quadraticCurveTo(scale * 0.8, scale * 0.2, scale * 0.2, scale * 0.1);
        ctx.quadraticCurveTo(-scale * 0.5, scale * 0.3, -scale, 0);
        ctx.fill();
        
        // Tail fin
        ctx.beginPath();
        ctx.moveTo(-scale, 0);
        ctx.quadraticCurveTo(-scale * 1.3, -scale * 0.3, -scale * 1.2, -scale * 0.5);
        ctx.quadraticCurveTo(-scale * 1.1, 0, -scale * 1.2, scale * 0.5);
        ctx.quadraticCurveTo(-scale * 1.3, scale * 0.3, -scale, 0);
        ctx.fill();
        
        // Dorsal fin
        ctx.beginPath();
        ctx.moveTo(0, -scale * 0.15);
        ctx.quadraticCurveTo(scale * 0.1, -scale * 0.5, scale * 0.3, -scale * 0.15);
        ctx.fill();
        
        ctx.restore();
      }

      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      gameAnimationRef.current = requestAnimationFrame(render);
    };

    gameAnimationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (gameAnimationRef.current) cancelAnimationFrame(gameAnimationRef.current);
    };
  }, [activeGame, getTidePalette, initTidePlankton, colorTransition]);

  // Game pointer handlers - PASSIVE HOVER (always tracking)
  const handleGamePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const newX = clientX / window.innerWidth;
    const newY = clientY / window.innerHeight;
    
    pointerRef.current = {
      x: newX,
      y: newY,
      active: true,
    };
    
    // Add to pointer history for trail effect (Bioluminescent Tide)
    if (activeGame === 'bioluminescent-tide') {
      pointerHistoryRef.current.push({
        x: newX,
        y: newY,
        time: tideTimeRef.current,
      });
    }
  }, [activeGame]);

  const handleGamePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (!audioEnabled) initGameAudio();
    handleGamePointerMove(e);
  }, [audioEnabled, initGameAudio, handleGamePointerMove]);

  const handleGamePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  // ============================================
  // ORIGINAL EFFECTS (UNCHANGED)
  // ============================================
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

  const getPrimaryPhoto = () => {
    if (comfortPhotos.length === 0) return null;
    const starredIndex = parseInt(localStorage.getItem('everloved-starred-photo') || '0');
    return comfortPhotos[starredIndex] || comfortPhotos[0];
  };

  const showTier2MemoryAnchor = (withMusic: boolean = false) => {
    const photo = getPrimaryPhoto();
    if (!photo) return;
    
    stopBreathPacer();
    
    setMemoryAnchorPhoto(photo);
    setShowMemoryAnchor(true);
    setMemoryAnchorOpacity(0);
    
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
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

  const startIsoMusicIntervention = () => {
    try {
      const musicData = localStorage.getItem('everloved-music');
      const musicArray = musicData ? JSON.parse(musicData) : [];
      const uploadedMusic = musicArray.length > 0 ? musicArray[0].data : null;
      
      if (uploadedMusic) {
        backgroundMusicRef.current = new Audio(uploadedMusic);
        backgroundMusicRef.current.loop = false;
        backgroundMusicRef.current.volume = 0.3;
        backgroundMusicRef.current.playbackRate = 1.0;
        backgroundMusicRef.current.play().catch(console.error);
        
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

  const startBreathPacer = () => {
    setShowMemoryAnchor(false);
    setMemoryAnchorPhoto(null);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }
    
    setShowBreathPacer(true);
    setBreathCycleRate(22);
    
    saveToLog('system', 'Tier 3: Breath pacer activated');
    
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
    }, 60000 / breathCycleRate / 30);
    
    breathDecelerationRef.current = setInterval(() => {
      setBreathCycleRate(prev => {
        const newRate = Math.max(6, prev - 0.5);
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
    }, 5000);
    
    startRhythmicAudio();
    
    setTimeout(() => stopBreathPacer(), 180000);
  };

  const stopBreathPacer = () => {
    setShowBreathPacer(false);
    if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    if (breathDecelerationRef.current) clearInterval(breathDecelerationRef.current);
    stopRhythmicAudio();
  };

  const startRhythmicAudio = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 60;
      oscillator.type = 'sine';
      gainNode.gain.value = 0;
      
      oscillator.start();
      
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

  const handleIntervention = (tier: number, stressIndex: number, state: string, sundowning: boolean) => {
    console.log('Intervention:', { tier, stressIndex, state, sundowning });
    setCurrentTier(tier);
    
    if (tier === 1) {
      saveToLog('system', `Tier 1: Ambient mode (${state})`);
    } else if (tier === 2) {
      showTier2MemoryAnchor(stressIndex > 0.5);
    } else if (tier === 3) {
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
      setAudioAmplitude(0);
      if (amplitudeIntervalRef.current) {
        clearInterval(amplitudeIntervalRef.current);
        amplitudeIntervalRef.current = null;
      }
      if (isSessionActive() && failCount < 2) {
        setTimeout(() => startContinuousAudio(), 1000);
      }
      return;
    }
    
    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    const nextAudio = audioQueueRef.current.shift()!;
    
    const audio = new Audio(`data:audio/mp3;base64,${nextAudio}`);
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const source = audioContextRef.current.createMediaElementSource(audio);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      amplitudeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioAmplitude(avg / 255);
        }
      }, 16);
    } catch (e) {
      console.log('Audio analysis not available');
    }
    
    audio.onended = () => {
      setAudioAmplitude(0);
      playNextInQueue();
    };
    audio.onerror = () => {
      setAudioAmplitude(0);
      playNextInQueue();
    };
    audio.play().catch(() => {
      setAudioAmplitude(0);
      playNextInQueue();
    });
  };

  const startContinuousAudio = async () => {
    if (killSwitchActive || continuousStreamActive.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } 
      });
      streamRef.current = stream;
      continuousStreamActive.current = true;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({ type: 'audio_chunk', audio: base64 }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(250);

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
    }
  };
  
  const stopContinuousAudio = () => {
    continuousStreamActive.current = false;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // ============================================
  // WEBSOCKET EFFECT - FIX: Send start_session immediately (no conditional check)
  // ============================================
  useEffect(() => {
    if (!mounted || activeGame) return;
    
    const ws = new WebSocket('wss://ease-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // FIX: Send start_session immediately with patient context (removed conditional check)
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
          setTimeout(() => startContinuousAudio(), 500);
        }
      } else if (data.type === 'listening_started') {
        setIsListening(true);
        setIsProcessing(false);
        setStatusMessage("I'm listening...");
      } else if (data.type === 'kill_switch') {
        console.log('🚨 Kill switch activated:', data.reason);
        activateKillSwitch();
        localStorage.setItem('everloved-kill-switch', 'true');
        saveToLog('system', 'Kill switch activated: ' + data.reason);
      } else if (data.type === 'speech_complete') {
        setIsListening(false);
        setIsProcessing(true);
      } else if (data.type === 'intervention') {
        handleIntervention(data.tier, data.stressIndex, data.state, data.sundowning);
      } else if (data.type === 'ear_perk') {
        setEarPerk(true);
        setTimeout(() => setEarPerk(false), 500);
      } else if (data.type === 'interim_transcript') {
        setEarPerk(true);
      } else if (data.type === 'transcription') {
        setEarPerk(false);
        setStatusMessage('You said: "' + data.text + '"');
        saveToLog('patient', data.text);
        setFailCount(0);
      } else if (data.type === 'response_audio_chunk') {
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
        if (data.audio && audioQueueRef.current.length === 0 && !isPlayingQueueRef.current) {
          await playAudio(data.audio);
        }
      } else if (data.type === 'response_audio') {
        setIsProcessing(false);
        await playAudio(data.audio);
      } else if (data.type === 'response_end') {
        setIsProcessing(false);
      } else if (data.type === 'error') {
        setIsProcessing(false);
        setStatusMessage('Let me try again...');
        if (isSessionActive()) {
          setTimeout(() => startContinuousAudio(), 1500);
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
  }, [mounted, failCount, killSwitchActive, activeGame]);

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
    
    if (showBreathPacer) return;
    if (killSwitchActive) return;
    
    setFailCount(0);
    if (isListening) stopListening();
    else if (!isPlaying && !isProcessing) startContinuousAudio();
  };

  if (!mounted) return null;

  // ============================================
  // RENDER: SAND PAINTER GAME
  // ============================================
  if (activeGame === 'calm-current') {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          overflow: 'hidden', cursor: 'none', touchAction: 'none',
        }}
        onPointerMove={handleGamePointerMove}
        onPointerDown={handleGamePointerDown}
        onPointerLeave={handleGamePointerLeave}
        onTouchMove={handleGamePointerMove}
        onTouchStart={handleGamePointerDown}
        onTouchEnd={handleGamePointerLeave}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

        <Link href="/caregiver/monitoring" style={{
          position: 'absolute', top: '20px', right: '20px', padding: '12px 20px',
          background: 'rgba(255,255,255,0.95)', borderRadius: '12px', color: '#000',
          textDecoration: 'none', fontSize: '1rem', fontWeight: 800,
          border: '2px solid rgba(0,0,0,0.3)', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          Monitoring Dashboard
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
  // RENDER: BIOLUMINESCENT TIDE GAME
  // ============================================
  if (activeGame === 'bioluminescent-tide') {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          overflow: 'hidden', cursor: 'none', touchAction: 'none',
        }}
        onPointerMove={handleGamePointerMove}
        onPointerDown={handleGamePointerDown}
        onPointerLeave={handleGamePointerLeave}
        onTouchMove={handleGamePointerMove}
        onTouchStart={handleGamePointerDown}
        onTouchEnd={handleGamePointerLeave}
      >
        <canvas ref={tideCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

        <Link href="/caregiver/monitoring" style={{
          position: 'absolute', top: '20px', right: '20px', padding: '12px 20px',
          background: 'rgba(255,255,255,0.95)', borderRadius: '12px', color: '#000',
          textDecoration: 'none', fontSize: '1rem', fontWeight: 800,
          border: '2px solid rgba(0,0,0,0.3)', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          Monitoring Dashboard
        </Link>

        {isSundowning && (
          <div style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'rgba(255,140,0,0.2)', border: '1px solid rgba(255,140,0,0.3)',
            borderRadius: '20px', padding: '8px 16px',
            color: 'rgba(255,200,150,0.8)', fontSize: '0.75rem', zIndex: 100,
          }}>
            🌙 Night Mode Active
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '20px', left: '20px',
          color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', zIndex: 100,
        }}>
          {Math.floor(gameSessionDuration / 60)}:{(gameSessionDuration % 60).toString().padStart(2, '0')}
        </div>

        <style jsx global>{`* { cursor: none !important; }`}</style>
      </div>
    );
  }

  // ============================================
  // RENDER: FROSTY WINDOW GAME
  // ============================================
  if (activeGame === 'frosty-window') {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          overflow: 'hidden', touchAction: 'none',
          cursor: frostyPhase === 'wipe' ? 'crosshair' : 'default',
        }}
        onPointerMove={handleFrostyPointerMove}
        onPointerDown={handleFrostyPointerDown}
        onPointerUp={handleFrostyPointerUp}
        onPointerLeave={handleFrostyPointerUp}
        onTouchMove={handleFrostyPointerMove}
        onTouchStart={handleFrostyPointerDown}
        onTouchEnd={handleFrostyPointerUp}
      >
        <canvas ref={frostyBgCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <canvas ref={frostySnowCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

        <Link href="/caregiver/monitoring" style={{
          position: 'absolute', top: '20px', right: '20px', padding: '12px 20px',
          background: 'rgba(255,255,255,0.95)', borderRadius: '12px', color: '#000',
          textDecoration: 'none', fontSize: '1rem', fontWeight: 800,
          border: '2px solid rgba(0,0,0,0.3)', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          Monitoring Dashboard
        </Link>

        {frostyPhase === 'preview' && (
          <div style={{
            position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            color: 'white', fontSize: '1.5rem', fontWeight: 600,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)', zIndex: 100,
          }}>
            Look at this beautiful view...
          </div>
        )}

        {frostyPhase === 'assault' && (
          <div style={{
            position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            color: 'white', fontSize: '1.5rem', fontWeight: 600,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)', zIndex: 100,
          }}>
            ❄️ Snow incoming! ❄️
          </div>
        )}

        {frostyPhase === 'wipe' && (
          <div style={{
            position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            color: 'white', fontSize: '1.5rem', fontWeight: 600,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)', zIndex: 100,
          }}>
            Wipe the snow away! ✋
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '20px', left: '20px',
          color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', zIndex: 100,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          {Math.floor(gameSessionDuration / 60)}:{(gameSessionDuration % 60).toString().padStart(2, '0')}
        </div>

        {frostyPhase === 'wipe' && (
          <div style={{
            position: 'absolute', bottom: '20px', right: '20px',
            color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', zIndex: 100,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
            Next snow in: {Math.max(0, 24 - Math.floor(frostyWipeTimerRef.current / 1000))}s
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // KILL SWITCH UI (UNCHANGED)
  // ============================================
  if (killSwitchActive) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,149,237,0.6) 0%, rgba(100,149,237,0.1) 70%)',
          animation: 'pulse 4s ease-in-out infinite', marginBottom: '60px',
        }} />
        
        <p style={{
          color: '#a0c4ff', fontSize: '1.5rem', textAlign: 'center',
          maxWidth: '400px', lineHeight: 1.8, fontWeight: 300,
        }}>
          Everything is okay.<br />Just relax and breathe.
        </p>

        <Link
          href="/caregiver/monitoring"
          onClick={(e) => { e.preventDefault(); resetKillSwitch(); }}
          style={{
            position: 'absolute', bottom: '20px', right: '20px',
            padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', borderRadius: '8px',
            fontSize: '0.75rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
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

  // ============================================
  // NORMAL PATIENT COMFORT PAGE (UNCHANGED)
  // ============================================
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
            <AnimatedPuppy
              isListening={isListening}
              isPlaying={isPlaying}
              earPerk={earPerk}
              currentTier={currentTier}
              audioAmplitude={audioAmplitude}
            />
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
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.1); opacity: 0.8; } }
      `}</style>
    </div>
  );
}
