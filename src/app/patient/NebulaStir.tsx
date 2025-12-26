'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface NebulaStirProps {
  gameSessionDuration: number;
}

export function NebulaStir({ gameSessionDuration }: NebulaStirProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const prevPointerRef = useRef({ x: 0.5, y: 0.5 });
  const velocityFieldRef = useRef<Float32Array | null>(null);
  const densityFieldRef = useRef<Float32Array | null>(null);
  const supernovasRef = useRef<{x: number, y: number, intensity: number, age: number}[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load nebula background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => { imageRef.current = img; };
    img.src = '/games/nebula_bg.jpg';
    return () => { img.onload = null; };
  }, []);

  // Main game loop with high-viscosity fluid dynamics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 64;
    const cellSize = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      cellSize.x = window.innerWidth / gridSize;
      cellSize.y = window.innerHeight / gridSize;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize velocity and density fields
    const fieldSize = gridSize * gridSize * 2;
    velocityFieldRef.current = new Float32Array(fieldSize);
    densityFieldRef.current = new Float32Array(gridSize * gridSize);
    
    for (let i = 0; i < gridSize * gridSize; i++) {
      densityFieldRef.current[i] = 0.3 + Math.random() * 0.4;
    }
    
    timeRef.current = 0;
    supernovasRef.current = [];

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      timeRef.current += 0.016;

      // Night mode check (16:00 - 08:00)
      const hour = new Date().getHours();
      const isNightMode = hour >= 16 || hour < 8;

      // Clear with deep space background
      ctx.fillStyle = '#050210';
      ctx.fillRect(0, 0, width, height);

      // Draw nebula background if loaded
      if (imageRef.current) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(imageRef.current, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      const pointer = pointerRef.current;
      const prevPointer = prevPointerRef.current;
      const velocity = velocityFieldRef.current;
      const density = densityFieldRef.current;

      if (velocity && density && pointer.active) {
        // Calculate velocity for supernova triggering
        const dx = pointer.x - prevPointer.x;
        const dy = pointer.y - prevPointer.y;
        const speed = Math.sqrt(dx * dx + dy * dy) * 60;

        // High viscosity fluid dynamics
        const gridX = Math.floor((pointer.x / width) * gridSize);
        const gridY = Math.floor((pointer.y / height) * gridSize);
        const radius = 5;

        for (let gy = -radius; gy <= radius; gy++) {
          for (let gx = -radius; gx <= radius; gx++) {
            const px = gridX + gx;
            const py = gridY + gy;
            if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
              const dist = Math.sqrt(gx * gx + gy * gy);
              const influence = Math.max(0, 1 - dist / radius);
              const idx = (py * gridSize + px) * 2;
              velocity[idx] += dx * influence * 0.5;
              velocity[idx + 1] += dy * influence * 0.5;
              density[py * gridSize + px] = Math.min(1, density[py * gridSize + px] + influence * 0.1);
            }
          }
        }

        // Trigger supernova on vigorous stirring (v² threshold)
        const velocitySquared = speed * speed;
        if (velocitySquared > 400 && Math.random() < 0.15) {
          supernovasRef.current.push({
            x: pointer.x,
            y: pointer.y,
            intensity: Math.min(2, velocitySquared / 400),
            age: 0
          });
        }
      }

      // Apply viscosity decay
      if (velocity) {
        for (let i = 0; i < velocity.length; i++) {
          velocity[i] *= 0.92;
        }
      }

      // Render supernovas with bloom effect (density field removed to preserve nebula clarity)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = supernovasRef.current.length - 1; i >= 0; i--) {
        const sn = supernovasRef.current[i];
        sn.age += 0.016;
        if (sn.age > 1) {
          supernovasRef.current.splice(i, 1);
          continue;
        }

        let scale, alpha;
        if (sn.age < 0.15) {
          scale = (sn.age / 0.15) * 150 * sn.intensity;
          alpha = sn.age / 0.15;
        } else if (sn.age < 0.25) {
          scale = 150 * sn.intensity;
          alpha = 1;
        } else {
          scale = 150 * sn.intensity + (sn.age - 0.25) * 50;
          alpha = 1 - (sn.age - 0.25) / 0.75;
        }

        const coreGrad = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, scale);
        coreGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        coreGrad.addColorStop(0.2, `rgba(255,200,100,${alpha * 0.8})`);
        coreGrad.addColorStop(0.5, `rgba(255,100,50,${alpha * 0.4})`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, scale, 0, Math.PI * 2);
        ctx.fill();

      }

      ctx.globalCompositeOperation = 'source-over';
      prevPointerRef.current = { x: pointer.x, y: pointer.y };
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    pointerRef.current = { x: clientX - rect.left, y: clientY - rect.top, active: true };
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050210', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchMove={handlePointerMove}
        onTouchStart={handlePointerMove}
        onTouchEnd={handlePointerLeave}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
      />

      {/* Dashboard link */}
      <Link href="/caregiver/monitoring" style={{
        position: 'absolute', top: '20px', right: '20px', padding: '12px 20px',
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', color: '#000',
        textDecoration: 'none', fontSize: '1rem', fontWeight: 800,
        border: '2px solid rgba(0,0,0,0.3)', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        Monitoring Dashboard
      </Link>

      {/* Instruction overlay - AT BOTTOM */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(75, 0, 130, 0.7)', padding: '16px 32px',
          borderRadius: '20px', border: '2px solid rgba(138, 43, 226, 0.5)',
        }}>
          <p style={{ color: '#E6E6FA', fontSize: '1.3rem', margin: 0, textAlign: 'center' }}>
            Move quickly to ignite supernovas!
          </p>
        </div>
      </div>
    </div>
  );
}
