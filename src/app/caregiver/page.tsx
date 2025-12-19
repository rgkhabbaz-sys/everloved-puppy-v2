'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function AvatarConfiguration() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [lifeStory, setLifeStory] = useState('');
  const [uploadedVideos, setUploadedVideos] = useState<{ name: string; data: string }[]>([]);
  const [uploadedMemoryPhotos, setUploadedMemoryPhotos] = useState<string[]>([]);
  const [uploadedMusic, setUploadedMusic] = useState<{ name: string; data: string }[]>([]);
  const [voiceStyle, setVoiceStyle] = useState('gentle');
  const [toneAnchors, setToneAnchors] = useState({ calm: true, jovial: true, authoritative: false });
  const [boundaries, setBoundaries] = useState({ travelPromises: true, beingAlive: true, redirectConfusion: true });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingMusic, setIsDraggingMusic] = useState(false);
  const [playingMusic, setPlayingMusic] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const memoryPhotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const compressImage = (base64: string, maxWidth: number = 400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = base64;
    });
  };

  useEffect(() => {
    try {
      const savedPhoto = localStorage.getItem('everloved-patient-photo');
      if (savedPhoto) setPatientPhoto(savedPhoto);
      const savedName = localStorage.getItem('everloved-patient-name');
      if (savedName) setPatientName(savedName);
      const savedCaregiverName = localStorage.getItem('everloved-caregiver-name');
      if (savedCaregiverName) setCaregiverName(savedCaregiverName);
      const savedRelationship = localStorage.getItem('everloved-relationship');
      if (savedRelationship) setRelationship(savedRelationship);
      const savedMemoryPhotos = localStorage.getItem('everloved-memory-photos');
      if (savedMemoryPhotos) setUploadedMemoryPhotos(JSON.parse(savedMemoryPhotos));
      const savedVideos = localStorage.getItem('everloved-videos');
      if (savedVideos) setUploadedVideos(JSON.parse(savedVideos));
      const savedMusic = localStorage.getItem('everloved-music');
      if (savedMusic) setUploadedMusic(JSON.parse(savedMusic));
      const savedLifeStory = localStorage.getItem('everloved-life-story');
      if (savedLifeStory) setLifeStory(savedLifeStory);
    } catch (e) { console.log('Error loading from localStorage:', e); }
  }, []);

  useEffect(() => { if (patientName) localStorage.setItem('everloved-patient-name', patientName); }, [patientName]);
  useEffect(() => { if (caregiverName) localStorage.setItem('everloved-caregiver-name', caregiverName); }, [caregiverName]);
  useEffect(() => { if (relationship) localStorage.setItem('everloved-relationship', relationship); }, [relationship]);
  useEffect(() => { if (lifeStory) localStorage.setItem('everloved-life-story', lifeStory); }, [lifeStory]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processPatientPhoto(file);
  };

  const processPatientPhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String, 300);
      setPatientPhoto(compressed);
      try { localStorage.setItem('everloved-patient-photo', compressed); } 
      catch (e) { alert('Photo too large to save. It will display but won\'t persist.'); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPatientPhoto(null);
    localStorage.removeItem('everloved-patient-photo');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMemoryPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) await processMemoryPhotos(Array.from(files));
  };

  const processMemoryPhotos = async (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const compressed = await compressImage(base64String, 300);
        setUploadedMemoryPhotos(prev => {
          const updated = [...prev, compressed];
          try { localStorage.setItem('everloved-memory-photos', JSON.stringify(updated)); } 
          catch (e) { alert('Storage full. Photo will display but may not persist.'); }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    if (memoryPhotoInputRef.current) memoryPhotoInputRef.current.value = '';
  };

  const handleRemoveMemoryPhoto = (index: number) => {
    setUploadedMemoryPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try { localStorage.setItem('everloved-memory-photos', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) processVideos(Array.from(files));
  };

  const processVideos = (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('video/')) continue;
      if (file.size > 2 * 1024 * 1024) {
        alert(`"${file.name}" is too large (max 2MB). Skipping.`);
        continue;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newVideo = { name: file.name, data: base64String };
        setUploadedVideos(prev => {
          const updated = [...prev, newVideo];
          try { localStorage.setItem('everloved-videos', JSON.stringify(updated)); } 
          catch (e) { alert('Storage full. Video will play but may not persist.'); }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRemoveVideo = (index: number) => {
    setUploadedVideos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try { localStorage.setItem('everloved-videos', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  const handleMusicUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) processMusic(Array.from(files));
  };

  const processMusic = (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      if (file.size > 3 * 1024 * 1024) {
        alert(`"${file.name}" is too large (max 3MB). Skipping.`);
        continue;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newMusic = { name: file.name, data: base64String };
        setUploadedMusic(prev => {
          const updated = [...prev, newMusic];
          try { localStorage.setItem('everloved-music', JSON.stringify(updated)); } 
          catch (e) { alert('Storage full. Music will play but may not persist.'); }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    if (musicInputRef.current) musicInputRef.current.value = '';
  };

  const handleRemoveMusic = (index: number) => {
    if (playingMusic === index) {
      setPlayingMusic(null);
      if (audioRef.current) audioRef.current.pause();
    }
    setUploadedMusic(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try { localStorage.setItem('everloved-music', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  const handlePlayMusic = (index: number) => {
    if (playingMusic === index) {
      setPlayingMusic(null);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlayingMusic(index);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingPhoto(true); };
  const handlePhotoDragLeave = () => setIsDraggingPhoto(false);
  const handlePhotoDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingPhoto(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) await processMemoryPhotos(files);
  };

  const handleVideoDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingVideo(true); };
  const handleVideoDragLeave = () => setIsDraggingVideo(false);
  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingVideo(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (files.length > 0) processVideos(files);
  };

  const handleMusicDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingMusic(true); };
  const handleMusicDragLeave = () => setIsDraggingMusic(false);
  const handleMusicDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingMusic(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
    if (files.length > 0) processMusic(files);
  };

  const colors = {
    bg1: '#FDF8F3', bg2: '#F5EDE4', warmGlow: 'rgba(255, 210, 160, 0.3)',
    cardBg: 'rgba(255, 255, 255, 0.92)', cardBorder: 'rgba(232, 201, 160, 0.4)',
    accent: '#D4A84A', accentHover: '#C49638', accentLight: 'rgba(212, 168, 74, 0.12)',
    text: '#4A3D32', textMuted: '#8B7355', textLight: '#A89880',
    inputBg: '#FEFCFA', inputBorder: 'rgba(212, 168, 74, 0.3)',
    success: '#7A9B6D', successLight: 'rgba(122, 155, 109, 0.15)',
    danger: '#C47A7A', brand: '#1a3a5c',
    stepComplete: '#7A9B6D', stepCurrent: '#D4A84A', stepPending: '#E0D5C8',
    dropActive: 'rgba(122, 155, 109, 0.3)',
    music: '#6B8CAE', musicLight: 'rgba(107, 140, 174, 0.15)',
  };

  const steps = [
    { num: 1, title: 'Patient Identity', subtitle: 'Who are we caring for?' },
    { num: 2, title: 'Life Story', subtitle: 'Memories that anchor identity' },
    { num: 3, title: 'Memory Crate', subtitle: 'Photos, videos & music for comfort' },
    { num: 4, title: 'Companion & Safety', subtitle: 'Voice, tone & boundaries' },
  ];

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goToStep = (step: number) => setCurrentStep(step);

  const Button = ({ children, variant = 'primary', onClick, disabled, style = {} }: {
    children: React.ReactNode; variant?: 'primary' | 'ghost'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties;
  }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: disabled ? 0.5 : 1,
      background: variant === 'primary' ? colors.accent : 'transparent',
      color: variant === 'primary' ? '#fff' : colors.textMuted, ...style,
    }}>{children}</button>
  );

  const Input = ({ value, onChange, placeholder, label }: {
    value: string; onChange: (val: string) => void; placeholder: string; label?: string;
  }) => (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>{label}</label>}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{
        width: '100%', padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${colors.inputBorder}`,
        background: colors.inputBg, color: colors.text, fontSize: '1rem', outline: 'none',
      }} />
    </div>
  );

  const Select = ({ value, onChange, options, label }: {
    value: string; onChange: (val: string) => void; options: { value: string; label: string }[]; label?: string;
  }) => (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: '100%', padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${colors.inputBorder}`,
        background: colors.inputBg, color: colors.text, fontSize: '1rem', cursor: 'pointer', outline: 'none', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238B7355' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 18px center',
      }}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const Checkbox = ({ checked, onChange, label, description }: {
    checked: boolean; onChange: (val: boolean) => void; label: string; description?: string;
  }) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px 0', borderBottom: `1px solid ${colors.accentLight}` }}>
      <div onClick={(e) => { e.preventDefault(); onChange(!checked); }} style={{
        width: '22px', height: '22px', minWidth: '22px', borderRadius: '6px',
        border: `2px solid ${checked ? colors.accent : colors.inputBorder}`,
        background: checked ? colors.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease', marginTop: '2px',
      }}>
        {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div>
        <div style={{ color: colors.text, fontSize: '0.95rem', fontWeight: 500 }}>{label}</div>
        {description && <div style={{ color: colors.textMuted, fontSize: '0.85rem', marginTop: '2px' }}>{description}</div>}
      </div>
    </label>
  );

  const UploadZone = ({ icon, title, subtitle, buttonText, onClick, onDragOver, onDragLeave, onDrop, isDragging, accentColor }: {
    icon: string; title: string; subtitle: string; buttonText: string; onClick?: () => void;
    onDragOver?: (e: React.DragEvent) => void; onDragLeave?: () => void; onDrop?: (e: React.DragEvent) => void; isDragging?: boolean; accentColor?: string;
  }) => (
    <div onClick={onClick} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{
      border: `2px dashed ${isDragging ? colors.success : colors.inputBorder}`, borderRadius: '16px', padding: '32px 24px',
      textAlign: 'center', background: isDragging ? colors.dropActive : colors.accentLight, cursor: 'pointer', transition: 'all 0.2s ease',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{icon}</div>
      <p style={{ margin: '0 0 4px', color: colors.text, fontWeight: 600, fontSize: '1rem' }}>{title}</p>
      <p style={{ margin: '0 0 6px', color: colors.textMuted, fontSize: '0.85rem' }}>{subtitle}</p>
      <p style={{ margin: '0 0 16px', color: colors.success, fontSize: '0.8rem', fontWeight: 500 }}>📎 Or drag & drop</p>
      <Button variant="primary" style={{ padding: '10px 20px', fontSize: '0.9rem', background: accentColor || colors.accent }}>{buttonText}</Button>
    </div>
  );

  const HelpText = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: colors.accentLight, borderLeft: `3px solid ${colors.accent}`, padding: '16px 20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
      <p style={{ margin: 0, color: colors.text, fontSize: '0.95rem', lineHeight: 1.6 }}>{children}</p>
    </div>
  );

  const Step1Content = () => (
    <>
      <HelpText>Start by telling us about the person you&apos;re caring for. This helps the AI companion understand who they&apos;re supporting.</HelpText>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div style={{ marginBottom: "16px" }}><label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600, color: colors.text }}>Patient's Name</label><input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g., Vera" style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", border: `1.5px solid ${colors.inputBorder}`, fontSize: "1rem", background: colors.inputBg }} /></div>
          <div style={{ marginBottom: "16px" }}><label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600, color: colors.text }}>Your Name (Caregiver)</label><input type="text" value={caregiverName} onChange={(e) => setCaregiverName(e.target.value)} placeholder="e.g., Michael" style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", border: `1.5px solid ${colors.inputBorder}`, fontSize: "1rem", background: colors.inputBg }} /></div>
          <div style={{ marginBottom: "16px" }}><label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600, color: colors.text }}>Your Relationship</label><input type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g., Son, Daughter, Spouse" style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", border: `1.5px solid ${colors.inputBorder}`, fontSize: "1rem", background: colors.inputBg }} /></div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>Patient Photo</label>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
          {patientPhoto ? (
            <div style={{ border: `2px solid ${colors.accent}`, borderRadius: '16px', padding: '20px', textAlign: 'center', background: colors.accentLight }}>
              <img src={patientPhoto} alt="Patient" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
              <p style={{ margin: '0 0 12px', color: colors.success, fontWeight: 600 }}>✓ Photo uploaded</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>Change</Button>
                <Button variant="ghost" onClick={handleRemovePhoto} style={{ color: colors.danger }}>Remove</Button>
              </div>
            </div>
          ) : (
            <UploadZone icon="📷" title="Upload a photo" subtitle="A clear, recent photo helps personalize" buttonText="Choose Photo" onClick={() => fileInputRef.current?.click()} />
          )}
        </div>
      </div>
    </>
  );

  const Step2Content = () => (
    <>
      <HelpText>Share stories and memories that matter most. This becomes the AI&apos;s memory for meaningful conversations.</HelpText>
      <textarea value={lifeStory} onChange={(e) => setLifeStory(e.target.value)} placeholder="Share their story here... Where did they grow up? What was their career? Who are important people? What are their happiest memories?" style={{
        width: '100%', minHeight: '280px', padding: '20px', borderRadius: '16px', border: `1.5px solid ${colors.inputBorder}`,
        background: colors.inputBg, color: colors.text, fontSize: '1rem', lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
      }} />
      <div style={{ background: colors.successLight, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
        <span style={{ fontSize: '1.3rem' }}>💡</span>
        <p style={{ margin: 0, color: colors.text, fontSize: '0.9rem' }}><strong>Tip:</strong> The more detail you provide, the more natural conversations will feel.</p>
      </div>
    </>
  );

  const Step3Content = () => (
    <>
      <HelpText>Upload photos, videos, and music that bring comfort. Music is especially powerful for triggering deep memories and providing calm during difficult moments.</HelpText>
      <input type="file" ref={memoryPhotoInputRef} onChange={handleMemoryPhotoUpload} accept="image/*" multiple style={{ display: 'none' }} />
      <input type="file" ref={videoInputRef} onChange={handleVideoUpload} accept="video/*" multiple style={{ display: 'none' }} />
      <input type="file" ref={musicInputRef} onChange={handleMusicUpload} accept="audio/*" multiple style={{ display: 'none' }} />
      
      {/* Hidden audio element for playback */}
      {playingMusic !== null && uploadedMusic[playingMusic] && (
        <audio ref={audioRef} src={uploadedMusic[playingMusic].data} autoPlay onEnded={() => setPlayingMusic(null)} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Photos */}
        <div>
          <h4 style={{ margin: '0 0 12px', color: colors.text, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📷 Photos <span style={{ fontSize: '0.85rem', color: colors.textMuted, fontWeight: 400 }}>({uploadedMemoryPhotos.length})</span>
          </h4>
          <UploadZone icon="🖼️" title="Memory photos" subtitle="Multiple photos at once" buttonText="Add Photos" onClick={() => memoryPhotoInputRef.current?.click()}
            onDragOver={handlePhotoDragOver} onDragLeave={handlePhotoDragLeave} onDrop={handlePhotoDrop} isDragging={isDraggingPhoto} />
          {uploadedMemoryPhotos.length > 0 && (
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {uploadedMemoryPhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={photo} alt={`Memory ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => handleRemoveMemoryPhoto(i)} style={{
                    position: 'absolute', top: '4px', right: '4px', background: colors.danger, color: '#fff',
                    border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px',
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div>
          <h4 style={{ margin: '0 0 12px', color: colors.text, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎬 Videos <span style={{ fontSize: '0.85rem', color: colors.textMuted, fontWeight: 400 }}>({uploadedVideos.length})</span>
          </h4>
          <UploadZone icon="▶️" title="Comfort videos" subtitle="Max 2MB each" buttonText="Add Videos" onClick={() => videoInputRef.current?.click()}
            onDragOver={handleVideoDragOver} onDragLeave={handleVideoDragLeave} onDrop={handleVideoDrop} isDragging={isDraggingVideo} />
          {uploadedVideos.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {uploadedVideos.map((video, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: colors.accentLight, borderRadius: '8px' }}>
                  <video src={video.data} style={{ width: '50px', height: '35px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.name}</span>
                  <button onClick={() => handleRemoveVideo(i)} style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Music - Full Width */}
      <div style={{ background: colors.musicLight, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.music}30` }}>
        <h4 style={{ margin: '0 0 16px', color: colors.text, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🎵 Favorite Music
          <span style={{ fontSize: '0.85rem', color: colors.textMuted, fontWeight: 400 }}>({uploadedMusic.length} songs)</span>
        </h4>
        <p style={{ margin: '0 0 16px', color: colors.textMuted, fontSize: '0.9rem' }}>
          Music from their past can unlock memories and provide comfort. Upload their favorite songs, hymns, or melodies.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: uploadedMusic.length > 0 ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div
            onClick={() => musicInputRef.current?.click()}
            onDragOver={handleMusicDragOver}
            onDragLeave={handleMusicDragLeave}
            onDrop={handleMusicDrop}
            style={{
              border: `2px dashed ${isDraggingMusic ? colors.success : colors.music}50`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              background: isDraggingMusic ? colors.dropActive : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎶</div>
            <p style={{ margin: '0 0 4px', color: colors.text, fontWeight: 600, fontSize: '0.95rem' }}>Add music files</p>
            <p style={{ margin: '0 0 12px', color: colors.textMuted, fontSize: '0.8rem' }}>MP3, WAV, M4A (max 3MB each)</p>
            <Button variant="primary" style={{ background: colors.music, padding: '10px 20px', fontSize: '0.85rem' }}>Choose Music</Button>
          </div>

          {uploadedMusic.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {uploadedMusic.map((music, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  background: playingMusic === i ? `${colors.music}20` : 'rgba(255,255,255,0.7)',
                  borderRadius: '10px', border: playingMusic === i ? `2px solid ${colors.music}` : '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}>
                  <button
                    onClick={() => handlePlayMusic(i)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                      background: playingMusic === i ? colors.music : colors.accentLight,
                      color: playingMusic === i ? '#fff' : colors.music,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', transition: 'all 0.2s ease',
                    }}
                  >
                    {playingMusic === i ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: colors.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {music.name.replace(/\.[^/.]+$/, '')}
                    </p>
                    {playingMusic === i && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: colors.music, fontWeight: 500 }}>♪ Now playing...</p>
                    )}
                  </div>
                  <button onClick={() => handleRemoveMusic(i)} style={{
                    background: 'transparent', color: colors.danger, border: 'none',
                    cursor: 'pointer', fontSize: '16px', padding: '4px',
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {uploadedMusic.length === 0 && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: colors.textMuted, textAlign: 'center' }}>
              💡 <strong>Tip:</strong> Songs from ages 15-25 often have the strongest memory connections
            </p>
          </div>
        )}
      </div>
    </>
  );

  const Step4Content = () => (
    <>
      <HelpText>Configure how the AI companion sounds and behaves. Set boundaries to prevent confusion or distress.</HelpText>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div>
          <h4 style={{ margin: '0 0 20px', color: colors.text, fontSize: '1rem' }}>🎙 Voice & Personality</h4>
          <Select label="Voice Style" value={voiceStyle} onChange={setVoiceStyle} options={[
            { value: 'gentle', label: 'Gentle & Soft' }, { value: 'warm', label: 'Warm & Nurturing' },
            { value: 'calm', label: 'Calm & Steady' }, { value: 'cheerful', label: 'Cheerful & Bright' },
          ]} />
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>Tone Anchors</label>
          <Checkbox checked={toneAnchors.calm} onChange={(v) => setToneAnchors({ ...toneAnchors, calm: v })} label="Calm" description="Soothing, peaceful presence" />
          <Checkbox checked={toneAnchors.jovial} onChange={(v) => setToneAnchors({ ...toneAnchors, jovial: v })} label="Jovial" description="Warm, gently cheerful" />
          <Checkbox checked={toneAnchors.authoritative} onChange={(v) => setToneAnchors({ ...toneAnchors, authoritative: v })} label="Authoritative" description="Confident, reassuring" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 20px', color: colors.text, fontSize: '1rem' }}>🛡 Safety Boundaries</h4>
          <Checkbox checked={boundaries.travelPromises} onChange={(v) => setBoundaries({ ...boundaries, travelPromises: v })} label="Block travel promises" description="Won't promise trips that can't happen" />
          <Checkbox checked={boundaries.beingAlive} onChange={(v) => setBoundaries({ ...boundaries, beingAlive: v })} label='Block "being alive" claims' description="Won't claim deceased are still alive" />
          <Checkbox checked={boundaries.redirectConfusion} onChange={(v) => setBoundaries({ ...boundaries, redirectConfusion: v })} label="Redirect confusion" description="Steers away from distressing topics" />
          <div style={{ marginTop: '24px', padding: '20px', background: colors.accentLight, borderRadius: '12px' }}>
            <h5 style={{ margin: '0 0 12px', color: colors.text, fontSize: '0.95rem' }}>🔊 Test the Voice</h5>
            <Button variant="primary" style={{ width: '100%' }}>▶ Play Sample</Button>
          </div>
        </div>
      </div>
    </>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Step1Content />; case 2: return <Step2Content />;
      case 3: return <Step3Content />; case 4: return <Step4Content />; default: return null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 20% 10%, ${colors.warmGlow} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', padding: '32px 48px', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {steps.map((step, index) => (
              <React.Fragment key={step.num}>
                <div onClick={() => goToStep(step.num)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: '0 0 auto' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: currentStep > step.num ? colors.stepComplete : currentStep === step.num ? colors.stepCurrent : colors.stepPending,
                    color: currentStep >= step.num ? '#fff' : colors.textMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem',
                    transition: 'all 0.3s ease', boxShadow: currentStep === step.num ? `0 4px 15px ${colors.accent}40` : 'none',
                  }}>{currentStep > step.num ? '✓' : step.num}</div>
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: currentStep === step.num ? 700 : 500, color: currentStep === step.num ? colors.text : colors.textMuted }}>{step.title}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.textLight, marginTop: '2px' }}>{step.subtitle}</div>
                  </div>
                </div>
                {index < steps.length - 1 && <div style={{ flex: 1, height: '3px', background: currentStep > step.num ? colors.stepComplete : colors.stepPending, margin: '0 16px', marginBottom: '50px', borderRadius: '2px' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <main style={{ position: 'relative', padding: '0 48px 140px', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: colors.cardBg, borderRadius: '24px', padding: '40px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 8px 40px rgba(139, 115, 85, 0.1)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 600, color: colors.text }}>{steps[currentStep - 1].title}</h2>
            <p style={{ margin: '0 0 28px', color: colors.textMuted, fontSize: '1rem' }}>{steps[currentStep - 1].subtitle}</p>
            {renderStepContent()}
          </div>
        </div>
      </main>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px 48px', background: `linear-gradient(to top, ${colors.bg2} 60%, transparent 100%)`, zIndex: 10 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}>← Back</Button>
          <div style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Step {currentStep} of {totalSteps}</div>
          {currentStep < totalSteps ? <Button variant="primary" onClick={nextStep}>Continue →</Button> : <Button variant="primary" onClick={() => alert('Configuration saved!')} style={{ background: colors.success }}>Save Configuration ✓</Button>}
        </div>
      </div>
    </div>
  );
}
