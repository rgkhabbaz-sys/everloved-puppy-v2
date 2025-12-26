'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';

interface HiddenStatueProps {
  gameSessionDuration: number;
}

export function HiddenStatue({ gameSessionDuration }: HiddenStatueProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const revealMaskRef = useRef<Float32Array | null>(null);
  const statueImageRef = useRef<HTMLImageElement | null>(null);
  const slabImageRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  
  // Game state as React state for UI updates
  const [gamePhase, setGamePhase] = useState<'carving' | 'celebration' | 'fading'>('carving');
  const phaseRef = useRef<'carving' | 'celebration' | 'fading'>('carving');
  const celebrationTimerRef = useRef(0);
  const slabOpacityRef = useRef(1); // 1 = full slab, 0 = no slab

  // Load images
  useEffect(() => {
    const statueImg = new Image();
    statueImg.onload = () => { statueImageRef.current = statueImg; };
    statueImg.src = '/games/hidden_statue_final.png';

    const slabImg = new Image();
    slabImg.onload = () => { slabImageRef.current = slabImg; };
    slabImg.src = '/games/marble_slab_tall.png';

    return () => {
      statueImg.onload = null;
      slabImg.onload = null;
    };
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const gridSize = 60;

    // Statue zone - center 40% width, 80% height
    const getStatueZone = () => ({
      xStart: Math.floor(gridSize * 0.30),
      xEnd: Math.floor(gridSize * 0.70),
      yStart: Math.floor(gridSize * 0.10),
      yEnd: Math.floor(gridSize * 0.90),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!revealMaskRef.current || revealMaskRef.current.length !== gridSize * gridSize) {
        revealMaskRef.current = new Float32Array(gridSize * gridSize);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const brushRadius = 8;
    const revealRate = 0.06;

    const render = () => {
      const pointer = pointerRef.current;
      const mask = revealMaskRef.current;
      const zone = getStatueZone();

      // Clear
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(0, 0, width, height);

      // ========== STATE MACHINE ==========
      
      if (phaseRef.current === 'carving') {
        // Update mask where pointer is active
        if (mask && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
          const gridX = Math.floor((pointer.x / width) * gridSize);
          const gridY = Math.floor((pointer.y / height) * gridSize);

          for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            for (let dx = -brushRadius; dx <= brushRadius; dx++) {
              const px = gridX + dx;
              const py = gridY + dy;
              if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= brushRadius) {
                  const falloff = 1 - (dist / brushRadius);
                  const influence = falloff * falloff * revealRate;
                  const idx = py * gridSize + px;
                  mask[idx] = Math.min(1, mask[idx] + influence);
                }
              }
            }
          }
        }

        // Check statue zone reveal percentage
        if (mask) {
          let zoneRevealed = 0;
          let zoneTotal = 0;
          for (let gy = zone.yStart; gy < zone.yEnd; gy++) {
            for (let gx = zone.xStart; gx < zone.xEnd; gx++) {
              zoneTotal++;
              zoneRevealed += mask[gy * gridSize + gx];
            }
          }
          const revealPercent = zoneRevealed / zoneTotal;

          // Trigger celebration when 48% of statue zone revealed
          if (revealPercent >= 0.48) {
            phaseRef.current = 'celebration';
            setGamePhase('celebration');
            celebrationTimerRef.current = 180; // 3 seconds at 60fps
            slabOpacityRef.current = 0; // Hide slab completely
          }
        }
      }
      
      else if (phaseRef.current === 'celebration') {
        celebrationTimerRef.current--;
        if (celebrationTimerRef.current <= 0) {
          phaseRef.current = 'fading';
          setGamePhase('fading');
          slabOpacityRef.current = 0; // Start from no slab
        }
      }
      
      else if (phaseRef.current === 'fading') {
        // Gradually bring slab back (~1 second)
        slabOpacityRef.current += 0.016;
        
        if (slabOpacityRef.current >= 1) {
          slabOpacityRef.current = 1;
          // Reset mask for new round
          if (mask) {
            for (let i = 0; i < mask.length; i++) {
              mask[i] = 0;
            }
          }
          phaseRef.current = 'carving';
          setGamePhase('carving');
        }
      }

      // ========== RENDERING ==========

      // Layer 1: Statue (always underneath)
      if (statueImageRef.current) {
        ctx.drawImage(statueImageRef.current, 0, 0, width, height);
      }

      // Layer 2: Slab with reveal holes
      if (slabImageRef.current && mask) {
        const cellWidth = width / gridSize;
        const cellHeight = height / gridSize;

        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            const maskValue = mask[gy * gridSize + gx];
            
            // During fading, use global slab opacity
            // During carving, use mask value
            let cellSlabOpacity;
            if (phaseRef.current === 'fading' || phaseRef.current === 'celebration') {
              cellSlabOpacity = slabOpacityRef.current;
            } else {
              cellSlabOpacity = (1 - maskValue) * slabOpacityRef.current;
              // Ensure slab is visible during carving
              if (slabOpacityRef.current < 1) slabOpacityRef.current = 1;
              cellSlabOpacity = 1 - maskValue;
            }

            if (cellSlabOpacity > 0.01) {
              const destX = gx * cellWidth;
              const destY = gy * cellHeight;
              
              const srcX = (gx / gridSize) * slabImageRef.current.width;
              const srcY = (gy / gridSize) * slabImageRef.current.height;
              const srcW = slabImageRef.current.width / gridSize;
              const srcH = slabImageRef.current.height / gridSize;

              ctx.globalAlpha = cellSlabOpacity;
              ctx.drawImage(
                slabImageRef.current,
                srcX, srcY, srcW, srcH,
                destX, destY, cellWidth + 0.5, cellHeight + 0.5
              );
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Soft vignette
      const vignetteGrad = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height
      );
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, width, height);

      // Cursor glow (only during carving)
      if (phaseRef.current === 'carving' && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
        const glowGrad = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, 50
        );
        glowGrad.addColorStop(0, 'rgba(255, 248, 220, 0.3)');
        glowGrad.addColorStop(0.5, 'rgba(255, 248, 220, 0.1)');
        glowGrad.addColorStop(1, 'rgba(255, 248, 220, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 50, 0, Math.PI * 2);
        ctx.fill();
      }

      // Celebration message - left side, no background
      if (phaseRef.current === 'celebration') {
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.fillText('✨ Beautiful! ✨', 30, height / 2);
        ctx.shadowBlur = 0;
      }

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

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1510', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onTouchMove={handlePointerMove}
        onTouchStart={handlePointerMove}
        onTouchEnd={handlePointerLeave}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'none' }}
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

      {/* Instruction - left side */}
      <div style={{
        position: 'absolute', bottom: 80, left: 20,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(176, 169, 159, 0.8)', padding: '16px 24px',
          borderRadius: '20px', border: '2px solid rgba(200, 192, 180, 0.5)',
          maxWidth: '200px',
        }}>
          <p style={{ color: '#FFF8F0', fontSize: '1.1rem', margin: 0, textAlign: 'left', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {gamePhase === 'carving' && 'Gently brush to carve the statue...'}
            {gamePhase === 'celebration' && 'Admire your work!'}
            {gamePhase === 'fading' && 'A new block arrives...'}
          </p>
        </div>
      </div>

    </div>
  );
}
