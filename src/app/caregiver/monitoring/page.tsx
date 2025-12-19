'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MonitoringDashboard() {
  const router = useRouter();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientName, setPatientName] = useState('Your loved one');

  useEffect(() => {
    // Load patient name from localStorage
    const saved = localStorage.getItem('everloved-patient-name');
    if (saved) setPatientName(saved);

    // Check if session is active
    const active = localStorage.getItem('everloved-session-active') === 'true';
    setSessionActive(active);

    // Session timer
    let interval: NodeJS.Timeout;
    if (active) {
      const startTime = parseInt(localStorage.getItem('everloved-session-start') || '0');
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [sessionActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInteraction = () => {
    localStorage.setItem('everloved-session-active', 'true');
    localStorage.setItem('everloved-session-start', Date.now().toString());
    setSessionActive(true);
    router.push('/');
  };

  const handleEndInteraction = () => {
    localStorage.setItem('everloved-session-active', 'false');
    localStorage.removeItem('everloved-session-start');
    setSessionActive(false);
    setSessionDuration(0);
  };

  const colors = {
    bg: '#FDF8F3',
    card: '#FFFFFF',
    accent: '#D4A84A',
    success: '#7A9B6D',
    danger: '#C47A7A',
    text: '#4A3D32',
    textMuted: '#8B7355',
  };

  return (
    <div style={{ padding: '32px', background: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: colors.text, fontSize: '1.8rem', marginBottom: '8px' }}>
          Monitoring Dashboard
        </h1>
        <p style={{ color: colors.textMuted, marginBottom: '32px' }}>
          Control and monitor {patientName}&apos;s comfort sessions
        </p>

        {/* Session Control Card */}
        <div style={{
          background: colors.card,
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ color: colors.text, fontSize: '1.2rem', marginBottom: '24px' }}>
            Session Control
          </h2>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!sessionActive ? (
              <button
                onClick={handleStartInteraction}
                style={{
                  background: colors.success,
                  color: '#fff',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                ▶️ Start Interaction
              </button>
            ) : (
              <>
                <button
                  onClick={handleEndInteraction}
                  style={{
                    background: colors.danger,
                    color: '#fff',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  ⏹️ End Interaction
                </button>

                <div style={{
                  background: `${colors.success}20`,
                  padding: '12px 20px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: colors.success,
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ color: colors.success, fontWeight: 600 }}>
                    Session Active
                  </span>
                  <span style={{ color: colors.textMuted }}>
                    {formatDuration(sessionDuration)}
                  </span>
                </div>

                <button
                  onClick={() => router.push('/')}
                  style={{
                    background: colors.accent,
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  👁️ View Patient Screen
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Today&apos;s Sessions</p>
            <p style={{ color: colors.text, fontSize: '2rem', fontWeight: 600 }}>3</p>
          </div>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Avg. Duration</p>
            <p style={{ color: colors.text, fontSize: '2rem', fontWeight: 600 }}>12m</p>
          </div>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <p style={{ color: colors.textMuted, fontSize: '0.9rem', marginBottom: '8px' }}>Mood Trend</p>
            <p style={{ color: colors.success, fontSize: '2rem', fontWeight: 600 }}>😊 Good</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: colors.card,
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ color: colors.text, fontSize: '1.2rem', marginBottom: '20px' }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { time: '2:30 PM', event: 'Session ended', duration: '15 minutes' },
              { time: '11:00 AM', event: 'Session ended', duration: '8 minutes' },
              { time: '9:15 AM', event: 'Session ended', duration: '12 minutes' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: colors.bg,
                borderRadius: '10px',
              }}>
                <span style={{ color: colors.textMuted }}>{item.time}</span>
                <span style={{ color: colors.text }}>{item.event}</span>
                <span style={{ color: colors.textMuted }}>{item.duration}</span>
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}
