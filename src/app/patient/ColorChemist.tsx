'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface ColorChemistProps {
  gameSessionDuration: number;
  onEndGame?: () => void;
}

// Color mixing utility - subtractive color mixing (like paint)
const mixColors = (colors: { r: number; g: number; b: number }[]): { r: number; g: number; b: number } => {
  if (colors.length === 0) return { r: 255, g: 255, b: 255 }; // White if no colors
  if (colors.length === 1) return colors[0];

  // Subtractive mixing - each color absorbs light
  let c = 1, m = 1, y = 1;

  for (const color of colors) {
    // Convert RGB to CMY
    const cyan = 1 - color.r / 255;
    const magenta = 1 - color.g / 255;
    const yellow = 1 - color.b / 255;

    c = Math.min(1, c + cyan * 0.5);
    m = Math.min(1, m + magenta * 0.5);
    y = Math.min(1, y + yellow * 0.5);
  }

  return {
    r: Math.round((1 - c) * 255),
    g: Math.round((1 - m) * 255),
    b: Math.round((1 - y) * 255),
  };
};

// Primary colors for mixing
const PRIMARY_COLORS = [
  { name: 'Red', r: 220, g: 50, b: 50, hex: '#DC3232' },
  { name: 'Yellow', r: 255, g: 220, b: 50, hex: '#FFDC32' },
  { name: 'Blue', r: 50, g: 100, b: 220, hex: '#3264DC' },
];

// Target colors to create (achievable by mixing primaries)
const TARGET_COLORS = [
  { name: 'Orange', r: 255, g: 140, b: 50, hint: 'Red + Yellow' },
  { name: 'Green', r: 80, g: 160, b: 80, hint: 'Yellow + Blue' },
  { name: 'Purple', r: 140, g: 70, b: 160, hint: 'Red + Blue' },
  { name: 'Brown', r: 140, g: 90, b: 60, hint: 'Red + Yellow + Blue' },
  { name: 'Pink', r: 230, g: 130, b: 130, hint: 'Just Red' },
  { name: 'Light Blue', r: 130, g: 170, b: 220, hint: 'Just Blue' },
];

