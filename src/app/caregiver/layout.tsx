'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const colors = {
    bg1: '#FDF8F3', bg2: '#F5EDE4', cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)', accent: '#D4A84A',
    text: '#4A3D32', textMuted: '#8B7355',
  };

  const mainTabs = [
    { href: '/patient', label: 'Patient Comfort', icon: '♡' },
    { href: '/caregiver', label: 'Caregiver Control', icon: '⚙' },
    { href: '/science', label: 'New Science', icon: '◈' },
  ];

  const subTabs = [
    { href: '/caregiver', label: 'Patient' },
    { href: '/caregiver/settings', label: 'Disease Stage' },
    { href: '/caregiver/monitoring', label: 'Monitoring Dashboard' },
    { href: '/caregiver/analytics', label: 'Cognitive Analytics' },
  ];

  const isActive = (href: string) => pathname === href;
  const isCaregiverSection = pathname.startsWith('/caregiver');

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(170deg, ${colors.bg1} 0%, ${colors.bg2} 100%)` }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, padding: '8px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${colors.cardBorder}`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}>
        <Link href="/">
          <img src="/logo-horizontal.png" alt="everloved" style={{ height: '100px', width: 'auto' }} />
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {mainTabs.map((tab) => {
            const active = tab.href === '/caregiver' ? isCaregiverSection : isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href} style={{ padding: '10px 20px', borderRadius: '20px', background: active ? colors.cardBg : 'transparent', color: active ? colors.text : colors.textMuted, fontWeight: active ? 600 : 400, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', border: active ? `1px solid ${colors.cardBorder}` : '1px solid transparent' }}>
                <span style={{ opacity: 0.7 }}>{tab.icon}</span>{tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div style={{ borderBottom: `1px solid ${colors.cardBorder}`, background: 'rgba(255,255,255,0.5)', padding: '0 40px' }}>
        <nav style={{ display: 'flex', gap: '4px', maxWidth: '1400px', margin: '0 auto' }}>
          {subTabs.map((tab) => (
            <Link key={tab.href} href={tab.href} style={{ padding: '14px 24px', color: isActive(tab.href) ? colors.accent : colors.textMuted, fontWeight: isActive(tab.href) ? 600 : 400, fontSize: '0.9rem', textDecoration: 'none', borderBottom: isActive(tab.href) ? `2px solid ${colors.accent}` : '2px solid transparent', marginBottom: '-1px' }}>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
