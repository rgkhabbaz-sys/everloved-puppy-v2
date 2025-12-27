'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface ColorChemistProps {
  gameSessionDuration: number;
  onEndGame?: () => void;
}

// Target green shades for different rounds (HSL-ish: more yellow = warmer green, more blue = cooler)
const TARGET_GREENS = [
  { blue: 0.5, yellow: 0.5, name: 'Forest Green' },      // Perfect balance
  { blue: 0.4, yellow: 0.6, name: 'Lime Green' },        // More yellow = lime
  { blue: 0.6, yellow: 0.4, name: 'Emerald Green' },     // More blue = teal-ish
  { blue: 0.45, yellow: 0.55, name: 'Spring Green' },    // Slightly yellow
  { blue: 0.55, yellow: 0.45, name: 'Sea Green' },       // Slightly blue
];

export function ColorChemist({ gameSessionDuration, onEndGame }: ColorChemistProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const puppyImageRef = useRef<HTMLImageElement | null>(null);

  // Game state
  const [gamePhase, setGamePhase] = useState<'intro' | 'mixing' | 'success' | 'transition'>('intro');
  const phaseRef = useRef<'intro' | 'mixing' | 'success' | 'transition'>('intro');
  const introTimerRef = useRef(180); // 3 seconds intro
  const successTimerRef = useRef(0);
  const transitionTimerRef = useRef(0);

  // Mixing state
  const blueAmountRef = useRef(0);    // 0-1 how much blue poured
  const yellowAmountRef = useRef(0);  // 0-1 how much yellow poured
  const liquidLevelRef = useRef(0);   // 0-1 fill level of mixing vial

  // Pouring state
  const pouringRef = useRef<'none' | 'blue' | 'yellow'>('none');
  const pourStreamRef = useRef<Array<{x: number, y: number, color: string, age: number}>>([]);

  // Target and round
  const roundRef = useRef(0);
  const targetRef = useRef(TARGET_GREENS[0]);

  // Guide pulse animation
  const guidePulseRef = useRef(0);

  // Pointer tracking
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });

  // Vial positions (will be set in render based on canvas size)
  const vialsRef = useRef({
    blue: { x: 0, y: 0, width: 0, height: 0 },
    yellow: { x: 0, y: 0, width: 0, height: 0 },
    mixing: { x: 0, y: 0, width: 0, height: 0 },
    target: { x: 0, y: 0, width: 0, height: 0 },
  });

  // Load puppy image
  useEffect(() => {
    const puppyImg = new Image();
    puppyImg.onload = () => { puppyImageRef.current = puppyImg; };
    puppyImg.src = '/puppy.png';

    return () => {
      puppyImg.onload = null;
    };
  }, []);

  // Calculate mixed color from blue and yellow amounts
  const getMixedColor = (blue: number, yellow: number): { r: number, g: number, b: number } => {
    const total = blue + yellow;
    if (total === 0) return { r: 255, g: 255, b: 255 }; // Empty = clear

    // Blue RGB: (65, 155, 200)
    // Yellow RGB: (230, 200, 50)
    // Mixed green depends on ratio
    const blueRatio = blue / Math.max(total, 0.01);
    const yellowRatio = yellow / Math.max(total, 0.01);

    // Base green: (80, 180, 80)
    // Shift toward blue-green or yellow-green based on ratio
    const r = Math.round(50 + yellowRatio * 100 - blueRatio * 20);
    const g = Math.round(160 + Math.min(total, 1) * 40);
    const b = Math.round(50 + blueRatio * 80 - yellowRatio * 20);

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b))
    };
  };

  // Check if current mix matches target
  const checkMatch = (blue: number, yellow: number, target: typeof TARGET_GREENS[0]): boolean => {
    const total = blue + yellow;
    if (total < 0.3) return false; // Need minimum fill

    const blueRatio = blue / total;
    const yellowRatio = yellow / total;

    // Check if within tolerance of target
    const tolerance = 0.15;
    return Math.abs(blueRatio - target.blue) < tolerance &&
           Math.abs(yellowRatio - target.yellow) < tolerance &&
           total >= 0.5; // Need at least 50% fill
  };

  // Get which vial needs more (for guidance)
  const getGuidance = (blue: number, yellow: number, target: typeof TARGET_GREENS[0]): 'blue' | 'yellow' | 'none' => {
    const total = blue + yellow;
    if (total < 0.1) return 'none'; // Just started, no guidance yet

    const blueRatio = blue / Math.max(total, 0.01);
    const targetBlueRatio = target.blue;

    if (blueRatio < targetBlueRatio - 0.1) return 'blue';
    if (blueRatio > targetBlueRatio + 0.1) return 'yellow';
    return 'none';
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Update vial positions
      const vialWidth = Math.min(width * 0.12, 100);
      const vialHeight = vialWidth * 2.5;

      vialsRef.current = {
        blue: {
          x: width * 0.2 - vialWidth/2,
          y: height * 0.12,
          width: vialWidth,
          height: vialHeight
        },
        yellow: {
          x: width * 0.8 - vialWidth/2,
          y: height * 0.12,
          width: vialWidth,
          height: vialHeight
        },
        mixing: {
          x: width * 0.5 - vialWidth * 0.75,
          y: height * 0.4,
          width: vialWidth * 1.5,
          height: vialHeight * 1.2
        },
        target: {
          x: width * 0.5 - vialWidth * 0.5,
          y: height * 0.82,
          width: vialWidth,
          height: vialHeight * 0.6
        },
      };
    };
    resize();
    window.addEventListener('resize', resize);

    // Draw a vial shape
    const drawVial = (
      x: number, y: number, w: number, h: number,
      fillColor: string | null, fillLevel: number,
      glowing: boolean, tilt: number = 0
    ) => {
      ctx.save();
      ctx.translate(x + w/2, y + h/2);
      ctx.rotate(tilt * Math.PI / 180);
      ctx.translate(-w/2, -h/2);

      // Vial body (rounded rectangle)
      const radius = w * 0.2;
      ctx.beginPath();
      ctx.roundRect(0, h * 0.15, w, h * 0.85, [0, 0, radius, radius]);

      // Glass effect
      ctx.fillStyle = 'rgba(240, 248, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Liquid fill
      if (fillColor && fillLevel > 0) {
        const liquidHeight = h * 0.85 * fillLevel;
        const liquidY = h - liquidHeight;

        ctx.beginPath();
        ctx.roundRect(4, Math.max(liquidY, h * 0.15), w - 8, liquidHeight - 4, [0, 0, radius - 4, radius - 4]);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Liquid surface shimmer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(8, liquidY + 2, w - 16, 4);
      }

      // Neck
      ctx.beginPath();
      ctx.roundRect(w * 0.25, 0, w * 0.5, h * 0.2, [radius/2, radius/2, 0, 0]);
      ctx.fillStyle = 'rgba(240, 248, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.8)';
      ctx.stroke();

      // Glow effect
      if (glowing) {
        ctx.shadowColor = fillColor || 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 20 + Math.sin(guidePulseRef.current) * 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Glass highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(w * 0.1, h * 0.2, w * 0.15, h * 0.5);

      ctx.restore();
    };

    // Draw pour stream particles
    const drawPourStream = () => {
      const stream = pourStreamRef.current;
      for (let i = stream.length - 1; i >= 0; i--) {
        const p = stream[i];
        p.y += 8; // Gravity
        p.age++;

        if (p.age > 60) {
          stream.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, 1 - p.age / 60);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.fill();
      }
    };

    // Draw puppy guide
    const drawPuppy = (expression: 'neutral' | 'happy' | 'encouraging') => {
      const puppySize = Math.min(width * 0.15, 120);
      const puppyX = 20;
      const puppyY = height - puppySize - 100;

      if (puppyImageRef.current) {
        ctx.save();

        // Subtle bounce for happy expression
        let bounceY = 0;
        if (expression === 'happy') {
          bounceY = Math.sin(Date.now() / 150) * 5;
        }

        // Draw puppy
        ctx.drawImage(
          puppyImageRef.current,
          puppyX, puppyY + bounceY,
          puppySize, puppySize * 0.8
        );

        // Happy sparkles
        if (expression === 'happy') {
          ctx.font = '24px system-ui';
          ctx.fillText('✨', puppyX + puppySize - 10, puppyY - 5);
          ctx.fillText('💚', puppyX + puppySize + 10, puppyY + 20);
        }

        ctx.restore();
      } else {
        // Fallback: simple puppy shape
        ctx.save();
        ctx.fillStyle = '#D4A84A';
        ctx.beginPath();
        ctx.ellipse(puppyX + puppySize/2, puppyY + puppySize/2, puppySize/2, puppySize/2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(puppyX + puppySize * 0.35, puppyY + puppySize * 0.4, 6, 0, Math.PI * 2);
        ctx.arc(puppyX + puppySize * 0.65, puppyY + puppySize * 0.4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(puppyX + puppySize/2, puppyY + puppySize * 0.55, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        if (expression === 'happy') {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(puppyX + puppySize/2, puppyY + puppySize * 0.5, 15, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }

        ctx.restore();
      }
    };

    // Draw confetti for celebration
    const confettiRef: Array<{x: number, y: number, vx: number, vy: number, color: string, rotation: number}> = [];
    const drawConfetti = () => {
      // Add new confetti
      if (phaseRef.current === 'success' && Math.random() < 0.3) {
        confettiRef.push({
          x: width * 0.3 + Math.random() * width * 0.4,
          y: height * 0.3,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 3,
          color: ['#4A90A4', '#E8C832', '#7CB342', '#FFD700', '#FF69B4'][Math.floor(Math.random() * 5)],
          rotation: Math.random() * 360
        });
      }

      // Update and draw confetti
      for (let i = confettiRef.length - 1; i >= 0; i--) {
        const c = confettiRef[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15; // Gravity
        c.rotation += 5;

        if (c.y > height + 20) {
          confettiRef.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation * Math.PI / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }
    };

    const render = () => {
      const pointer = pointerRef.current;
      const vials = vialsRef.current;

      // Update guide pulse
      guidePulseRef.current += 0.1;

      // Clear with lab background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#f5f5f0');
      bgGradient.addColorStop(0.5, '#e8e8e0');
      bgGradient.addColorStop(1, '#d8d8d0');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Lab bench surface
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, height * 0.75, width, height * 0.25);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, height * 0.75, width, 3);

      // ========== STATE MACHINE ==========

      if (phaseRef.current === 'intro') {
        introTimerRef.current--;
        if (introTimerRef.current <= 0) {
          phaseRef.current = 'mixing';
          setGamePhase('mixing');
        }
      }

      else if (phaseRef.current === 'mixing') {
        // Handle pouring
        if (pouringRef.current === 'blue') {
          blueAmountRef.current = Math.min(1, blueAmountRef.current + 0.008);
          liquidLevelRef.current = Math.min(1, (blueAmountRef.current + yellowAmountRef.current) / 2);

          // Add pour stream particles
          const blueVial = vials.blue;
          pourStreamRef.current.push({
            x: blueVial.x + blueVial.width * 0.7 + Math.random() * 10,
            y: blueVial.y + blueVial.height * 0.3,
            color: 'rgb(65, 155, 200)',
            age: 0
          });
        }

        if (pouringRef.current === 'yellow') {
          yellowAmountRef.current = Math.min(1, yellowAmountRef.current + 0.008);
          liquidLevelRef.current = Math.min(1, (blueAmountRef.current + yellowAmountRef.current) / 2);

          // Add pour stream particles
          const yellowVial = vials.yellow;
          pourStreamRef.current.push({
            x: yellowVial.x + yellowVial.width * 0.3 + Math.random() * 10,
            y: yellowVial.y + yellowVial.height * 0.3,
            color: 'rgb(230, 200, 50)',
            age: 0
          });
        }

        // Check for match
        if (checkMatch(blueAmountRef.current, yellowAmountRef.current, targetRef.current)) {
          phaseRef.current = 'success';
          setGamePhase('success');
          successTimerRef.current = 240; // 4 seconds celebration
          pouringRef.current = 'none';
        }
      }

      else if (phaseRef.current === 'success') {
        successTimerRef.current--;
        if (successTimerRef.current <= 0) {
          phaseRef.current = 'transition';
          setGamePhase('transition');
          transitionTimerRef.current = 60; // 1 second transition
        }
      }

      else if (phaseRef.current === 'transition') {
        transitionTimerRef.current--;
        if (transitionTimerRef.current <= 0) {
          // Reset for next round
          blueAmountRef.current = 0;
          yellowAmountRef.current = 0;
          liquidLevelRef.current = 0;
          pourStreamRef.current = [];

          // Next target (cycle through)
          roundRef.current = (roundRef.current + 1) % TARGET_GREENS.length;
          targetRef.current = TARGET_GREENS[roundRef.current];

          phaseRef.current = 'mixing';
          setGamePhase('mixing');
        }
      }

      // ========== RENDERING ==========

      // Get guidance for glowing
      const guidance = getGuidance(blueAmountRef.current, yellowAmountRef.current, targetRef.current);

      // Draw source vials (tilted for pouring effect)
      const blueTilt = pouringRef.current === 'blue' ? 25 : 10;
      const yellowTilt = pouringRef.current === 'yellow' ? -25 : -10;

      drawVial(
        vials.blue.x, vials.blue.y, vials.blue.width, vials.blue.height,
        'rgb(65, 155, 200)', 1 - blueAmountRef.current * 0.3,
        guidance === 'blue',
        blueTilt
      );

      drawVial(
        vials.yellow.x, vials.yellow.y, vials.yellow.width, vials.yellow.height,
        'rgb(230, 200, 50)', 1 - yellowAmountRef.current * 0.3,
        guidance === 'yellow',
        yellowTilt
      );

      // Labels for source vials
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#4A90A4';
      ctx.textAlign = 'center';
      ctx.fillText('BLUE', vials.blue.x + vials.blue.width/2, vials.blue.y + vials.blue.height + 30);

      ctx.fillStyle = '#B8960A';
      ctx.fillText('YELLOW', vials.yellow.x + vials.yellow.width/2, vials.yellow.y + vials.yellow.height + 30);

      // Draw pour stream
      drawPourStream();

      // Draw mixing vial
      const mixedColor = getMixedColor(blueAmountRef.current, yellowAmountRef.current);
      const mixedColorStr = `rgb(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b})`;

      drawVial(
        vials.mixing.x, vials.mixing.y, vials.mixing.width, vials.mixing.height,
        liquidLevelRef.current > 0 ? mixedColorStr : null,
        liquidLevelRef.current,
        phaseRef.current === 'success',
        0
      );

      // Mixing vial label
      ctx.fillStyle = '#555';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('MIX HERE', vials.mixing.x + vials.mixing.width/2, vials.mixing.y - 15);

      // Draw target vial
      const targetColor = getMixedColor(targetRef.current.blue, targetRef.current.yellow);
      const targetColorStr = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;

      drawVial(
        vials.target.x, vials.target.y, vials.target.width, vials.target.height,
        targetColorStr, 0.8,
        false,
        0
      );

      // Target label
      ctx.fillStyle = '#555';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('TARGET: ' + targetRef.current.name, vials.target.x + vials.target.width/2, vials.target.y - 15);

      // Arrow pointing from target to mixing vial
      if (phaseRef.current === 'mixing') {
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(vials.target.x + vials.target.width/2, vials.target.y - 5);
        ctx.lineTo(vials.mixing.x + vials.mixing.width/2, vials.mixing.y + vials.mixing.height + 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // "Match this!" text
        ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('↑ Match this color!', vials.target.x + vials.target.width/2, vials.target.y + vials.target.height + 25);
      }

      // Draw puppy guide
      const puppyExpression = phaseRef.current === 'success' ? 'happy' :
                              guidance !== 'none' ? 'encouraging' : 'neutral';
      drawPuppy(puppyExpression);

      // Draw confetti during success
      if (phaseRef.current === 'success') {
        drawConfetti();
      }

      // Success message
      if (phaseRef.current === 'success') {
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.fillStyle = '#7CB342';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.fillText('🎉 Perfect! You made ' + targetRef.current.name + '! 🎉', width/2, height * 0.25);
        ctx.shadowBlur = 0;
      }

      // Transition fade
      if (phaseRef.current === 'transition') {
        const fadeAlpha = 1 - transitionTimerRef.current / 60;
        ctx.fillStyle = `rgba(245, 245, 240, ${fadeAlpha * 0.5})`;
        ctx.fillRect(0, 0, width, height);

        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.fillStyle = `rgba(100, 100, 100, ${fadeAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('New color coming...', width/2, height/2);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Check if point is inside vial
  const isInsideVial = (x: number, y: number, vial: {x: number, y: number, width: number, height: number}) => {
    return x >= vial.x && x <= vial.x + vial.width &&
           y >= vial.y && y <= vial.y + vial.height;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (phaseRef.current !== 'mixing') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const vials = vialsRef.current;

    if (isInsideVial(x, y, vials.blue)) {
      pouringRef.current = 'blue';
    } else if (isInsideVial(x, y, vials.yellow)) {
      pouringRef.current = 'yellow';
    }

    pointerRef.current = { x, y, active: true };
  }, []);

  const handlePointerUp = useCallback(() => {
    pouringRef.current = 'none';
    pointerRef.current.active = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    pointerRef.current = { x: clientX - rect.left, y: clientY - rect.top, active: pointerRef.current.active };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f0', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchMove={handlePointerMove}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'pointer' }}
      />

      {/* Dashboard button */}
      <button onClick={onEndGame} style={{
        position: 'absolute', top: '20px', right: '20px', padding: '12px 20px',
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', color: '#000',
        fontSize: '1rem', fontWeight: 800,
        border: '2px solid rgba(0,0,0,0.3)', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
      }}>
        Monitoring Dashboard
      </button>

      {/* Instruction box */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        pointerEvents: 'none', zIndex: 50,
      }}>
        <div style={{
          background: 'rgba(74, 144, 164, 0.9)', padding: '16px 24px',
          borderRadius: '20px', border: '2px solid rgba(100, 180, 200, 0.5)',
          maxWidth: '280px',
        }}>
          <p style={{ color: '#FFF', fontSize: '1.1rem', margin: 0, textAlign: 'left', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {gamePhase === 'intro' && "Let's make some green! Tap and hold the blue or yellow vials to pour."}
            {gamePhase === 'mixing' && 'Pour blue and yellow to match the target green below!'}
            {gamePhase === 'success' && 'Wonderful! You matched the color perfectly!'}
            {gamePhase === 'transition' && 'Great job! Here comes a new shade...'}
          </p>
        </div>
      </div>

      {/* Round indicator */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px',
        background: 'rgba(255,255,255,0.9)', padding: '8px 16px',
        borderRadius: '12px', border: '2px solid rgba(0,0,0,0.1)',
        zIndex: 50,
      }}>
        <p style={{ color: '#555', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
          Round {roundRef.current + 1}
        </p>
      </div>
    </div>
  );
}
