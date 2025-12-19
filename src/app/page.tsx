'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function PatientComfort() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStarted = useRef(false);

  const getCircadianColors = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 300 && totalMinutes < 420) {
      return { bg1: '#FFF5E6', bg2: '#FFE4CC', text: '#4A3D32' };
    }
    if (totalMinutes >= 420 && totalMinutes < 1020) {
      return { bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' };
    }
    if (totalMinutes >= 1020 && totalMinutes < 1260) {
      return { bg1: '#3D2914', bg2: '#2C1810', text: '#E8DDD4' };
    }
    return { bg1: '#2C1810', bg2: '#1A0F0A', text: '#E8DDD4' };
  };

  const [circadianColors, setCircadianColors] = useState({ bg1: '#F0F7FF', bg2: '#E1EFFE', text: '#2C3E50' });

  const uiColors = {
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
    textMuted: '#8B7355',
  };

  useEffect(() => {
    setMounted(true);
    setCircadianColors(getCircadianColors());
    const interval = setInterval(() => setCircadianColors(getCircadianColors()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isSessionActive = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everloved-session-active') === 'true';
  };

  const playAudio = (base64Audio: string) => {
    return new Promise<void>((resolve) => {
      setIsPlaying(true);
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => {
        setIsPlaying(false);
        resolve();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        resolve();
      };
      audio.play().catch(() => {
        setIsPlaying(false);
        resolve();
      });
    });
  };

  const startListening = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isListening || isPlaying) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          wsRef.current?.send(JSON.stringify({ type: 'audio_data', audio: base64 }));
          setStatusMessage('...');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setStatusMessage('I\'m listening...');

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 4000);

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    const ws = new WebSocket('wss://everloved-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Don't show message until session actually starts
      const patientName = localStorage.getItem('everloved-patient-name') || '';
      const caregiverName = localStorage.getItem('everloved-caregiver-name') || '';
      ws.send(JSON.stringify({ type: 'start_session', patientName, caregiverName }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'session_started') {
        // Auto-start if coming from dashboard
        if (isSessionActive() && !hasAutoStarted.current) {
          hasAutoStarted.current = true;
          setTimeout(() => startListening(), 500);
        }
      } else if (data.type === 'transcription') {
        setStatusMessage('You said: "' + data.text + '"');
      } else if (data.type === 'response_chunk') {
        setStatusMessage(prev => {
          if (prev.startsWith('You said:') || prev === '...') return data.text;
          return prev + data.text;
        });
      } else if (data.type === 'response_text') {
        setStatusMessage(data.text);
      } else if (data.type === 'response_audio') {
        await playAudio(data.audio);
        // After audio finishes, restart listening if session active
        if (isSessionActive()) {
          setTimeout(() => startListening(), 800);
        }
      } else if (data.type === 'response_end') {
        // If no audio was sent, restart listening
        if (!isPlaying && isSessionActive()) {
          setTimeout(() => startListening(), 800);
        }
      } else if (data.type === 'error') {
        setStatusMessage('Let me try again...');
        if (isSessionActive()) {
          setTimeout(() => startListening(), 1500);
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusMessage('Reconnecting...');
      setTimeout(() => window.location.reload(), 3000);
    };

    return () => ws.close();
  }, [mounted]);

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleScreenTap = () => {
    if (!isSessionActive()) {
      if (isListening) stopListening();
      else if (!isPlaying) startListening();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Link 
        href="/caregiver/monitoring" 
        style={{ 
          position: 'absolute', top: '16px', right: '16px', zIndex: 10,
          padding: '10px 20px', borderRadius: '20px', 
          background: uiColors.cardBg, color: uiColors.textMuted, 
          fontWeight: 500, fontSize: '0.85rem', textDecoration: 'none', 
          border: '1px solid ' + uiColors.cardBorder, backdropFilter: 'blur(10px)',
        }}
      >
        Monitoring Dashboard
      </Link>

      <div
        onClick={handleScreenTap}
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, ' + circadianColors.bg1 + ' 0%, ' + circadianColors.bg2 + ' 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px', cursor: 'pointer', transition: 'background 2s ease',
        }}
      >
        <div style={{ marginBottom: '40px' }}>
          <img src="/puppy.png" alt="Comfort companion" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
        </div>

        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: isConnected ? (isListening ? '#E74C3C' : isPlaying ? '#3498DB' : '#7A9B6D') : '#999',
          marginBottom: '20px',
        }} />

        {statusMessage && (
          <p style={{
            color: circadianColors.text, fontSize: '1.8rem', textAlign: 'center',
            maxWidth: '600px', lineHeight: 1.6, fontWeight: 300,
          }}>
            {statusMessage}
          </p>
        )}

        {isListening && (
          <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
            🎙️ Listening...
          </p>
        )}

        {isPlaying && (
          <p style={{ color: circadianColors.text, opacity: 0.7, marginTop: '20px', fontSize: '1.2rem' }}>
            🔊 Speaking...
          </p>
        )}

        {!isSessionActive() && !isListening && !isPlaying && isConnected && !statusMessage && (
          <p style={{ color: circadianColors.text, opacity: 0.5, marginTop: '30px', fontSize: '1rem' }}>
            Tap anywhere to talk
          </p>
        )}
      </div>
    </div>
  );
}
