'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationEntry {
  timestamp: string;
  speaker: 'patient' | 'companion' | 'system';
  text: string;
}

export default function MonitoringDashboard() {
  const router = useRouter();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientName, setPatientName] = useState('Your loved one');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [currentTier, setCurrentTier] = useState(1);
  
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
    setConversation([]);
    setKillSwitchTriggered(false);
    setCurrentTier(1);
    router.push('/patient');
  };

  const handleEndInteraction = () => {
    localStorage.setItem('everloved-session-active', 'false');
    setSessionActive(false);
    setSessionDuration(0);
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
