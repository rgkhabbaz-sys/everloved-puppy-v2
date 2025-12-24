'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ConversationEntry {
  timestamp: string;
  speaker: 'patient' | 'companion' | 'system';
  text: string;
}

interface GameLogEntry {
  gameName: string;
  gameId: string;
  duration: number;
  timestamp: string;
}

export default function MonitoringDashboard() {
  const router = useRouter();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientName, setPatientName] = useState('Your loved one');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [currentTier, setCurrentTier] = useState(1);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const prevConversationLength = useRef(0);

  useEffect(() => { setTimeout(() => window.scrollTo(0, 0), 100); }, []);

  // Sentiment Glow - maps tier to color and state
  const getSentimentGlow = () => {
    if (killSwitchTriggered) return { color: '#C47A7A', label: 'Crisis Mode', description: 'Kill switch activated', pulse: true, glowSize: 40 };
    if (currentTier === 3) return { color: '#E67E22', label: 'High Stress', description: 'Breath pacer active', pulse: true, glowSize: 35 };
    if (currentTier === 2) return { color: '#F4D03F', label: 'Mild Anxiety', description: 'Memory anchor shown', pulse: false, glowSize: 25 };
    return { color: '#7A9B6D', label: 'Calm', description: 'Baseline state', pulse: false, glowSize: 20 };
  };

  // Load initial state and poll for updates
  useEffect(() => {
    const saved = localStorage.getItem('everloved-patient-name');
    if (saved) setPatientName(saved);

    const checkState = () => {
      const active = localStorage.getItem('everloved-session-active') === 'true';
      setSessionActive(active);
      
      const killSwitch = localStorage.getItem('everloved-kill-switch') === 'true';
      setKillSwitchTriggered(killSwitch);

      try {
        const log = localStorage.getItem('everloved-conversation-log');
        if (log) {
          const parsed = JSON.parse(log);
          setConversation(parsed);
          
          // Detect current tier from system messages
          const systemMsgs = parsed.filter((m: ConversationEntry) => m.speaker === 'system');
          if (systemMsgs.length > 0) {
            const lastSystem = systemMsgs[systemMsgs.length - 1].text;
            if (lastSystem.includes('Kill switch') || lastSystem.includes('Tier 3')) {
              setCurrentTier(3);
            } else if (lastSystem.includes('Tier 2') || lastSystem.includes('Memory anchor')) {
              setCurrentTier(2);
            } else if (lastSystem.includes('Tier 1') || lastSystem.includes('Ambient')) {
              setCurrentTier(1);
            }
          }
        }
      } catch (e) {}

      if (active) {
        const startTime = parseInt(localStorage.getItem('everloved-session-start') || '0');
        setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
      }
    };

    checkState();
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (conversation.length > prevConversationLength.current) {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevConversationLength.current = conversation.length;
  }, [conversation]);

  // Check for active game on mount
  useEffect(() => {
    const savedGame = localStorage.getItem('everloved-active-game');
    if (savedGame) {
      setActiveGame(savedGame);
      setSelectedGame(savedGame);
      // Restore start time if game was already running
      const savedStartTime = localStorage.getItem('everloved-game-start-time');
      if (savedStartTime) {
        setGameStartTime(parseInt(savedStartTime));
      }
    }
    // Load game log from localStorage
    const savedLog = localStorage.getItem('everloved-game-log');
    if (savedLog) {
      try {
        setGameLog(JSON.parse(savedLog));
      } catch (e) {
        console.error('Error parsing game log:', e);
      }
    }
  }, []);

  // Game timer effect
  useEffect(() => {
    if (!activeGame || !gameStartTime) {
      setGameTimer(0);
      return;
    }
    const interval = setInterval(() => {
      setGameTimer(Math.floor((Date.now() - gameStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame, gameStartTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleStartInteraction = () => {
    localStorage.setItem('everloved-session-active', 'true');
    localStorage.setItem('everloved-session-start', Date.now().toString());
    localStorage.setItem('everloved-conversation-log', '[]');
    localStorage.removeItem('everloved-kill-switch');
    localStorage.removeItem('everloved-active-game'); // Clear any active game so voice works
    setConversation([]);
    setKillSwitchTriggered(false);
    setCurrentTier(1);
    router.push('/patient?start=true');
  };

  const handleEndInteraction = () => {
    localStorage.setItem('everloved-session-active', 'false');
    setSessionActive(false);
    setSessionDuration(0);
  };

  // Game intervention handlers
  const handleGameSelect = (gameId: string) => {
    if (activeGame) return;
    setSelectedGame(selectedGame === gameId ? null : gameId);
  };

  const getGameName = (gameId: string) => {
    const gameNames: Record<string, string> = {
      'golden-thread': 'The Golden Thread',
      'lifes-ledger': "Life's Ledger",
      'calm-current': 'The Sand-Painter',
      'infinite-weaver': 'The Infinite Weaver',
    };
    return gameNames[gameId] || gameId;
  };

  const handleStartGame = (gameId: string) => {
    if (activeGame || selectedGame !== gameId) return;
    console.log(`Starting game: ${gameId}`);
    const startTime = Date.now();
    setActiveGame(gameId);
    setGameStartTime(startTime);
    setGameTimer(0);
    localStorage.setItem('everloved-active-game', gameId);
    localStorage.setItem('everloved-game-start-time', startTime.toString());
    
    // Navigate to patient page (game renders there)
    router.push('/patient?start=true');
  };

  const handleEndGame = (gameId: string) => {
    if (activeGame !== gameId) return;
    console.log(`Ending game: ${gameId}`);
    
    // Log the game session
    if (gameStartTime) {
      const duration = Math.floor((Date.now() - gameStartTime) / 1000);
      const newEntry: GameLogEntry = {
        gameName: getGameName(gameId),
        gameId: gameId,
        duration: duration,
        timestamp: new Date().toISOString(),
      };
      const updatedLog = [...gameLog, newEntry];
      setGameLog(updatedLog);
      localStorage.setItem('everloved-game-log', JSON.stringify(updatedLog));
    }
    
    setActiveGame(null);
    setSelectedGame(null);
    setGameStartTime(null);
    setGameTimer(0);
    localStorage.removeItem('everloved-active-game');
    localStorage.removeItem('everloved-game-start-time');
  };

  const sentimentGlow = getSentimentGlow();

  const colors = {
    bg: '#FDF8F3',
    card: '#FFFFFF',
    accent: '#D4A84A',
    success: '#7A9B6D',
    danger: '#C47A7A',
    text: '#4A3D32',
    textMuted: '#8B7355',
    patientBubble: '#E8F4EA',
    companionBubble: '#F0E6D3',
    systemBubble: '#FFE5E5',
  };

  // Clinical Intervention Palette - Game definitions
  const interventions = [
    {
      id: 'golden-thread',
      game: 'The Golden Thread',
      stage: 'STAGE 1',
      stageNum: 1,
      subText: 'Ambient Engagement',
      protocol: 'Routine Anchoring',
      note: 'Use for active daily interaction to maintain cognitive threads.',
      color: '#DAA520',
      borderColor: '#B8860B',
      image: '/games/golden-thread.png',
    },
    {
      id: 'lifes-ledger',
      game: "Life's Ledger",
      stage: 'STAGE 2',
      stageNum: 2,
      subText: 'Memory Anchoring',
      protocol: 'Reality Validation',
      note: 'Use to ground the patient when they seem lost or confused.',
      color: '#A0522D',
      borderColor: '#8B4513',
      image: '/games/lifes-ledger.png',
    },
    {
      id: 'calm-current',
      game: 'The Sand-Painter',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Kinetic Grounding',
      protocol: 'Branch A: Restlessness',
      note: 'Use for restless agitation or sundowning. Channels energy into calming visuals.',
      color: '#4682B4',
      borderColor: '#36648B',
      image: '/games/sand-painter.png',
    },
    {
      id: 'infinite-weaver',
      game: 'The Infinite Weaver',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Sensory Engagement',
      protocol: 'Branch B: Withdrawal',
      note: 'Use for apathy and withdrawal. Gentle visual stimulation to encourage engagement.',
      color: '#4682B4',
      borderColor: '#36648B',
      image: '/games/infinite-weaver.png',
    },
  ];

  return (
    <div style={{ padding: '32px', background: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: colors.text, fontSize: '1.8rem', marginBottom: '8px' }}>
          Monitoring Dashboard
        </h1>
        <p style={{ color: colors.textMuted, marginBottom: '24px' }}>
          Control and monitor {patientName}&apos;s comfort sessions
        </p>

        {/* Sentiment Glow Indicator - Privacy-First Visual */}
        <div style={{
          background: colors.card, borderRadius: '20px', padding: '24px',
          marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: '24px',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: sentimentGlow.color,
            boxShadow: `0 0 ${sentimentGlow.glowSize}px ${sentimentGlow.color}`,
            animation: sentimentGlow.pulse ? 'glowPulse 1.5s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }} />
          <div>
            <h2 style={{ margin: 0, color: colors.text, fontSize: '1.4rem' }}>
              {sentimentGlow.label}
            </h2>
            <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: '0.95rem' }}>
              {sentimentGlow.description}
            </p>
          </div>
          {sessionActive && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.85rem' }}>Session Duration</p>
              <p style={{ margin: '4px 0 0', color: colors.text, fontSize: '1.5rem', fontWeight: 600 }}>
                {formatDuration(sessionDuration)}
              </p>
            </div>
          )}
        </div>

        {killSwitchTriggered && (
          <div style={{
            background: colors.danger, color: '#fff', borderRadius: '12px',
            padding: '20px', marginBottom: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <strong>⚠️ Kill Switch Activated</strong>
              <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                The system detected escalating distress and switched to calm mode.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('everloved-kill-switch');
                setKillSwitchTriggered(false);
                setCurrentTier(1);
              }}
              style={{
                background: '#fff', color: colors.danger, border: 'none',
                padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        )}

        {/* Session Control */}
        <div style={{
          background: colors.card, borderRadius: '20px', padding: '32px',
          marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ color: colors.text, fontSize: '1.2rem', marginBottom: '24px' }}>
            Session Control
          </h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!sessionActive ? (
              <button onClick={handleStartInteraction} style={{
                background: colors.success, color: '#fff', border: 'none',
                padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem',
                fontWeight: 600, cursor: 'pointer',
              }}>
                ▶️ Start Interaction
              </button>
            ) : (
              <>
                <button onClick={handleEndInteraction} style={{
                  background: colors.danger, color: '#fff', border: 'none',
                  padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem',
                  fontWeight: 600, cursor: 'pointer',
                }}>
                  ⏹️ End Session
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: colors.success, animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ color: colors.success, fontWeight: 600 }}>Active</span>
                </div>
                <button onClick={() => router.push('/patient?start=true')} style={{
                  background: colors.accent, color: '#fff', border: 'none',
                  padding: '12px 24px', borderRadius: '10px', fontSize: '1rem',
                  fontWeight: 500, cursor: 'pointer',
                }}>
                  👁️ View Patient Screen
                </button>
              </>
            )}
          </div>
        </div>

        {/* Conversation Log - NOW BEFORE GAME SECTION */}
        <div style={{
          background: colors.card, borderRadius: '20px', padding: '32px',
          marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ color: colors.text, fontSize: '1.2rem', marginBottom: '20px' }}>
            Conversation Log
          </h2>
          <div style={{
            maxHeight: '400px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px',
          }}>
            {conversation.length === 0 ? (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
                {sessionActive ? 'Waiting for conversation...' : 'Start a session to see conversation'}
              </p>
            ) : (
              conversation.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: entry.speaker === 'patient' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    background: entry.speaker === 'patient' ? colors.patientBubble 
                      : entry.speaker === 'system' ? colors.systemBubble : colors.companionBubble,
                    padding: '12px 16px', borderRadius: '16px', maxWidth: '80%',
                  }}>
                    <p style={{ margin: 0, color: colors.text, fontSize: '0.95rem' }}>{entry.text}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '4px', padding: '0 8px' }}>
                    {entry.speaker === 'patient' ? patientName : entry.speaker === 'system' ? 'System' : 'Companion'} • {formatTime(entry.timestamp)}
                  </span>
                </div>
              ))
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* ============================================ */}
        {/* CLINICAL INTERVENTION PALETTE - GAME SELECTOR */}
        {/* ============================================ */}
        <div style={{
          background: colors.card, borderRadius: '20px', padding: '32px',
          marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {/* Header with Timer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ color: colors.text, fontSize: '1.2rem', margin: 0 }}>
              Clinical Intervention Palette
            </h2>
            {/* Game Session Timer */}
            {activeGame && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.success}20, ${colors.success}10)`,
                border: `2px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: colors.success,
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{ 
                  color: '#000000', 
                  fontWeight: 800, 
                  fontSize: '1.3rem', 
                  fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
                  letterSpacing: '1px',
                }}>
                  {formatDuration(gameTimer)}
                </span>
              </div>
            )}
          </div>
          <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '20px' }}>
            Select a therapeutic game matched to {patientName}&apos;s current cognitive stage
          </p>

          {/* Start / End Buttons - Above Games */}
          <div style={{ 
            display: 'flex', 
            gap: '16px',
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: `1px solid ${colors.textMuted}20`,
          }}>
            <button
              onClick={() => selectedGame && handleStartGame(selectedGame)}
              disabled={!selectedGame || activeGame !== null}
              style={{
                flex: 1,
                background: selectedGame && !activeGame ? colors.success : '#E0E0E0',
                color: selectedGame && !activeGame ? '#fff' : '#999',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: selectedGame && !activeGame ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              ▶️ Start Game
            </button>
            <button
              onClick={() => activeGame && handleEndGame(activeGame)}
              disabled={!activeGame}
              style={{
                flex: 1,
                background: activeGame ? colors.danger : '#E0E0E0',
                color: activeGame ? '#fff' : '#999',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: activeGame ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                animation: activeGame ? 'pulse 2s infinite' : 'none',
              }}
            >
              ⏹️ End Game
            </button>
          </div>

          {/* Game Cards - 3 Column Layout with Vertical Stacking */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            alignItems: 'start',
          }}>
            {/* Stage 1 Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {interventions.filter(i => i.stageNum === 1).map((intervention) => {
                const isSelected = selectedGame === intervention.id;
                const isActive = activeGame === intervention.id;
                const isDisabled = activeGame !== null && activeGame !== intervention.id;
                return (
                  <button
                    key={intervention.id}
                    onClick={() => handleGameSelect(intervention.id)}
                    disabled={isDisabled}
                    style={{
                      height: '320px',
                      background: isActive 
                        ? `linear-gradient(145deg, ${intervention.color}30, ${intervention.color}20)`
                        : isSelected 
                          ? `linear-gradient(145deg, ${intervention.color}25, ${intervention.color}15)`
                          : `linear-gradient(145deg, ${intervention.color}15, ${intervention.color}08)`,
                      border: isActive 
                        ? `3px solid ${intervention.color}`
                        : isSelected 
                          ? `3px solid ${intervention.borderColor}`
                          : `2px solid ${intervention.borderColor}40`,
                      borderRadius: '16px',
                      padding: '0',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      opacity: isDisabled ? 0.5 : 1,
                      boxShadow: isActive 
                        ? `0 0 20px ${intervention.color}50`
                        : isSelected 
                          ? `0 4px 16px ${intervention.color}30`
                          : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {isActive && (
                      <div style={{
                        background: intervention.color, color: '#fff', padding: '6px 12px',
                        fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', letterSpacing: '1px',
                      }}>
                        🎮 GAME IN PROGRESS
                      </div>
                    )}
                    <div style={{
                      width: '100%', height: '140px', minHeight: '140px', position: 'relative',
                      background: intervention.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Image src={intervention.image} alt={intervention.game} fill style={{ objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        display: 'inline-block', background: intervention.color, color: '#fff',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                        letterSpacing: '0.5px', marginBottom: '8px', alignSelf: 'flex-start',
                      }}>
                        {intervention.stage}
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: '1.05rem', fontWeight: 600 }}>
                        {intervention.game}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: intervention.color, fontSize: '0.85rem', fontWeight: 500 }}>
                        {intervention.subText} • {intervention.protocol}
                      </p>
                      <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {intervention.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stage 2 Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {interventions.filter(i => i.stageNum === 2).map((intervention) => {
                const isSelected = selectedGame === intervention.id;
                const isActive = activeGame === intervention.id;
                const isDisabled = activeGame !== null && activeGame !== intervention.id;
                return (
                  <button
                    key={intervention.id}
                    onClick={() => handleGameSelect(intervention.id)}
                    disabled={isDisabled}
                    style={{
                      height: '320px',
                      background: isActive 
                        ? `linear-gradient(145deg, ${intervention.color}30, ${intervention.color}20)`
                        : isSelected 
                          ? `linear-gradient(145deg, ${intervention.color}25, ${intervention.color}15)`
                          : `linear-gradient(145deg, ${intervention.color}15, ${intervention.color}08)`,
                      border: isActive 
                        ? `3px solid ${intervention.color}`
                        : isSelected 
                          ? `3px solid ${intervention.borderColor}`
                          : `2px solid ${intervention.borderColor}40`,
                      borderRadius: '16px',
                      padding: '0',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      opacity: isDisabled ? 0.5 : 1,
                      boxShadow: isActive 
                        ? `0 0 20px ${intervention.color}50`
                        : isSelected 
                          ? `0 4px 16px ${intervention.color}30`
                          : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {isActive && (
                      <div style={{
                        background: intervention.color, color: '#fff', padding: '6px 12px',
                        fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', letterSpacing: '1px',
                      }}>
                        🎮 GAME IN PROGRESS
                      </div>
                    )}
                    <div style={{
                      width: '100%', height: '140px', minHeight: '140px', position: 'relative',
                      background: intervention.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Image src={intervention.image} alt={intervention.game} fill style={{ objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        display: 'inline-block', background: intervention.color, color: '#fff',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                        letterSpacing: '0.5px', marginBottom: '8px', alignSelf: 'flex-start',
                      }}>
                        {intervention.stage}
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: '1.05rem', fontWeight: 600 }}>
                        {intervention.game}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: intervention.color, fontSize: '0.85rem', fontWeight: 500 }}>
                        {intervention.subText} • {intervention.protocol}
                      </p>
                      <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {intervention.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stage 3 Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {interventions.filter(i => i.stageNum === 3).map((intervention) => {
                const isSelected = selectedGame === intervention.id;
                const isActive = activeGame === intervention.id;
                const isDisabled = activeGame !== null && activeGame !== intervention.id;
                return (
                  <button
                    key={intervention.id}
                    onClick={() => handleGameSelect(intervention.id)}
                    disabled={isDisabled}
                    style={{
                      height: '320px',
                      background: isActive 
                        ? `linear-gradient(145deg, ${intervention.color}30, ${intervention.color}20)`
                        : isSelected 
                          ? `linear-gradient(145deg, ${intervention.color}25, ${intervention.color}15)`
                          : `linear-gradient(145deg, ${intervention.color}15, ${intervention.color}08)`,
                      border: isActive 
                        ? `3px solid ${intervention.color}`
                        : isSelected 
                          ? `3px solid ${intervention.borderColor}`
                          : `2px solid ${intervention.borderColor}40`,
                      borderRadius: '16px',
                      padding: '0',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      opacity: isDisabled ? 0.5 : 1,
                      boxShadow: isActive 
                        ? `0 0 20px ${intervention.color}50`
                        : isSelected 
                          ? `0 4px 16px ${intervention.color}30`
                          : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {isActive && (
                      <div style={{
                        background: intervention.color, color: '#fff', padding: '6px 12px',
                        fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', letterSpacing: '1px',
                      }}>
                        🎮 GAME IN PROGRESS
                      </div>
                    )}
                    <div style={{
                      width: '100%', height: '140px', minHeight: '140px', position: 'relative',
                      background: intervention.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Image src={intervention.image} alt={intervention.game} fill style={{ objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        display: 'inline-block', background: intervention.color, color: '#fff',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                        letterSpacing: '0.5px', marginBottom: '8px', alignSelf: 'flex-start',
                      }}>
                        {intervention.stage}
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: '1.05rem', fontWeight: 600 }}>
                        {intervention.game}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: intervention.color, fontSize: '0.85rem', fontWeight: 500 }}>
                        {intervention.subText} • {intervention.protocol}
                      </p>
                      <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {intervention.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game Play Log */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: `1px solid ${colors.textMuted}20`,
          }}>
            <h3 style={{ color: colors.text, fontSize: '1rem', marginBottom: '12px', fontWeight: 600 }}>
              📊 Game Play Log
            </h3>
            {gameLog.length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>
                No game sessions recorded yet
              </p>
            ) : (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {[...gameLog].reverse().map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: `linear-gradient(135deg, ${colors.accent}10, ${colors.accent}05)`,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.accent}20`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🎮</span>
                      <div>
                        <p style={{ margin: 0, color: colors.text, fontWeight: 500, fontSize: '0.9rem' }}>
                          {entry.gameName}
                        </p>
                        <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.75rem' }}>
                          {new Date(entry.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      background: entry.duration >= 180 ? colors.success : entry.duration >= 60 ? colors.accent : colors.textMuted,
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}>
                      {formatDuration(entry.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {gameLog.length > 0 && (
              <div style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`,
                borderRadius: '10px',
                border: `1px solid ${colors.success}30`,
              }}>
                <span style={{ color: colors.text, fontSize: '0.85rem', fontWeight: 500 }}>
                  Total Sessions: {gameLog.length}
                </span>
                <span style={{ color: colors.success, fontSize: '0.85rem', fontWeight: 600 }}>
                  Longest: {formatDuration(Math.max(...gameLog.map(e => e.duration)))}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* END CLINICAL INTERVENTION PALETTE */}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ background: colors.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Messages</p>
            <p style={{ color: colors.text, fontSize: '2rem', fontWeight: 600 }}>
              {conversation.filter(c => c.speaker !== 'system').length}
            </p>
          </div>
          <div style={{ background: colors.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Current Tier</p>
            <p style={{ color: sentimentGlow.color, fontSize: '2rem', fontWeight: 600 }}>
              {killSwitchTriggered ? 'KILL' : `Tier ${currentTier}`}
            </p>
          </div>
          <div style={{ background: colors.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Status</p>
            <p style={{ color: killSwitchTriggered ? colors.danger : sessionActive ? colors.success : colors.textMuted, fontSize: '1.5rem', fontWeight: 600 }}>
              {killSwitchTriggered ? '⚠️ Calm' : sessionActive ? '✅ Active' : '⏸️ Idle'}
            </p>
          </div>
        </div>

        <style jsx global>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes glowPulse { 
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px currentColor; } 
            50% { transform: scale(1.05); box-shadow: 0 0 50px currentColor; } 
          }
        `}</style>
      </div>
    </div>
  );
}
