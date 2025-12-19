'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ScienceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const colors = {
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(232, 201, 160, 0.4)',
    text: '#4A3D32',
    textMuted: '#8B7355',
  };

  const mainTabs = [
    { href: '/', label: 'Patient Comfort', icon: '♡' },
    { href: '/caregiver', label: 'Caregiver Control', icon: '⚙' },
    { href: '/science', label: 'New Science', icon: '◈' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #FDF8F3 0%, #F5EDE4 100%)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, padding: '8px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${colors.cardBorder}`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}>
        <Link href="/">
          <img src="/logo-horizontal.png" alt="everloved" style={{ height: '100px', width: 'auto' }} />
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {mainTabs.map((tab) => {
            const isActive = tab.href === '/science' ? pathname.startsWith('/science') : pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href} style={{ padding: '10px 20px', borderRadius: '20px', background: isActive ? colors.cardBg : 'transparent', color: isActive ? colors.text : colors.textMuted, fontWeight: isActive ? 600 : 400, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', border: isActive ? `1px solid ${colors.cardBorder}` : '1px solid transparent' }}>
                <span style={{ opacity: 0.7 }}>{tab.icon}</span>{tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
