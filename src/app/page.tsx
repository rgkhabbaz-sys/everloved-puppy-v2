'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientComfort() {
  const [colors, setColors] = useState({
    bg1: '#FDF8F3',
    bg2: '#F5EDE4',
    warmGlow: 'rgba(255, 210, 160, 0.4)',
  });
  const [breathPhase, setBreathPhase] = useState(0);

  const palettes = {
    night: { bg1: '#2C1810', bg2: '#1A0F0A', warmGlow: 'rgba(255, 147, 41, 0.25)' },
    sunrise: { bg1: '#FFF5E6', bg2: '#FFE4CC', warmGlow: 'rgba(255, 180, 100, 0.4)' },
    day: { bg1: '#F0F7FF', bg2: '#E1EFFE', warmGlow: 'rgba(135, 206, 250, 0.3)' },
    sunset: { bg1: '#FFF0E6', bg2: '#FFE0CC', warmGlow: 'rgba(255, 160, 80, 0.4)' },
    evening: { bg1: '#3D2914', bg2: '#2C1810', warmGlow: 'rgba(255, 140, 50, 0.3)' },
  };

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
  };
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const interpolateHex = (hex1: string, hex2: string, t: number) => {
    const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
  };
  const interpolateRgba = (rgba1: string, rgba2: string, t: number) => {
    const parse = (rgba: string) => { const m = rgba.match(/[\d.]+/g); return m ? m.map(Number) : [0,0,0,0]; };
    const c1 = parse(rgba1), c2 = parse(rgba2);
    return `rgba(${Math.round(lerp(c1[0], c2[0], t))}, ${Math.round(lerp(c1[1], c2[1], t))}, ${Math.round(lerp(c1[2], c2[2], t))}, ${lerp(c1[3], c2[3], t).toFixed(2)})`;
  };
  const interpolatePalettes = (p1: typeof palettes.day, p2: typeof palettes.day, t: number) => ({
    bg1: interpolateHex(p1.bg1, p2.bg1, t),
    bg2: interpolateHex(p1.bg2, p2.bg2, t),
    warmGlow: interpolateRgba(p1.warmGlow, p2.warmGlow, t),
  });

  useEffect(() => {
    const updateColors = () => {
      const now = new Date();
      const timeInMinutes = now.getHours() * 60 + now.getMinutes();
      let newColors;
      if (timeInMinutes >= 360 && timeInMinutes < 540) {
        newColors = interpolatePalettes(palettes.sunrise, palettes.day, (timeInMinutes - 360) / 180);
      } else if (timeInMinutes >= 540 && timeInMinutes < 960) {
        newColors = palettes.day;
      } else if (timeInMinutes >= 960 && timeInMinutes < 1140) {
        newColors = interpolatePalettes(palettes.day, palettes.evening, (timeInMinutes - 960) / 180);
      } else if (timeInMinutes >= 1140 && timeInMinutes < 1320) {
        newColors = palettes.evening;
      } else if (timeInMinutes >= 1320 || timeInMinutes < 300) {
        newColors = palettes.night;
      } else {
        newColors = interpolatePalettes(palettes.night, palettes.sunrise, (timeInMinutes - 300) / 60);
      }
      setColors(newColors);
    };
    updateColors();
    const interval = setInterval(updateColors, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const breathCycle = setInterval(() => setBreathPhase((prev) => (prev + 1) % 100), 50);
    return () => clearInterval(breathCycle);
  }, []);

  const breathScale = 1 + Math.sin((breathPhase / 100) * Math.PI * 2) * 0.01;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(180deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`, position: 'relative', overflow: 'hidden', transition: 'background 2s ease-in-out' }}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: `radial-gradient(circle, ${colors.warmGlow} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 2s ease-in-out' }} />
      <nav style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', padding: '6px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)', borderRadius: '30px', boxShadow: '0 4px 20px rgba(139, 115, 85, 0.1)', border: '1px solid rgba(232, 201, 160, 0.3)', zIndex: 100 }}>
        {[
          { href: '/', label: 'Patient Comfort', icon: '♡', active: true },
          { href: '/caregiver', label: 'Caregiver Control', icon: '⚙' },
          { href: '/science', label: 'New Science', icon: '◈' },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '24px', background: tab.active ? 'rgba(255, 255, 255, 0.9)' : 'transparent', color: tab.active ? '#4A3D32' : '#8B7355', fontSize: '0.9rem', fontWeight: tab.active ? 600 : 400, textDecoration: 'none', transition: 'all 0.2s ease', boxShadow: tab.active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
            <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div style={{ position: 'relative', transform: `scale(${breathScale})`, transition: 'transform 0.1s ease-out' }}>
        <img src="/puppy.png" alt="Friendly companion puppy" style={{ width: '320px', height: 'auto', objectFit: 'contain' }} />
      </div>
    </div>
  );
}
