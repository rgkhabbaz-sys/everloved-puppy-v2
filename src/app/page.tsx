'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function PatientComfort() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const getCircadianColors = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const palettes = {
      night: { bg1: '#2C1810', bg2: '#1A0F0A', text: '#E8DDD4' },
      sunrise: { bg1: '#FFF5E6', bg2: '#FFE4CC', text: '#4A3D32' },
      day: { bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' },
      evening: { bg1: '#3D2914', bg2: '#2C1810', text: '#E8DDD4' },
    };

    if (totalMinutes >= 300 && totalMinutes < 420) return palettes.sunrise;
    if (totalMinutes >= 420 && totalMinutes < 1020) return palettes.day;
    if (totalMinutes >= 1020 && totalMinutes < 1260) return palettes.evening;
    return palettes.night;
  };

  const [colors, setColors] = useState(getCircadianColors());

  useEffect(() => {
    const interval = setInterval(() => {
      setColors(getCircadianColors());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if session was started from dashboard
  useEffect(() => {
    const sessionActive = localStorage.getItem('everloved-session-active') === 'true';
    setAutoMode(sessionActive);
  }, []);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('wss://everloved-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatusMessage('Hello! I\'m here with you.');
      ws.send(JSON.stringify({ type: 'start_session' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data.type);
      
      switch (data.type) {
        case 'session_started':
          console.log('Session started');
          // Auto-start listening if in auto mode
          if (localStorage.getItem('everloved-session-active') === 'true') {
            setTimeout(() => startListening(), 1000);
          }
          break;
        case 'transcription':
          setStatusMessage(`You said: "${data.text}"`);
          break;
        case 'response_text':
          setStatusMessage(data.text);
          break;
        case 'response_audio':
          console.log('Audio received, playing...');
          playAudio(data.audio);
          break;
        case 'error':
          console.error('Server error:', data.message);
          setStatusMessage('Let me try that again...');
          // Auto-restart listening after error
          if (autoMode) {
            setTimeout(() => startListening(), 2000);
          }
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusMessage('Reconnecting...');
      setTimeout(() => window.location.reload(), 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const playAudio = async (base64Audio: string) => {
    try {
      setIsPlaying(true);
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      audio.onended = () => {
        setIsPlaying(false);
        // Auto-restart listening after response plays
        if (localStorage.getItem('everloved-session-active') === 'true') {
          setTimeout(() => startListening(), 1500);
        } else {
          setStatusMessage('Tap anywhere to talk.');
        }
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        if (localStorage.getItem('everloved-session-active') === 'true') {
          setTimeout(() => startListening(), 1500);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      if (localStorage.getItem('everloved-session-active') === 'true') {
        setTimeout(() => startListening(), 1500);
      }
    }
  };

  const startListening = async () => {
    if (!isConnected || isListening || isPlaying) return;

    // Check if session is still active
    if (localStorage.getItem('everloved-session-active') !== 'true' && autoMode) {
      setAutoMode(false);
      setStatusMessage('Session ended. Tap anywhere to talk.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          wsRef.current?.send(JSON.stringify({ type: 'audio_data', audio: base64 }));
          setStatusMessage('Let me think...');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setStatusMessage('I\'m listening...');

      // Auto-stop after 6 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 6000);

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('I\'m having trouble hearing. Please check the microphone.');
      // Retry in auto mode
      if (localStorage.getItem('everloved-session-active') === 'true') {
        setTimeout(() => startListening(), 3000);
      }
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleScreenTap = () => {
    // Only allow manual control if not in auto mode
    if (!autoMode) {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation - only visible for caregivers */}
      <nav style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="Everloved" style={{ height: '32px' }} />
        </Link>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/caregiver" style={{ color: '#4A3D32', textDecoration: 'none', fontSize: '0.95rem' }}>
            Avatar Setup
          </Link>
          <Link href="/caregiver/monitoring" style={{ color: '#4A3D32', textDecoration: 'none', fontSize: '0.95rem' }}>
            Dashboard
          </Link>
          <Link href="/science" style={{ color: '#4A3D32', textDecoration: 'none', fontSize: '0.95rem' }}>
            Science
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div
        onClick={handleScreenTap}
        style={{
          flex: 1,
          background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          cursor: autoMode ? 'default' : 'pointer',
          transition: 'background 2s ease',
          userSelect: 'none',
        }}
      >
        <div style={{ marginBottom: '40px' }}>
          <img
            src="/puppy.png"
            alt="Comfort companion"
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'contain',
              animation: isListening ? 'pulse 1s infinite' : isPlaying ? 'bounce 0.5s infinite' : 'breathe 4s ease-in-out infinite',
            }}
          />
        </div>

        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isConnected ? (isListening ? '#E74C3C' : isPlaying ? '#3498DB' : '#7A9B6D') : '#999',
            marginBottom: '20px',
            animation: isListening ? 'pulse 1s infinite' : 'none',
          }}
        />

        <p
          style={{
            color: colors.text,
            fontSize: '1.8rem',
            textAlign: 'center',
            maxWidth: '600px',
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          {statusMessage}
        </p>

        {isListening && (
          <p style={{ color: colors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
            🎙️ Listening...
          </p>
        )}

        {isPlaying && (
          <p style={{ color: colors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
            🔊 Speaking...
          </p>
        )}

        {!autoMode && !isListening && !isPlaying && isConnected && (
          <p style={{ color: colors.text, opacity: 0.5, marginTop: '30px', fontSize: '1rem' }}>
            Tap anywhere to talk
          </p>
        )}

        <style jsx global>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    </div>
  );
}
