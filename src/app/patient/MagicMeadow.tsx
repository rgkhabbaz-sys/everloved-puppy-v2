'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';

interface MagicMeadowProps {
  gameSessionDuration: number;
}

export function MagicMeadow({ gameSessionDuration }: MagicMeadowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const outlineImageRef = useRef<HTMLImageElement | null>(null);
  const finalImageRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  
  // Game state
  const [gamePhase, setGamePhase] = useState<'waiting' | 'painting' | 'celebration' | 'resetting'>('waiting');
  const phaseRef = useRef<'waiting' | 'painting' | 'celebration' | 'resetting'>('waiting');
  const celebrationTimerRef = useRef(0);
  const waitingTimerRef = useRef(180); // 3 seconds at 60fps
  const resetProgressRef = useRef(0);
  const revealPercentRef = useRef(0);

  // Load images
  useEffect(() => {
    const outlineImg = new Image();
    outlineImg.onload = () => { outlineImageRef.current = outlineImg; };
    outlineImg.src = '/games/magic_meadow_outline.jpg';

    const finalImg = new Image();
    finalImg.onload = () => { finalImageRef.current = finalImg; };
    finalImg.src = '/games/magic_meadow_final.jpg';

    return () => {
      outlineImg.onload = null;
      finalImg.onload = null;
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

    // Create mask canvas
    maskCanvasRef.current = document.createElement('canvas');
    const maskCtx = maskCanvasRef.current.getContext('2d');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Match mask canvas size
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = width;
        maskCanvasRef.current.height = height;
        // Fill mask with white (opaque) initially
        const mCtx = maskCanvasRef.current.getContext('2d');
        if (mCtx) {
          mCtx.fillStyle = 'white';
          mCtx.fillRect(0, 0, width, height);
        }
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const brushRadius = 85;
    let frameCount = 0;

    const calculateRevealPercent = () => {
      if (!maskCanvasRef.current || !maskCtx) return 0;
      
      // Sample pixels for performance (check every 10th pixel)
      const imageData = maskCtx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let transparent = 0;
      let total = 0;
      
      for (let i = 0; i < data.length; i += 40) { // Sample every 10th pixel (4 channels * 10)
        total++;
        if (data[i + 3] < 128) { // Alpha channel < 50% = revealed
          transparent++;
        }
      }
      
      return transparent / total;
    };

    const render = () => {
      const pointer = pointerRef.current;

      // Clear main canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // ========== STATE MACHINE ==========
      
      if (phaseRef.current === 'waiting') {
        waitingTimerRef.current--;
        if (waitingTimerRef.current <= 0) {
          phaseRef.current = 'painting';
          setGamePhase('painting');
        }
      }
      
      else if (phaseRef.current === 'painting') {
        // Paint onto mask where pointer is active
        if (maskCtx && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
          // Create soft circular brush
          const gradient = maskCtx.createRadialGradient(
            pointer.x, pointer.y, 0,
            pointer.x, pointer.y, brushRadius
          );
          gradient.addColorStop(0, 'rgba(0,0,0,1)');
          gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          
          maskCtx.globalCompositeOperation = 'destination-out';
          maskCtx.fillStyle = gradient;
          maskCtx.beginPath();
          maskCtx.arc(pointer.x, pointer.y, brushRadius, 0, Math.PI * 2);
          maskCtx.fill();
          maskCtx.globalCompositeOperation = 'source-over';
        }

        // Check reveal percentage every 10 frames
        frameCount++;
        if (frameCount % 10 === 0) {
          revealPercentRef.current = calculateRevealPercent();
          
          if (revealPercentRef.current >= 0.80) {
            phaseRef.current = 'celebration';
            setGamePhase('celebration');
            celebrationTimerRef.current = 300; // 5 seconds at 60fps
          }
        }
      }
      
      else if (phaseRef.current === 'celebration') {
        celebrationTimerRef.current--;
        if (celebrationTimerRef.current <= 0) {
          phaseRef.current = 'resetting';
          setGamePhase('resetting');
          resetProgressRef.current = 0;
        }
      }
      
      else if (phaseRef.current === 'resetting') {
        resetProgressRef.current += 0.02; // ~1 second fade
        
        if (resetProgressRef.current >= 1) {
          // Reset mask to fully opaque (white)
          if (maskCtx) {
            maskCtx.fillStyle = 'white';
            maskCtx.fillRect(0, 0, width, height);
          }
          revealPercentRef.current = 0;
          waitingTimerRef.current = 180; // Reset 3 second wait
          phaseRef.current = 'waiting';
          setGamePhase('waiting');
          resetProgressRef.current = 0;
        }
      }

      // ========== RENDERING ==========

      // Layer 1: Draw full color image (bottom)
      if (finalImageRef.current) {
        ctx.drawImage(finalImageRef.current, 0, 0, width, height);
      }

      // Layer 2: Draw outline with mask (top) - only during painting or resetting
      if (outlineImageRef.current && maskCanvasRef.current && phaseRef.current !== 'celebration') {
        // Create temporary canvas for masked outline
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw outline
          tempCtx.drawImage(outlineImageRef.current, 0, 0, width, height);
          
          // Apply mask
          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.drawImage(maskCanvasRef.current, 0, 0);
          
          // During reset, fade out the outline
          if (phaseRef.current === 'resetting') {
            ctx.globalAlpha = 1 - resetProgressRef.current;
          }
          
          // Draw masked outline onto main canvas
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1;
        }
      }

      // Cursor glow (only during painting)
      if (phaseRef.current === 'painting' && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
        const glowGrad = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, brushRadius + 20
        );
        glowGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
        glowGrad.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, brushRadius + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Celebration message
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
    <div style={{ position: 'fixed', inset: 0, background: '#1a1a1a', overflow: 'hidden' }}>
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
          background: 'rgba(122, 155, 109, 0.85)', padding: '16px 24px',
          borderRadius: '20px', border: '2px solid rgba(150, 180, 140, 0.5)',
          maxWidth: '220px',
        }}>
          <p style={{ color: '#FFF8F0', fontSize: '1.1rem', margin: 0, textAlign: 'left', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {gamePhase === 'waiting' && 'Admire the sketch...'}
            {gamePhase === 'painting' && 'Gently paint the meadow to life...'}
            {gamePhase === 'celebration' && 'Admire your creation!'}
            {gamePhase === 'resetting' && 'A fresh canvas awaits...'}
          </p>
        </div>
      </div>
    </div>
  );
}
