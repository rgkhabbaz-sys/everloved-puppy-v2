/**
 * EVERLOVED Clinical Animated Puppy
 * 
 * Procedural animation for Alzheimer's patient comfort companion.
 * All animations run on GPU compositor thread via CSS transforms.
 * 
 * Clinical Requirements:
 * - Fixed bottom-center position (vestibular stability)
 * - No sudden movements (reduce startle response)
 * - 500ms transitions between states
 * - Breathing at 4-second cycle (calm, natural rhythm)
 * - Ear perk < 50ms on speech detection (acknowledgment signal)
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
  const [earTwitch, setEarTwitch] = useState(false);
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
    const earTwitchInterval = setInterval(() => {
      if (!earPerk && !isListening) {
        setEarTwitch(true);
        setTimeout(() => setEarTwitch(false), 300);
      }
    }, 12000);
    
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      clearInterval(earTwitchInterval);
    };
  }, []);
  
  const mouthOpen = isPlaying ? Math.min(audioAmplitude * 0.15, 0.15) : 0;
  const puppyScale = currentTier >= 3 ? 0.85 : 1;
  const earRotation = earPerk ? 15 : earTwitch ? 5 : 0;
  const headTilt = earPerk ? 5 : 0;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      transform: `scale(${puppyScale})`,
      transition: 'transform 500ms ease-out',
    }}>
      {currentTier >= 3 && (
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 191, 0, 0.3) 0%, transparent 70%)',
          animation: 'guardianPulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      
      <svg viewBox="0 0 400 400" width="500" height="500" style={{ overflow: 'visible' }}>
        <defs>
          <style>{`
            @keyframes breathe {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(1.02); }
            }
            @keyframes guardianPulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.05); }
            }
            .breathing { animation: breathe 4s ease-in-out infinite; transform-origin: 200px 320px; }
          `}</style>
        </defs>
        
        <g className="breathing">
          <ellipse cx="200" cy="320" rx="120" ry="70" fill="#D4A574" />
        </g>
        
        <g style={{
          transform: `rotate(${headTilt}deg)`,
          transformOrigin: '200px 200px',
          transition: earPerk ? 'transform 50ms ease-out' : 'transform 300ms ease-out',
        }}>
          <ellipse cx="200" cy="180" rx="100" ry="90" fill="#E8C39E" />
          
          <g style={{
            transform: `rotate(${-earRotation}deg)`,
            transformOrigin: '120px 100px',
            transition: earPerk ? 'transform 50ms ease-out' : 'transform 300ms ease-out',
          }}>
            <ellipse cx="100" cy="100" rx="35" ry="50" fill="#D4A574" />
            <ellipse cx="100" cy="100" rx="20" ry="35" fill="#F5DEB3" />
          </g>
          
          <g style={{
            transform: `rotate(${earRotation}deg)`,
            transformOrigin: '280px 100px',
            transition: earPerk ? 'transform 50ms ease-out' : 'transform 300ms ease-out',
          }}>
            <ellipse cx="300" cy="100" rx="35" ry="50" fill="#D4A574" />
            <ellipse cx="300" cy="100" rx="20" ry="35" fill="#F5DEB3" />
          </g>
          
          <ellipse cx="155" cy="170" rx="20" ry={isBlinking ? 3 : 25} fill="#4A3728" style={{ transition: 'ry 50ms ease-out' }} />
          {!isBlinking && <ellipse cx="160" cy="165" rx="6" ry="8" fill="white" opacity="0.8" />}
          
          <ellipse cx="245" cy="170" rx="20" ry={isBlinking ? 3 : 25} fill="#4A3728" style={{ transition: 'ry 50ms ease-out' }} />
          {!isBlinking && <ellipse cx="250" cy="165" rx="6" ry="8" fill="white" opacity="0.8" />}
          
          <ellipse cx="200" cy="210" rx="18" ry="14" fill="#4A3728" />
          
          <g style={{
            transform: `scaleY(${1 + mouthOpen})`,
            transformOrigin: '200px 230px',
            transition: 'transform 16ms linear',
          }}>
            <ellipse cx="200" cy="225" rx="45" ry="25" fill="#F5DEB3" />
            <path d="M 175 235 Q 200 250 225 235" stroke="#4A3728" strokeWidth="3" fill="none" />
            {isPlaying && mouthOpen > 0.05 && (
              <ellipse cx="200" cy="245" rx="15" ry={8 + mouthOpen * 40} fill="#E57373" style={{ transition: 'ry 50ms ease-out' }} />
            )}
          </g>
        </g>
        
        <ellipse cx="140" cy="360" rx="30" ry="20" fill="#E8C39E" />
        <ellipse cx="260" cy="360" rx="30" ry="20" fill="#E8C39E" />
      </svg>
    </div>
  );
};

export default AnimatedPuppy;