export function ColorChemist({ gameSessionDuration, onEndGame }: ColorChemistProps) {
  const [selectedColors, setSelectedColors] = useState<number[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<'mixing' | 'success' | 'hint'>('mixing');
  const [showHint, setShowHint] = useState(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTarget = TARGET_COLORS[targetIndex % TARGET_COLORS.length];

  // Calculate mixed color
  const getMixedColor = useCallback(() => {
    if (selectedColors.length === 0) {
      return { r: 240, g: 240, b: 240 }; // Light gray for empty beaker
    }

    const colorsToMix = selectedColors.map(i => ({
      r: PRIMARY_COLORS[i].r,
      g: PRIMARY_COLORS[i].g,
      b: PRIMARY_COLORS[i].b,
    }));

    return mixColors(colorsToMix);
  }, [selectedColors]);

  const mixedColor = getMixedColor();
  const mixedHex = `rgb(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b})`;
  const targetHex = `rgb(${currentTarget.r}, ${currentTarget.g}, ${currentTarget.b})`;

  // Check if colors match (with tolerance)
  const checkMatch = useCallback(() => {
    const tolerance = 60;
    const dr = Math.abs(mixedColor.r - currentTarget.r);
    const dg = Math.abs(mixedColor.g - currentTarget.g);
    const db = Math.abs(mixedColor.b - currentTarget.b);

    return dr < tolerance && dg < tolerance && db < tolerance && selectedColors.length > 0;
  }, [mixedColor, currentTarget, selectedColors]);

  // Handle color toggle
  const toggleColor = (index: number) => {
    if (gamePhase !== 'mixing') return;

    setSelectedColors(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
    setShowHint(false);

    // Reset hint timer
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = setTimeout(() => {
      setShowHint(true);
    }, 8000);
  };

  // Check for match on color change
  useEffect(() => {
    if (checkMatch() && gamePhase === 'mixing') {
      setGamePhase('success');
      setScore(s => s + 1);

      // Move to next target after delay
      setTimeout(() => {
        setTargetIndex(i => i + 1);
        setSelectedColors([]);
        setGamePhase('mixing');
        setShowHint(false);
      }, 2000);
    }
  }, [selectedColors, checkMatch, gamePhase]);

  // Start hint timer
  useEffect(() => {
    hintTimerRef.current = setTimeout(() => {
      setShowHint(true);
    }, 8000);

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [targetIndex]);

  // Reset beaker
  const resetBeaker = () => {
    setSelectedColors([]);
    setShowHint(false);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = setTimeout(() => {
      setShowHint(true);
    }, 8000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #2C3E50 0%, #1a1a2e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif',
    }}>
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

      {/* Score */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px',
        background: 'rgba(255,255,255,0.15)', padding: '12px 24px',
        borderRadius: '12px', color: '#fff',
      }}>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Colors Mixed: </span>
        <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{score}</span>
      </div>

      {/* Title */}
      <h1 style={{
        color: '#fff', fontSize: '2rem', fontWeight: 300,
        marginBottom: '40px', textShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}>
        Color Chemist
      </h1>

      {/* Game area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '60px',
      }}>
        {/* Target color */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', margin: 0 }}>
            Create this color:
          </p>
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '20px',
            background: targetHex,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 2px 10px rgba(255,255,255,0.2)',
            border: '4px solid rgba(255,255,255,0.3)',
          }} />
          <p style={{
            color: '#FFD700', fontSize: '1.3rem', fontWeight: 600, margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {currentTarget.name}
          </p>
          {showHint && gamePhase === 'mixing' && (
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.95rem',
              margin: 0,
              fontStyle: 'italic',
            }}>
              Hint: {currentTarget.hint}
            </p>
          )}
        </div>

        {/* Mixing beaker */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', margin: 0 }}>
            Your mix:
          </p>
          <div style={{
            width: '160px',
            height: '180px',
            borderRadius: '10px 10px 40px 40px',
            background: mixedHex,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 -20px 40px rgba(0,0,0,0.1)',
            border: '4px solid rgba(255,255,255,0.4)',
            position: 'relative',
            transition: 'background 0.3s ease',
          }}>
            {/* Beaker top rim */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              right: '-8px',
              height: '16px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '8px 8px 0 0',
              border: '2px solid rgba(255,255,255,0.4)',
            }} />

            {/* Success indicator */}
            {gamePhase === 'success' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                animation: 'pulse 0.5s ease-in-out infinite',
              }}>
                ✨
              </div>
            )}
          </div>

          {/* Reset button */}
          <button
            onClick={resetBeaker}
            style={{
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Clear Beaker
          </button>
        </div>
      </div>

      {/* Color palette */}
      <div style={{
        marginTop: '50px',
        display: 'flex',
        gap: '24px',
      }}>
        {PRIMARY_COLORS.map((color, index) => (
          <button
            key={color.name}
            onClick={() => toggleColor(index)}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: color.hex,
              border: selectedColors.includes(index)
                ? '6px solid #FFD700'
                : '4px solid rgba(255,255,255,0.4)',
              boxShadow: selectedColors.includes(index)
                ? '0 0 30px rgba(255,215,0,0.6), 0 8px 24px rgba(0,0,0,0.3)'
                : '0 8px 24px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: selectedColors.includes(index) ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <span style={{
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}>
              {color.name}
            </span>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <p style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '1rem',
        margin: 0,
        textAlign: 'center',
      }}>
        Tap the colors to mix them in the beaker
      </p>

      {/* Success message */}
      {gamePhase === 'success' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '30px 50px',
          borderRadius: '20px',
          zIndex: 200,
        }}>
          <p style={{
            color: '#FFD700',
            fontSize: '2rem',
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
          }}>
            Perfect Match! ✨
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
