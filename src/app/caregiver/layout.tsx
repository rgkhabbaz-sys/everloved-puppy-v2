'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/caregiver', label: 'Avatar Configuration', icon: '👤' },
  { href: '/caregiver/settings', label: 'Disease Stage', icon: '📊' },
  { href: '/caregiver/monitoring', label: 'Monitoring Dashboard', icon: '📡' },
  { href: '/caregiver/analytics', label: 'Cognitive Analytics', icon: '🧠' },
];

const colors = {
  bg: '#FDF8F3',
  cardBg: 'rgba(255, 255, 255, 0.92)',
  cardBorder: 'rgba(232, 201, 160, 0.4)',
  accent: '#D4A84A',
  accentLight: 'rgba(212, 168, 74, 0.12)',
  textMuted: '#8B7355',
};

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ background: colors.bg, minHeight: '100vh' }}>
      <nav style={{
        background: colors.cardBg,
        borderBottom: `1px solid ${colors.cardBorder}`,
        padding: '0 48px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: '18px 28px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: isActive ? colors.accent : colors.textMuted,
                  background: isActive ? colors.accentLight : 'transparent',
                  borderBottom: isActive ? `3px solid ${colors.accent}` : '3px solid transparent',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
