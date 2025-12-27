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

  const getSentimentGlow = () => {
    if (killSwitchTriggered) return { color: '#C47A7A', label: 'Crisis Mode', description: 'Kill switch activated', pulse: true, glowSize: 40 };
    if (currentTier === 3) return { color: '#E67E22', label: 'High Stress', description: 'Breath pacer active', pulse: true, glowSize: 35 };
    if (currentTier === 2) return { color: '#F4D03F', label: 'Mild Anxiety', description: 'Memory anchor shown', pulse: false, glowSize: 25 };
    return { color: '#7A9B6D', label: 'Calm', description: 'Baseline state', pulse: false, glowSize: 20 };
  };

  useEffect(() => {
    const saved = localStorage.getItem('everloved-patient-name');
    if (saved) setPatientName(saved);

    const checkState = () => {
      const sessionValue = localStorage.getItem('everloved-session-active');
      const active = sessionValue === 'true';
      setSessionActive(active);
      
      const killSwitch = localStorage.getItem('everloved-kill-switch') === 'true';
      setKillSwitchTriggered(killSwitch);

      try {
        const log = localStorage.getItem('everloved-conversation-log');
        if (log) {
          const parsed = JSON.parse(log);
          setConversation(parsed);
          
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
        const startTimeStr = localStorage.getItem('everloved-session-start');
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr);
          setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
        }
      } else {
        setSessionDuration(0);
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

  useEffect(() => {
    const savedGame = localStorage.getItem('everloved-active-game');
    if (savedGame) {
      setActiveGame(savedGame);
      setSelectedGame(savedGame);
      const savedStartTime = localStorage.getItem('everloved-game-start-time');
      if (savedStartTime) {
        setGameStartTime(parseInt(savedStartTime));
      }
    }
    const savedLog = localStorage.getItem('everloved-game-log');
    if (savedLog) {
      try {
        setGameLog(JSON.parse(savedLog));
      } catch (e) {
        console.error('Error parsing game log:', e);
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeGame && gameStartTime) {
      interval = setInterval(() => {
        setGameTimer(Math.floor((Date.now() - gameStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeGame, gameStartTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInteraction = () => {
    localStorage.setItem('everloved-session-active', 'true');
    localStorage.setItem('everloved-session-start', Date.now().toString());
    localStorage.setItem('everloved-conversation-log', '[]');
    localStorage.removeItem('everloved-kill-switch');
    localStorage.removeItem('everloved-active-game');
    setConversation([]);
    setKillSwitchTriggered(false);
    setCurrentTier(1);
    router.push('/patient?start=true');
  };

  const handleGameSelect = (gameId: string) => {
    const startTime = Date.now();
    setActiveGame(gameId);
    setSelectedGame(gameId);
    setGameStartTime(startTime);
    setGameTimer(0);
    localStorage.setItem('everloved-active-game', gameId);
    localStorage.setItem('everloved-game-start-time', startTime.toString());
    router.push('/patient');
  };

  const getGameName = (gameId: string) => {
    const gameNames: Record<string, string> = {
      'golden-thread': 'The Golden Thread',
      'calm-current': 'The Sand-Painter',
      'frosty-window': 'The Frosty Window',
      'nebula-stir': 'The Nebula Stir',
      'hidden-statue': 'The Hidden Statue',
      'magic-meadow': 'Magic Meadow',
    };
    return gameNames[gameId] || gameId;
  };

  const handleEndGame = () => {
    if (activeGame && gameStartTime) {
      const duration = Math.floor((Date.now() - gameStartTime) / 1000);
      const newEntry: GameLogEntry = {
        gameName: getGameName(activeGame),
        gameId: activeGame,
        duration,
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
    challengeBlue: '#4A90A4',
    challengeBlueBorder: '#357A8C',
  };

  // Stage 1 Game
  const stage1Games = [
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
  ];

  // Stage 2 Cognitive Challenge Games (MOCKUP - not clickable)
  const stage2Games = [
    {
      id: 'color-chemist',
      game: 'Color Chemist',
      stage: 'STAGE 2',
      subText: 'Working Memory & Blending',
      protocol: 'Cognitive Challenge',
      note: 'Mix primary colors to match a target color. Exercises working memory and color theory.',
      color: colors.challengeBlue,
      borderColor: colors.challengeBlueBorder,
      image: '/games/color-chemist.png',
    },
    {
      id: 'compass-rose',
      game: 'The Compass Rose',
      stage: 'STAGE 2',
      subText: 'Egocentric Navigation',
      protocol: 'Cognitive Challenge',
      note: 'Navigate using cardinal directions. Reinforces spatial awareness.',
      color: colors.challengeBlue,
      borderColor: colors.challengeBlueBorder,
      image: '/games/compass-rose.png',
    },
    {
      id: 'gravity-maze',
      game: 'The Gravity Maze',
      stage: 'STAGE 2',
      subText: 'Vestibular Integration',
      protocol: 'Cognitive Challenge',
      note: 'Tilt the maze to guide the ball. Develops spatial reasoning.',
      color: colors.challengeBlue,
      borderColor: colors.challengeBlueBorder,
      image: '/games/gravity-maze.png',
    },
    {
      id: 'wayback-window',
      game: 'The Wayback Window',
      stage: 'STAGE 2',
      subText: 'Visual Eraser & Recognition',
      protocol: 'Cognitive Challenge',
      note: 'Wipe away the present to reveal nostalgic scenes from the past.',
      color: colors.challengeBlue,
      borderColor: colors.challengeBlueBorder,
      image: '/games/wayback-window.png',
    },
    {
      id: 'time-travelers-trunk',
      game: "The Time-Traveler's Trunk",
      stage: 'STAGE 2',
      subText: 'Chronological Logic',
      protocol: 'Cognitive Challenge',
      note: 'Sort items from different eras on a timeline. Exercises temporal sequencing.',
      color: colors.challengeBlue,
      borderColor: colors.challengeBlueBorder,
      image: '/games/time-travelers-trunk.png',
    },
  ];

  // Stage 3 Sensory Games (clickable)
  const stage3Games = [
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
      id: 'frosty-window',
      game: 'The Frosty Window',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Sensory Engagement',
      protocol: 'Branch B: Withdrawal',
      note: 'Wipe away frost to reveal a calming view. Instant visual reward.',
      color: '#4682B4',
      borderColor: '#36648B',
      image: '/games/switzerland_bg.jpg',
    },
    {
      id: 'nebula-stir',
      game: 'The Nebula Stir',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Cosmic Fluidity',
      protocol: 'Branch C: Sensory Immersion',
      note: 'Stir the cosmic dust. Vigorous movement ignites supernovas.',
      color: '#4B0082',
      borderColor: '#2E0854',
      image: '/games/nebula_bg.jpg',
    },
    {
      id: 'hidden-statue',
      game: 'The Hidden Statue',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Gentle Discovery',
      protocol: 'Branch C: Sensory Immersion',
      note: 'Hover to gently polish the marble slab, slowly revealing the statue underneath.',
      color: '#B0A99F',
      borderColor: '#8A847C',
      image: '/games/hidden_statue_thumb.jpg',
    },
    {
      id: 'magic-meadow',
      game: 'Magic Meadow',
      stage: 'STAGE 3',
      stageNum: 3,
      subText: 'Creative Reveal',
      protocol: 'Branch C: Sensory Immersion',
      note: 'Hover or touch to color in the sketch, revealing a beautiful meadow painting.',
      color: '#7A9B6D',
      borderColor: '#5A7B4D',
      image: '/games/magic_meadow_thumb.jpg',
    },
  ];

  // Render clickable game card (Stage 1 & 3)
  const renderGameCard = (game: typeof stage3Games[0]) => {
    const cardStyle: React.CSSProperties = {
      height: '320px',
      background: `linear-gradient(145deg, ${game.color}15, ${game.color}08)`,
      border: `2px solid ${game.borderColor}40`,
      borderRadius: '16px',
      padding: '0',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      textDecoration: 'none',
      color: 'inherit',
    };

    return (
      <button key={game.id} onClick={() => handleGameSelect(game.id)} style={cardStyle}>
        <div style={{
          width: '100%', height: '140px', minHeight: '140px', position: 'relative',
          background: game.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Image src={game.image} alt={game.game} fill style={{ objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'inline-block', background: game.color, color: '#fff',
            padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.5px', marginBottom: '8px', alignSelf: 'flex-start',
          }}>
            {game.stage}
          </div>
          <h3 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: '1.05rem', fontWeight: 600 }}>
            {game.game}
          </h3>
          <p style={{ margin: '0 0 8px 0', color: game.color, fontSize: '0.85rem', fontWeight: 500 }}>
            {game.subText} • {game.protocol}
          </p>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4 }}>
            {game.note}
          </p>
        </div>
      </button>
    );
  };

  // Render Stage 2 mockup card (NOT clickable)
  const renderStage2MockupCard = (game: typeof stage2Games[0]) => {
    const cardStyle: React.CSSProperties = {
      height: '320px',
      background: `linear-gradient(145deg, ${game.color}15, ${game.color}08)`,
      border: `2px solid ${game.borderColor}60`,
      borderRadius: '16px',
      padding: '0',
      cursor: 'default',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      color: 'inherit',
      opacity: 0.85,
      position: 'relative',
    };

    return (
      <div key={game.id} style={cardStyle}>
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          padding: '4px 8px', borderRadius: '4px',
          fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.5px', zIndex: 10,
        }}>
          COMING SOON
        </div>
        <div style={{
          width: '100%', height: '140px', minHeight: '140px', position: 'relative',
          background: game.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Image src={game.image} alt={game.game} fill style={{ objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'inline-block', background: game.color, color: '#fff',
            padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.5px', marginBottom: '8px', alignSelf: 'flex-start',
          }}>
            {game.stage}
          </div>
          <h3 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: '1.05rem', fontWeight: 600 }}>
            {game.game}
          </h3>
          <p style={{ margin: '0 0 8px 0', color: game.color, fontSize: '0.85rem', fontWeight: 500 }}>
            {game.subText} • {game.protocol}
          </p>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.8rem', lineHeight: 1.4 }}>
            {game.note}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '32px', background: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: colors.text, fontSize: '1.8rem', marginBottom: '8px' }}>
          Monitoring Dashboard
        </h1>
        <p style={{ color: colors.textMuted, marginBottom: '24px' }}>
          Control and monitor {patientName}&apos;s comfort sessions
        </p>

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
                <button onClick={() => {
                  localStorage.setItem('everloved-session-active', 'false');
                  setSessionActive(false);
                  setSessionDuration(0);
                }} style={{
                  background: colors.danger, color: '#fff', border: 'none',
                  padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem',
                  fontWeight: 600, cursor: 'pointer',
                }}>
                  ⏹️ End Interaction
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: colors.success, animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ color: colors.success, fontWeight: 600 }}>Session Active</span>
                </div>
                <button onClick={() => router.push('/patient')} style={{
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
                    maxWidth: '85%', padding: '12px 16px', borderRadius: '16px',
                    background: entry.speaker === 'patient' ? colors.patientBubble :
                               entry.speaker === 'system' ? colors.systemBubble : colors.companionBubble,
                  }}>
                    <p style={{ margin: 0, color: colors.text, fontSize: '0.95rem' }}>
                      {entry.text}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '4px' }}>
                    {entry.speaker === 'patient' ? patientName :
                     entry.speaker === 'system' ? '⚙️ System' : '🐕 Companion'}
                  </span>
                </div>
              ))
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Therapeutic Interventions Grid */}
        <div style={{
          background: colors.card, borderRadius: '20px', padding: '32px',
          marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ color: colors.text, fontSize: '1.2rem', margin: 0 }}>
              🎮 Therapeutic Interventions
            </h2>
            {activeGame && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: colors.success + '20',
                padding: '8px 16px', borderRadius: '12px',
              }}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: colors.success, animation: 'pulse 1.5s infinite',
                }} />
                <span style={{ color: colors.success, fontWeight: 600, fontSize: '0.9rem' }}>
                  {getGameName(activeGame)} • {formatDuration(gameTimer)}
                </span>
              </div>
            )}
          </div>
          <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '20px' }}>
            Select a therapeutic game matched to {patientName}&apos;s current cognitive stage
          </p>

          {/* 3-Column Grid: Stage 1 | Stage 2 | Stage 3 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            alignItems: 'start',
          }}>
            {/* Column 1: Stage 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#DAA52020', padding: '8px 12px', borderRadius: '8px',
                borderLeft: '3px solid #DAA520', marginBottom: '8px',
              }}>
                <h3 style={{ margin: 0, color: '#DAA520', fontSize: '0.85rem', fontWeight: 600 }}>
                  STAGE 1: Ambient
                </h3>
              </div>
              {stage1Games.map(renderGameCard)}
            </div>

            {/* Column 2: Stage 2 Cognitive Challenge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: colors.challengeBlue + '20', padding: '8px 12px', borderRadius: '8px',
                borderLeft: '3px solid ' + colors.challengeBlue, marginBottom: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ margin: 0, color: colors.challengeBlue, fontSize: '0.85rem', fontWeight: 600 }}>
                  STAGE 2: Cognitive
                </h3>
                <span style={{
                  background: colors.challengeBlue, color: '#fff',
                  padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600,
                }}>
                  PREVIEW
                </span>
              </div>
              {stage2Games.map(renderStage2MockupCard)}
            </div>

            {/* Column 3: Stage 3 Sensory */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#4682B420', padding: '8px 12px', borderRadius: '8px',
                borderLeft: '3px solid #4682B4', marginBottom: '8px',
              }}>
                <h3 style={{ margin: 0, color: '#4682B4', fontSize: '0.85rem', fontWeight: 600 }}>
                  STAGE 3: Sensory
                </h3>
              </div>
              {stage3Games.map(renderGameCard)}
            </div>
          </div>

          {/* Game Play Log */}
          <div style={{
            marginTop: '24px', paddingTop: '20px',
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
                maxHeight: '200px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                {[...gameLog].reverse().map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: `linear-gradient(135deg, ${colors.accent}10, ${colors.accent}05)`,
                    padding: '10px 14px', borderRadius: '10px',
                    border: `1px solid ${colors.accent}20`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🎮</span>
                      <div>
                        <p style={{ margin: 0, color: colors.text, fontWeight: 500, fontSize: '0.9rem' }}>
                          {entry.gameName}
                        </p>
                        <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.75rem' }}>
                          {new Date(entry.timestamp).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      background: entry.duration >= 180 ? colors.success : entry.duration >= 60 ? colors.accent : colors.textMuted,
                      color: '#fff', padding: '4px 10px', borderRadius: '8px',
                      fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace',
                    }}>
                      {formatDuration(entry.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {gameLog.length > 0 && (
              <div style={{
                marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                background: `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`,
                borderRadius: '10px', border: `1px solid ${colors.success}30`,
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
