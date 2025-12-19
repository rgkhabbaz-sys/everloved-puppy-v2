'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function PatientComfort() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStarted = useRef(false);

  const colors = {
    bg1: '#F0F7FF',
    bg2: '#E1EFFE', 
    text: '#2C3E50'
  };

  // Mark as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const isSessionActive = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everloved-session-active') === 'true';
  };

  const startListening = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready');
      return;
    }
    if (isListening || isPlaying) {
      console.log('Already listening or playing');
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
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'audio_data', audio: base64 }));
          }
          setStatusMessage('Let me think...');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setStatusMessage('I\'m listening...');
      console.log('Started listening');

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 6000);

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
      if (isSessionActive()) {
        setTimeout(() => startListening(), 3000);
      }
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      setIsPlaying(true);
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      audio.onended = () => {
        setIsPlaying(false);
        if (isSessionActive()) {
          setTimeout(() => startListening(), 1500);
        } else {
          setStatusMessage('Tap anywhere to talk.');
        }
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        if (isSessionActive()) {
          setTimeout(() => startListening(), 1500);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      if (isSessionActive()) {
        setTimeout(() => startListening(), 1500);
      }
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!mounted) return;
    
    console.log('Connecting to WebSocket...');
    const ws = new WebSocket('wss://everloved-backend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setStatusMessage('Hello! I\'m here with you.');
      ws.send(JSON.stringify({ type: 'start_session' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data.type);
      
      if (data.type === 'session_started') {
        if (isSessionActive() && !hasAutoStarted.current) {
          hasAutoStarted.current = true;
          setTimeout(() => startListening(), 1000);
        }
      } else if (data.type === 'transcription') {
        setStatusMessage('You said: "' + data.text + '"');
      } else if (data.type === 'response_text') {
        setStatusMessage(data.text);
      } else if (data.type === 'response_audio') {
        playAudio(data.audio);
      } else if (data.type === 'error') {
        setStatusMessage('Let me try that again...');
        if (isSessionActive()) {
          setTimeout(() => startListening(), 2000);
        }
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
  }, [mounted]);

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleScreenTap = () => {
    if (!isSessionActive()) {
      if (isListening) {
        stopListening();
      } else if (!isPlaying) {
        startListening();
      }
    }
  };

  // Always render content
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

      <div
        onClick={handleScreenTap}
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, ' + colors.bg1 + ' 0%, ' + colors.bg2 + ' 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          cursor: 'pointer',
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
          }}
        />

        <p style={{
          color: colors.text,
          fontSize: '1.8rem',
          textAlign: 'center',
          maxWidth: '600px',
          lineHeight: 1.6,
          fontWeight: 300,
        }}>
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

        {!isSessionActive() && !isListening && !isPlaying && isConnected && (
          <p style={{ color: colors.text, opacity: 0.5, marginTop: '30px', fontSize: '1rem' }}>
            Tap anywhere to talk
          </p>
        )}
      </div>
    </div>
  );
}
