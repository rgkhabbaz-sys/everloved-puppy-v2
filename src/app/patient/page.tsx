'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function PatientPage() {
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEarPerk, setShowEarPerk] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    setMounted(true);
    // Check kill switch
    if (localStorage.getItem('everloved-kill-switch') === 'true') {
      setKillSwitchActive(true);
    }
  }, []);
  
  useEffect(() => {
    if (!mounted || killSwitchActive) return;
    
    // Only connect if session is active (caregiver clicked Start Interaction)
    if (localStorage.getItem('everloved-session-active') !== 'true') {
      return;
    }
    
    const ws = new WebSocket('wss://ease-backend-production.up.railway.app');
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      const patientName = localStorage.getItem('everloved-patient-name') || '';
      const caregiverName = localStorage.getItem('everloved-caregiver-name') || '';
      const lifeStory = localStorage.getItem('everloved-life-story') || '';
      
      // Start session - backend will send greeting and start listening
      ws.send(JSON.stringify({ type: 'start_session', patientName, caregiverName, lifeStory }));
      setIsSessionActive(true);
      
      // Start continuous audio streaming
      startContinuousAudio();
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'listening_started':
          setStatusMessage("I'm listening...");
          break;
          
        case 'ear_perk':
          setShowEarPerk(true);
          setTimeout(() => setShowEarPerk(false), 500);
          break;
          
        case 'interim_transcript':
          setStatusMessage(`Hearing: "${data.text}"`);
          break;
          
        case 'transcription':
          setStatusMessage(`You said: "${data.text}"`);
          saveToLog('patient', data.text);
          break;
          
        case 'response_audio_chunk':
          if (data.audio) {
            queueAudio(data.audio);
          }
          if (data.text && data.chunkIndex === 0) {
            saveToLog('companion', data.text);
          }
          break;
          
        case 'response_end':
          // Audio queue will handle playback completion
          break;
          
        case 'intervention':
          // Handle tier 2/3 interventions
          handleIntervention(data.tier);
          break;
          
        case 'kill_switch':
          setKillSwitchActive(true);
          localStorage.setItem('everloved-kill-switch', 'true');
          stopAudio();
          break;
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setIsSessionActive(false);
      stopAudio();
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
      stopAudio();
    };
  }, [mounted, killSwitchActive]);
  
  const startContinuousAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 16000 
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({ type: 'audio_chunk', audio: base64 }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      // Stream continuously in 250ms chunks
      mediaRecorder.start(250);
      
    } catch (error) {
      console.error('Microphone error:', error);
      setStatusMessage('Please allow microphone access.');
    }
  };
  
  const stopAudio = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };
  
  const queueAudio = (base64Audio: string) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlayingQueueRef.current) {
      playNextInQueue();
    }
  };
  
  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      return;
    }
    
    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    
    const base64Audio = audioQueueRef.current.shift()!;
    
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        playNextInQueue();
      };
      
      source.start();
    } catch (error) {
      console.error('Audio playback error:', error);
      playNextInQueue();
    }
  };
  
  const handleIntervention = (tier: number) => {
    // Tier 2/3 interventions - show photos/music
    console.log('Intervention tier:', tier);
  };
  
  const saveToLog = (speaker: string, text: string) => {
    const logs = JSON.parse(localStorage.getItem('everloved-conversation-log') || '[]');
    logs.push({ speaker, text, timestamp: new Date().toISOString() });
    localStorage.setItem('everloved-conversation-log', JSON.stringify(logs));
  };
  
  const resetKillSwitch = () => {
    localStorage.removeItem('everloved-kill-switch');
    setKillSwitchActive(false);
  };
  
  if (!mounted) return null;
  
  // Kill switch view
  if (killSwitchActive) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #2a2a4a 0%, #1a1a2e 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '30px',
          animation: 'breathe 4s ease-in-out infinite',
        }}>
          <img src="/puppy.png" alt="Resting companion" style={{ width: '600px', height: '600px', objectFit: 'contain', opacity: 0.7 }} />
        </div>
        
        <p style={{ fontSize: '1.5rem', opacity: 0.8, maxWidth: '400px' }}>
          Taking a peaceful rest.<br />
          Just relax and breathe.
        </p>
        
        <Link
          href="/caregiver/monitoring"
          onClick={(e) => {
            e.preventDefault();
            resetKillSwitch();
          }}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            textDecoration: 'none',
          }}
        >
          Caregiver Reset
        </Link>
        
        <style jsx>{`
          @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        `}</style>
      </div>
    );
  }
  
  // Main view
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px',
    }}>
      {/* Puppy Avatar */}
      <div style={{
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: isPlaying 
          ? 'radial-gradient(circle, #ffd89b 0%, #f8b500 50%, #667eea 100%)'
          : 'radial-gradient(circle, #a8edea 0%, #fed6e3 50%, #667eea 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: showEarPerk 
          ? '0 0 60px rgba(255,255,255,0.8)' 
          : '0 20px 60px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        animation: 'breathe 4s ease-in-out infinite',
      }}>
        <img 
          src="/puppy.png" 
          alt="Comfort companion" 
          style={{ 
            width: '600px', 
            height: '600px', 
            objectFit: 'contain',
            transform: showEarPerk ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }} 
        />
      </div>
      
      {/* Status */}
      <p style={{
        marginTop: '30px',
        fontSize: '1.25rem',
        opacity: 0.9,
        textAlign: 'center',
        maxWidth: '400px',
        minHeight: '60px',
      }}>
        {statusMessage || (isConnected ? "I'm here with you..." : 'Connecting...')}
      </p>
      
      {/* Caregiver link */}
      <Link
        href="/caregiver/monitoring"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          textDecoration: 'none',
        }}
      >
        Caregiver
      </Link>
      
      <style jsx>{`
        @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
      `}</style>
    </div>
  );
}
