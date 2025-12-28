'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

enum GamePhase {
  PREVIEW = 'preview',
  ASSAULT = 'assault',
  WIPE = 'wipe',
}

interface Snowball {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  rotation: number;
  opacity: number;
  progress: number;
  speed: number;
  landed: boolean;
}

export default function SnowballRevealGame() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const snowballsRef = useRef<Snowball[]>([]);
  const snowballImageRef = useRef<HTMLImageElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const phaseRef = useRef<GamePhase>(GamePhase.PREVIEW);
  const phaseStartTimeRef = useRef<number>(0);
  const wipeTimerRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const spawnQueueRef = useRef<{x: number, y: number}[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  
  const [phase, setPhase] = useState<GamePhase>(GamePhase.PREVIEW);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    const bgImg = new Image();
    const snowImg = new Image();
    let loadedCount = 0;

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        bgImageRef.current = bgImg;
        snowballImageRef.current = snowImg;
        setImagesLoaded(true);
      }
    };

    bgImg.onload = checkLoaded;
    snowImg.onload = checkLoaded;
    
    bgImg.src = '/games/switzerland_bg.jpg';
    snowImg.src = '/games/snowball.png';

    return () => {
      bgImg.onload = null;
      snowImg.onload = null;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!bgImageRef.current) return;
    
    const img = bgImageRef.current;
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (canvasRatio > imgRatio) {
      drawWidth = width;
      drawHeight = width / imgRatio;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgRatio;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    }
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, []);

  const drawSnowball = useCallback((ctx: CanvasRenderingContext2D, snowball: Snowball) => {
    if (!snowballImageRef.current) return;
    
    const currentX = snowball.landed ? snowball.targetX : 
      snowball.startX + (snowball.targetX - snowball.startX) * snowball.progress;
    const currentY = snowball.landed ? snowball.targetY :
      snowball.startY + (snowball.targetY - snowball.startY) * snowball.progress;
    
    ctx.save();
    ctx.globalAlpha = snowball.opacity;
    ctx.translate(currentX, currentY);
    ctx.rotate(snowball.rotation);
    
    const halfSize = snowball.size / 2;
    ctx.drawImage(
      snowballImageRef.current,
      -halfSize,
      -halfSize,
      snowball.size,
      snowball.size
    );
    
    ctx.restore();
  }, []);

  // Generate grid-based targets for guaranteed coverage
  const generateCoverageTargets = useCallback((width: number, height: number) => {
    const targets: {x: number, y: number}[] = [];
    
    // Grid coverage: 6 columns x 5 rows = 30 positions
    const cols = 6;
    const rows = 5;
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Place in center of each cell with slight randomness
        const x = (col + 0.5) * cellWidth + (Math.random() - 0.5) * cellWidth * 0.3;
        const y = (row + 0.5) * cellHeight + (Math.random() - 0.5) * cellHeight * 0.3;
        targets.push({ x, y });
      }
    }
    
    // Add corners explicitly
    targets.push({ x: 50, y: 50 });
    targets.push({ x: width - 50, y: 50 });
    targets.push({ x: 50, y: height - 50 });
    targets.push({ x: width - 50, y: height - 50 });
    
    // Add edges
    targets.push({ x: width / 2, y: 30 });
    targets.push({ x: width / 2, y: height - 30 });
    targets.push({ x: 30, y: height / 2 });
    targets.push({ x: width - 30, y: height / 2 });
    
    // Add 15 more random for extra overlap
    for (let i = 0; i < 15; i++) {
      targets.push({
        x: Math.random() * width,
        y: Math.random() * height
      });
    }
    
    // Shuffle array
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    
    return targets;
  }, []);

  const spawnSnowballAt = useCallback((targetX: number, targetY: number, width: number, height: number) => {
    let startX: number, startY: number;
    const edge = Math.floor(Math.random() * 4);
    const offset = 200;
    
    switch(edge) {
      case 0:
        startX = targetX + (Math.random() - 0.5) * 150;
        startY = -offset;
        break;
      case 1:
        startX = width + offset;
        startY = targetY + (Math.random() - 0.5) * 150;
        break;
      case 2:
        startX = targetX + (Math.random() - 0.5) * 150;
        startY = height + offset;
        break;
      default:
        startX = -offset;
        startY = targetY + (Math.random() - 0.5) * 150;
    }
    
    const newSnowball: Snowball = {
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      size: 350 + Math.random() * 400, // 350-750px - big enough to overlap
      rotation: Math.random() * Math.PI * 2,
      opacity: 1,
      progress: 0,
      speed: 0.12 + Math.random() * 0.08,
      landed: false,
    };
    
    snowballsRef.current = [...snowballsRef.current, newSnowball];
  }, []);

  const wipeSnow = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
    const snowCanvas = snowCanvasRef.current;
    if (!snowCanvas) return;
    
    const ctx = snowCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'destination-out';
    
    const brushSize = 80;
    
    if (prevX !== undefined && prevY !== undefined) {
      const dx = x - prevX;
      const dy = y - prevY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(distance / 10));
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = prevX + dx * t;
        const cy = prevY + dy * t;
        
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, brushSize);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, brushSize, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const redrawSnowLayer = useCallback(() => {
    const snowCanvas = snowCanvasRef.current;
    if (!snowCanvas) return;
    
    const ctx = snowCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    
    for (const snowball of snowballsRef.current) {
      drawSnowball(ctx, snowball);
    }
  }, [drawSnowball]);

  useEffect(() => {
    if (!imagesLoaded) return;
    
    const bgCanvas = bgCanvasRef.current;
    const snowCanvas = snowCanvasRef.current;
    if (!bgCanvas || !snowCanvas) return;
    
    const bgCtx = bgCanvas.getContext('2d');
    const snowCtx = snowCanvas.getContext('2d');
    if (!bgCtx || !snowCtx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      bgCanvas.width = width * dpr;
      bgCanvas.height = height * dpr;
      bgCanvas.style.width = `${width}px`;
      bgCanvas.style.height = `${height}px`;
      bgCtx.scale(dpr, dpr);
      
      snowCanvas.width = width * dpr;
      snowCanvas.height = height * dpr;
      snowCanvas.style.width = `${width}px`;
      snowCanvas.style.height = `${height}px`;
      snowCtx.scale(dpr, dpr);
      
      drawBackground(bgCtx, width, height);
      
      if (snowballsRef.current.length > 0) {
        redrawSnowLayer();
      }
    };
    
    resize();
    window.addEventListener('resize', resize);

    phaseRef.current = GamePhase.PREVIEW;
    phaseStartTimeRef.current = performance.now();
    setPhase(GamePhase.PREVIEW);
    snowballsRef.current = [];
    spawnQueueRef.current = [];
    lastSpawnTimeRef.current = 0;

    const spawnInterval = 30; // ms between spawns

    const gameLoop = () => {
      const now = performance.now();
      const elapsed = now - phaseStartTimeRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (phaseRef.current === GamePhase.PREVIEW && elapsed > 1500) {
        phaseRef.current = GamePhase.ASSAULT;
        phaseStartTimeRef.current = now;
        setPhase(GamePhase.ASSAULT);
        snowballsRef.current = [];
        spawnQueueRef.current = generateCoverageTargets(width, height);
        lastSpawnTimeRef.current = now;
      }
      
      if (phaseRef.current === GamePhase.ASSAULT) {
        // Spawn from queue
        if (spawnQueueRef.current.length > 0) {
          const timeSinceLastSpawn = now - lastSpawnTimeRef.current;
          if (timeSinceLastSpawn >= spawnInterval) {
            const target = spawnQueueRef.current.shift()!;
            spawnSnowballAt(target.x, target.y, width, height);
            lastSpawnTimeRef.current = now;
          }
        }
        
        // Animate flying snowballs
        let allLanded = true;
        for (const snowball of snowballsRef.current) {
          if (!snowball.landed) {
            snowball.progress += snowball.speed;
            if (snowball.progress >= 1) {
              snowball.progress = 1;
              snowball.landed = true;
            } else {
              allLanded = false;
            }
          }
        }
        
        redrawSnowLayer();
        
        // Transition when queue empty and all landed
        if (spawnQueueRef.current.length === 0 && allLanded && snowballsRef.current.length > 0) {
          phaseRef.current = GamePhase.WIPE;
          phaseStartTimeRef.current = now;
          wipeTimerRef.current = 0;
          setPhase(GamePhase.WIPE);
        }
      }
      
      if (phaseRef.current === GamePhase.WIPE) {
        wipeTimerRef.current = elapsed;
        
        // 108 seconds before next wave
        if (elapsed > 108000) {
          phaseRef.current = GamePhase.ASSAULT;
          phaseStartTimeRef.current = now;
          setPhase(GamePhase.ASSAULT);
          snowballsRef.current = [];
          spawnQueueRef.current = generateCoverageTargets(width, height);
          lastSpawnTimeRef.current = now;
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imagesLoaded, drawBackground, generateCoverageTargets, spawnSnowballAt, redrawSnowLayer]);

  const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (phaseRef.current !== GamePhase.WIPE) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const prev = lastPointerRef.current;
    wipeSnow(clientX, clientY, prev?.x, prev?.y);
    lastPointerRef.current = { x: clientX, y: clientY };
  }, [wipeSnow]);

  const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (phaseRef.current !== GamePhase.WIPE) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    lastPointerRef.current = { x: clientX, y: clientY };
    wipeSnow(clientX, clientY);
  }, [wipeSnow]);

  const handlePointerUp = useCallback(() => {
    lastPointerRef.current = null;
  }, []);

  if (!imagesLoaded) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.5rem',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: phase === GamePhase.WIPE ? 'crosshair' : 'default',
      }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      
      <canvas
        ref={snowCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      <Link
        href="/caregiver/monitoring"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '12px',
          color: '#000',
          textDecoration: 'none',
          fontSize: '1rem',
          fontWeight: 800,
          border: '2px solid rgba(0,0,0,0.3)',
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        Monitoring Dashboard
      </Link>

      {phase === GamePhase.PREVIEW && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 600,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          Look at this beautiful view...
        </div>
      )}

      {phase === GamePhase.ASSAULT && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 600,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          ❄️ Snow incoming! ❄️
        </div>
      )}

      {phase === GamePhase.WIPE && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 600,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          Wipe the snow away! ✋
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.85rem',
        zIndex: 100,
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      }}>
        {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}
      </div>

      {phase === GamePhase.WIPE && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.85rem',
          zIndex: 100,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          Next snow in: {Math.max(0, 108 - Math.floor(wipeTimerRef.current / 1000))}s
        </div>
      )}
    </div>
  );
}
