'use client';

import React, { useState, useEffect } from 'react';

export default function MonitoringDashboard() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [agitationLevel, setAgitationLevel] = useState(25);
  const [currentMood, setCurrentMood] = useState<'calm' | 'engaged' | 'confused' | 'anxious' | 'agitated'>('calm');
  const [newMemory, setNewMemory] = useState('');

  const [transcript, setTranscript] = useState([
    { id: 1, speaker: 'patient', text: "Where's Michael? I haven't seen him today.", time: '2:31 PM', sentiment: 'confused' },
    { id: 2, speaker: 'ai', text: "Michael is your son, and he loves you very much. He called this morning to check on you. Would you like to hear about what he said?", time: '2:31 PM', sentiment: 'supportive' },
    { id: 3, speaker: 'patient', text: "Oh yes, my boy. He's such a good boy.", time: '2:32 PM', sentiment: 'happy' },
    { id: 4, speaker: 'ai', text: "He really is. He mentioned he's looking forward to visiting this weekend. He wants to bring your favorite cookies from that bakery you love.", time: '2:32 PM', sentiment: 'warm' },
    { id: 5, speaker: 'patient', text: "The one on Main Street? With the roses outside?", time: '2:33 PM', sentiment: 'engaged' },
    { id: 6, speaker: 'ai', text: "That's the one! You always loved those roses. Michael remembers how you used to grow roses in your garden on Maple Avenue.", time: '2:33 PM', sentiment: 'warm' },
  ]);

  const [schedule] = useState([
    { id: 1, time: '3:00 PM', label: 'Medication reminder', type: 'medication', done: false },
    { id: 2, time: '4:30 PM', label: 'Video call with Michael', type: 'call', done: false },
    { id: 3, time: '6:00 PM', label: 'Evening music session', type: 'activity', done: false },
  ]);

  const [recentMemories, setRecentMemories] = useState([
    'Loves roses, especially red ones',
    'Wedding anniversary: June 15, 1960',
  ]);

  const colors = {
    bg1: '#FDF8F3',
    bg2: '#F5EDE4',
    warmGlow: 'rgba(255, 210, 160, 0.25)',
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
    accent: '#D4A84A',
    accentLight: 'rgba(212, 168, 74, 0.12)',
    text: '#4A3D32',
    textMuted: '#8B7355',
    textLight: '#A89880',
    inputBg: '#FEFCFA',
    inputBorder: 'rgba(212, 168, 74, 0.3)',
    success: '#7A9B6D',
    successLight: 'rgba(122, 155, 109, 0.15)',
    warning: '#D4A84A',
    danger: '#C47A7A',
    dangerLight: 'rgba(196, 122, 122, 0.15)',
    patientBubble: '#F5EDE4',
    aiBubble: 'rgba(212, 168, 74, 0.18)',
  };

  const moodConfig = {
    calm: { emoji: '😊', label: 'Calm & Content', color: colors.success },
    engaged: { emoji: '🌟', label: 'Engaged & Alert', color: colors.accent },
    confused: { emoji: '😕', label: 'Mildly Confused', color: colors.warning },
    anxious: { emoji: '😟', label: 'Anxious', color: colors.warning },
    agitated: { emoji: '😰', label: 'Agitated', color: colors.danger },
  };

  const currentMoodConfig = moodConfig[currentMood];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (sessionActive) {
      const timer = setInterval(() => {
        setSessionDuration((d) => d + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [sessionActive]);

  const handleStartSession = () => {
    setSessionActive(true);
    setSessionDuration(0);
  };

  const handleEndSession = () => {
    setSessionActive(false);
  };

  const handleAddMemory = () => {
    if (newMemory.trim()) {
      setRecentMemories([newMemory.trim(), ...recentMemories.slice(0, 4)]);
      setNewMemory('');
    }
  };

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      style={{
        background: colors.cardBg,
        borderRadius: '16px',
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: '0 4px 20px rgba(139, 115, 85, 0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );

  const CardHeader = ({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.cardBorder}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at 20% 10%, ${colors.warmGlow} 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Content */}
      <main style={{ position: 'relative', padding: '24px 40px 40px', zIndex: 1 }}>
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Session Control - START/END BUTTONS */}
          <Card style={{ marginBottom: '24px' }}>
            <div
              style={{
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: sessionActive ? colors.successLight : colors.accentLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                  }}
                >
                  {sessionActive ? '🎙️' : '🎤'}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 700, color: colors.text }}>
                    Session Control
                  </h2>
                  <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.95rem' }}>
                    {sessionActive 
                      ? `Session running • ${formatDuration(sessionDuration)}` 
                      : 'Start an interaction session with the companion'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {!sessionActive ? (
                  <button
                    onClick={handleStartSession}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '16px 32px',
                      borderRadius: '14px',
                      border: 'none',
                      background: colors.success,
                      color: '#fff',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 4px 15px ${colors.success}40`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>🎙️</span>
                    Start Interaction
                  </button>
                ) : (
                  <button
                    onClick={handleEndSession}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '16px 32px',
                      borderRadius: '14px',
                      border: 'none',
                      background: colors.danger,
                      color: '#fff',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 4px 15px ${colors.danger}40`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>⏹️</span>
                    End Interaction
                  </button>
                )}
              </div>
            </div>
          </Card>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: '24px',
            }}
          >
            {/* Left Column - Transcript */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Patient Status Bar */}
              <Card>
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: `${currentMoodConfig.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                      }}
                    >
                      {currentMoodConfig.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: colors.text }}>
                        {currentMoodConfig.label}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: colors.textMuted, marginTop: '2px' }}>
                        Patient emotional state
                      </div>
                    </div>
                  </div>

                  {/* Agitation Gauge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: '6px' }}>
                        Agitation Level
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '120px',
                            height: '8px',
                            background: colors.accentLight,
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${agitationLevel}%`,
                              height: '100%',
                              background: agitationLevel > 70 ? colors.danger : agitationLevel > 40 ? colors.warning : colors.success,
                              borderRadius: '4px',
                              transition: 'width 0.5s ease, background 0.5s ease',
                            }}
                          />
                        </div>
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: agitationLevel > 70 ? colors.danger : agitationLevel > 40 ? colors.warning : colors.success,
                        }}>
                          {agitationLevel}%
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: '20px', paddingLeft: '24px', borderLeft: `1px solid ${colors.cardBorder}` }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: colors.text }}>
                          {Math.floor(sessionDuration / 60)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>minutes</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: colors.text }}>
                          {transcript.length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>messages</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Live Transcript */}
              <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '500px', opacity: sessionActive ? 1 : 0.6 }}>
                <CardHeader
                  icon="💬"
                  title="Live Transcript"
                  action={
                    sessionActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: colors.success,
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>Live</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>Session not active</span>
                    )
                  }
                />
                <div
                  style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {sessionActive ? transcript.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.speaker === 'patient' ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>
                          {msg.speaker === 'patient' ? '👤' : '🐕'}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted }}>
                          {msg.speaker === 'patient' ? 'Mom' : 'Companion'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: colors.textLight }}>
                          {msg.time}
                        </span>
                      </div>
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '14px 18px',
                          borderRadius: msg.speaker === 'patient' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                          background: msg.speaker === 'patient' ? colors.patientBubble : colors.aiBubble,
                          color: colors.text,
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )) : (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: colors.textMuted,
                      fontSize: '1rem',
                    }}>
                      Press "Start Interaction" to begin a session
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Intervention */}
              <Card style={{ opacity: sessionActive ? 1 : 0.6 }}>
                <CardHeader icon="🚨" title="Intervention" />
                <div style={{ padding: '20px' }}>
                  <button
                    disabled={!sessionActive}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: sessionActive ? colors.danger : colors.textLight,
                      color: '#fff',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: sessionActive ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                      boxShadow: sessionActive ? `0 4px 15px ${colors.danger}40` : 'none',
                    }}
                  >
                    ⏸ Emergency Pause
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { icon: '😌', label: 'Calm Prompt' },
                      { icon: '🎵', label: 'Play Music' },
                      { icon: '📹', label: 'Show Video' },
                      { icon: '🌙', label: 'Wind Down' },
                    ].map((action) => (
                      <button
                        key={action.label}
                        disabled={!sessionActive}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: `1px solid ${colors.cardBorder}`,
                          background: colors.inputBg,
                          color: sessionActive ? colors.text : colors.textLight,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: sessionActive ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader
                  icon="📅"
                  title="Schedule"
                  action={
                    <button
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.accent,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  }
                />
                <div style={{ padding: '16px 20px' }}>
                  {schedule.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: `1px solid ${colors.accentLight}`,
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          border: `2px solid ${item.done ? colors.success : colors.accent}`,
                          background: item.done ? colors.success : 'transparent',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: colors.text }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                          {item.time}
                        </div>
                      </div>
                      <span style={{ fontSize: '1rem' }}>
                        {item.type === 'medication' ? '💊' : item.type === 'call' ? '📞' : '🎵'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Memory Input */}
              <Card>
                <CardHeader icon="💭" title="Quick Memory" />
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      placeholder="e.g., Loves the color blue"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMemory()}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `1px solid ${colors.inputBorder}`,
                        background: colors.inputBg,
                        color: colors.text,
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleAddMemory}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: colors.accent,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: '10px' }}>
                    Recent additions:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentMemories.map((memory, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 14px',
                          background: colors.accentLight,
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: colors.text,
                        }}
                      >
                        {memory}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Mood Trend Mini Chart */}
              <Card>
                <CardHeader icon="📈" title="Today's Mood" />
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', gap: '8px' }}>
                    {[40, 35, 45, 30, 25, 35, 25].map((val, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${100 - val}%`,
                          background: val > 50 ? colors.warning : val > 30 ? colors.accent : colors.success,
                          borderRadius: '4px 4px 0 0',
                          opacity: i === 6 ? 1 : 0.6,
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: colors.textLight }}>9AM</span>
                    <span style={{ fontSize: '0.7rem', color: colors.textLight }}>Now</span>
                  </div>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      background: colors.successLight,
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: colors.success,
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    ↓ 15% calmer than yesterday
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
