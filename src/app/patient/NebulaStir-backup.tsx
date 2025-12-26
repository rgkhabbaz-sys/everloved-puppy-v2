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

    // Initialize velocity field
    const fieldSize = gridSize * gridSize * 2;
    velocityFieldRef.current = new Float32Array(fieldSize);
    timeRef.current = 0;
    supernovasRef.current = [];

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      timeRef.current += 0.016;

      // Night mode check (16:00-08:00) - Blue channel clamp
      const hour = new Date().getHours();
      const isNightMode = hour >= 16 || hour < 8;

      // Clear and draw background
      ctx.clearRect(0, 0, width, height);
      
      if (imageRef.current) {
        const img = imageRef.current;
        const imgR = img.width / img.height;
        const canR = width / height;
        let dw, dh, dx, dy;
        if (canR > imgR) {
          dw = width; dh = width / imgR; dx = 0; dy = (height - dh) / 2;
        } else {
          dh = height; dw = height * imgR; dx = (width - dw) / 2; dy = 0;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        // Fallback gradient - Deep space
        const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) * 0.7);
        grad.addColorStop(0, '#1a0a2e');
        grad.addColorStop(0.5, '#0d0520');
        grad.addColorStop(1, '#050210');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      const velocities = velocityFieldRef.current;
      if (!velocities) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const pointer = pointerRef.current;
      const prevPointer = prevPointerRef.current;

      // Calculate pointer velocity
      const pointerVelX = (pointer.x - prevPointer.x) * 10;
      const pointerVelY = (pointer.y - prevPointer.y) * 10;
      const pointerSpeed = Math.sqrt(pointerVelX * pointerVelX + pointerVelY * pointerVelY);

      // Add velocity from pointer (high viscosity - thick cosmic dust)
      if (pointer.active && pointerSpeed > 0.01) {
        const gridX = Math.floor(pointer.x * gridSize);
        const gridY = Math.floor(pointer.y * gridSize);
        const radius = 5;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const gx = gridX + dx;
            const gy = gridY + dy;
            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= radius) {
                const falloff = 1 - dist / radius;
                const idx = (gy * gridSize + gx) * 2;
                // High viscosity - slower transfer (0.3 factor)
                velocities[idx] += pointerVelX * falloff * 0.3;
                velocities[idx + 1] += pointerVelY * falloff * 0.3;
              }
            }
          }
        }

        // SUPERNOVA IGNITION: Trigger on vigorous stirring
        // Intensity proportional to velocity squared (v^2)
        if (pointerSpeed > 0.15) {
          const velocitySquared = pointerSpeed * pointerSpeed;
          const supernovaChance = velocitySquared * 0.5;
          if (Math.random() < supernovaChance * 0.1) {
            supernovasRef.current.push({
              x: pointer.x * width,
              y: pointer.y * height,
              intensity: Math.min(1, velocitySquared * 10), // v^2 scaling
              age: 0,
            });
          }
        }
      }

      // High viscosity damping (0.985)
      for (let i = 0; i < velocities.length; i++) {
        velocities[i] *= 0.985;
      }

      // Draw fluid visualization
      ctx.globalCompositeOperation = 'lighter';

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const idx = (gy * gridSize + gx) * 2;
          const vx = velocities[idx];
          const vy = velocities[idx + 1];
          const speed = Math.sqrt(vx * vx + vy * vy);

          if (speed > 0.001) {
            const x = (gx + 0.5) * cellSize.x;
            const y = (gy + 0.5) * cellSize.y;
            const size = 20 + speed * 100;
            const alpha = Math.min(0.4, speed * 2);

            // Deep space palette: Violet, Indigo, Gold (IMMUTABLE)
            const colorPhase = (gx + gy + timeRef.current * 10) % 30;
            let r: number, g: number, b: number;
            if (colorPhase < 10) {
              // Violet
              r = 138; g = 43; b = isNightMode ? 0 : 226;
            } else if (colorPhase < 20) {
              // Indigo
              r = 75; g = 0; b = isNightMode ? 0 : 130;
            } else {
              // Gold
              r = 255; g = 215; b = 0;
            }

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
            gradient.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.3})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw SUPERNOVAS (bloom effect with v^2 intensity)
      for (let i = supernovasRef.current.length - 1; i >= 0; i--) {
        const sn = supernovasRef.current[i];
        sn.age += 0.016;

        if (sn.age > 2) {
          supernovasRef.current.splice(i, 1);
          continue;
        }

        // Supernova phases: expansion -> peak -> fade
        let scale: number, alpha: number;
        if (sn.age < 0.3) {
          // Expansion
          scale = (sn.age / 0.3) * 150 * sn.intensity;
          alpha = sn.age / 0.3;
        } else if (sn.age < 0.5) {
          // Peak brilliance
          scale = 150 * sn.intensity;
          alpha = 1;
        } else {
          // Fade to twinkle
          scale = 150 * sn.intensity + (sn.age - 0.5) * 50;
          alpha = 1 - (sn.age - 0.5) / 1.5;
        }

        // Core glow (additive bloom)
        const coreGrad = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, scale);
        coreGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        coreGrad.addColorStop(0.2, `rgba(255,200,100,${alpha * 0.8})`);
        coreGrad.addColorStop(0.5, `rgba(255,100,50,${alpha * 0.4})`);
        coreGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, scale, 0, Math.PI * 2);
        ctx.fill();

        // Lens flare spikes
        if (sn.age < 0.8) {
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
          ctx.lineWidth = 2;
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(sn.x, sn.y);
            ctx.lineTo(
              sn.x + Math.cos(angle) * scale * 1.5,
              sn.y + Math.sin(angle) * scale * 1.5
            );
            ctx.stroke();
          }
        }
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

  // Pointer handlers
  const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    pointerRef.current = {
      x: clientX / window.innerWidth,
      y: clientY / window.innerHeight,
      active: true,
    };
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

      {/* Instruction overlay */}
      <div style={{
        position: 'absolute', top: 40, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(75, 0, 130, 0.7)', padding: '16px 32px',
          borderRadius: '20px', border: '2px solid rgba(138, 43, 226, 0.5)',
        }}>
          <p style={{ color: '#E6E6FA', fontSize: '1.3rem', margin: 0, textAlign: 'center' }}>
            ✨ Stir the cosmic dust... ✨
          </p>
          <p style={{ color: '#DDA0DD', fontSize: '1rem', margin: '8px 0 0 0', textAlign: 'center' }}>
            Move quickly to ignite supernovas!
          </p>
        </div>
      </div>

      {/* Timer */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(30, 10, 60, 0.8)', padding: '12px 24px',
          borderRadius: '15px', border: '1px solid rgba(138, 43, 226, 0.4)',
        }}>
          <span style={{ color: '#E6E6FA', fontSize: '1.1rem' }}>
            🌌 Session: {Math.floor(gameSessionDuration / 60)}:{(gameSessionDuration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
