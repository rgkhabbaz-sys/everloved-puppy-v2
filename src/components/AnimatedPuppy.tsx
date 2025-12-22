/**
 * EVERLOVED Clinical Animated Puppy - Overlay Approach
 * 
 * Uses original puppy.png as base with animated overlays.
 * All animations run on GPU compositor thread via CSS transforms.
 */

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedPuppyProps {
  isListening: boolean;
  isPlaying: boolean;
  earPerk: boolean;
  currentTier: number;
  audioAmplitude: number;
}

export const AnimatedPuppy: React.FC<AnimatedPuppyProps> = ({
  isListening,
  isPlaying,
  earPerk,
  currentTier,
  audioAmplitude
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const scheduleNextBlink = () => {
    const nextBlinkDelay = 5000 + Math.random() * 4000;
    blinkTimeoutRef.current = setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      scheduleNextBlink();
    }, nextBlinkDelay);
  };
  
  useEffect(() => {
    scheduleNextBlink();
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, []);
  
  const puppyScale = currentTier >= 3 ? 0.85 : 1;
  const mouthOpen = isPlaying ? Math.min(audioAmplitude * 0.15, 0.15) : 0;

  return (
    <div style={{
      position: 'relative',
      width: '600px',
      height: '400px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Guardian mode amber glow */}
      {currentTier >= 3 && (
        <div style={{
          position: 'absolute',
          width: '700px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 191, 0, 0.3) 0%, transparent 70%)',
          animation: 'guardianPulse 4s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      
      {/* Main puppy container with breathing */}
      <div style={{
        position: 'relative',
        transform: `scale(${puppyScale})`,
        transition: 'transform 500ms ease-out',
        animation: 'breathe 4s ease-in-out infinite',
      }}>
        {/* Original puppy image */}
        <img 
          src="/puppy.png" 
          alt="Comfort companion" 
          style={{ 
            width: '600px', 
            height: 'auto',
            objectFit: 'contain',
            filter: isBlinking ? 'brightness(0.95)' : 'brightness(1)',
            transition: 'filter 50ms ease-out',
          }} 
        />
        
        {/* Ear perk indicator - subtle glow on ears area */}
        {earPerk && (
          <div style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '30%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'earPerkGlow 0.5s ease-out',
          }} />
        )}
        
        {/* Speaking indicator - subtle pulse around mouth area */}
        {isPlaying && (
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: `translateX(-50%) scaleY(${1 + mouthOpen * 2})`,
            width: '30%',
            height: '15%',
            background: 'radial-gradient(ellipse, rgba(255,200,200,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
            transition: 'transform 16ms linear',
          }} />
        )}
        
        {/* Listening indicator - subtle ear glow */}
        {isListening && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '40%',
            background: 'radial-gradient(ellipse at top, rgba(231, 76, 60, 0.1) 0%, transparent 60%)',
            pointerEvents: 'none',
            animation: 'listeningPulse 2s ease-in-out infinite',
          }} />
        )}
      </div>
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.01) translateY(-2px); }
        }
        
        @keyframes guardianPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes earPerkGlow {
          0% { opacity: 0; transform: translateX(-50%) scale(0.8); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes listeningPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedPuppy;
