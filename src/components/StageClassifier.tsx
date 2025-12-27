/**
 * EverLoved - StageClassifier Component
 * Styled to match Avatar Configuration exactly
 */

'use client';

import React, { useState, useEffect } from 'react';

const STAGES = {
  early: {
    id: 'early',
    title: 'Early Stage',
    subtitle: 'Mild Cognitive Decline',
    gds: 'GDS 3-4',
    icon: '🌱',
    stageColor: '#7A9B6D',
    intervention: {
      primaryGoal: 'Maintaining Independence',
      primaryDetail: 'Support cognitive function while preserving autonomy. Focus on reinforcing existing skills and building routines.',
      dailyFocus: 'Cognitive Engagement',
      dailyItems: ['Memory exercises', 'Structured routines', 'Social activities', 'Medication reminders'],
      clinicalNote: 'GDS 3-4: Patient retains awareness of deficits. MMSE typically 18-26. Focus on compensatory strategies and skill maintenance.',
    }
  },
  middle: {
    id: 'middle',
    title: 'Middle Stage',
    subtitle: 'Moderate Cognitive Decline',
    gds: 'GDS 5-6',
    icon: '🤝',
    stageColor: '#D4A84A',
    intervention: {
      primaryGoal: 'Safety & Emotional Support',
      primaryDetail: 'Balance safety with dignity. Increase supervision while reducing anxiety through validation and reassurance.',
      dailyFocus: 'Safety & Comfort',
      dailyItems: ['Wandering prevention', 'Simplified choices', 'Sundowning protocols', 'Activity engagement'],
      clinicalNote: 'GDS 5-6: Requires ADL assistance. MMSE typically 10-18. BPSD common. Implement sundowning protocols 4-8 PM.',
    }
  },
  late: {
    id: 'late',
    title: 'Late Stage',
    subtitle: 'Severe Cognitive Decline',
    gds: 'GDS 7',
    icon: '🌙',
    stageColor: '#6B8CAE',
    intervention: {
      primaryGoal: 'Sensory Comfort & Presence',
      primaryDetail: 'Prioritize physical comfort and peaceful presence. Communication shifts to non-verbal connection.',
      dailyFocus: 'Comfort & Connection',
      dailyItems: ['Gentle touch/massage', 'Music therapy', 'Familiar voices', 'Comfort positioning'],
      clinicalNote: 'GDS 7: Minimal verbal communication. MMSE typically <10. Focus on comfort care and family support.',
    }
  }
};

type StageKey = 'early' | 'middle' | 'late';

// Helper to safely get from localStorage
function getStoredStage(): StageKey {
  if (typeof window === 'undefined') return 'middle';
  try {
    const saved = localStorage.getItem('everloved-disease-stage');
    if (saved && ['early', 'middle', 'late'].includes(saved)) {
      return saved as StageKey;
    }
  } catch (e) {
    console.log('Error loading disease stage:', e);
  }
  return 'middle';
}

export default function StageClassifier() {
  const [selectedStage, setSelectedStage] = useState<StageKey>('middle');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [savedStage, setSavedStage] = useState<StageKey>('middle');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved stage from localStorage on mount
  useEffect(() => {
    const stored = getStoredStage();
    setSelectedStage(stored);
    setSavedStage(stored);
    setIsLoaded(true);
  }, []);

  const stage = STAGES[selectedStage];
  const hasChanges = selectedStage !== savedStage;

  // Match Avatar Configuration colors exactly
  const colors = {
    bg1: '#FDF8F3', bg2: '#F5EDE4', warmGlow: 'rgba(255, 210, 160, 0.3)',
    cardBg: 'rgba(255, 255, 255, 0.92)', cardBorder: 'rgba(232, 201, 160, 0.4)',
    accent: '#D4A84A', accentHover: '#C49638', accentLight: 'rgba(212, 168, 74, 0.12)',
    text: '#4A3D32', textMuted: '#8B7355', textLight: '#A89880',
    inputBg: '#FEFCFA', inputBorder: 'rgba(212, 168, 74, 0.3)',
    success: '#7A9B6D', successLight: 'rgba(122, 155, 109, 0.15)',
    danger: '#C47A7A',
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSavedStage(selectedStage);
    // Save to localStorage
    try {
      localStorage.setItem('everloved-disease-stage', selectedStage);
    } catch (e) {
      console.log('Error saving disease stage:', e);
    }
    setConfirming(false);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2000);
  };

  const Button = ({ children, onClick, disabled, variant = 'primary', style = {} }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'; style?: React.CSSProperties;
  }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: disabled ? 0.5 : 1,
      background: variant === 'primary' ? colors.accent : 'transparent',
      color: variant === 'primary' ? '#fff' : colors.textMuted,
      display: 'flex', alignItems: 'center', gap: '8px', ...style,
    }}>{children}</button>
  );

  const HelpText = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: colors.accentLight, borderLeft: `3px solid ${colors.accent}`, padding: '16px 20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
      <p style={{ margin: 0, color: colors.text, fontSize: '0.95rem', lineHeight: 1.6 }}>{children}</p>
    </div>
  );

  // Don't render until we've loaded from localStorage
  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 20% 10%, ${colors.warmGlow} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />
      
      <main style={{ position: 'relative', padding: '32px 48px 48px', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: colors.cardBg, borderRadius: '24px', padding: '40px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 8px 40px rgba(139, 115, 85, 0.1)' }}>
            
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 600, color: colors.text }}>Disease Stage Classification</h2>
            <p style={{ margin: '0 0 28px', color: colors.textMuted, fontSize: '1rem' }}>Select the current stage to adjust AI companion behavior and care protocols</p>
            
            <HelpText>
              The Global Deterioration Scale (GDS) helps match care strategies to your loved one&apos;s current needs. 
              This setting adjusts how the AI companion responds and what safety protocols are active.
            </HelpText>

            {/* Stage Selection Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {(Object.keys(STAGES) as StageKey[]).map((key) => {
                const s = STAGES[key];
                const isSelected = selectedStage === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedStage(key)}
                    style={{
                      padding: '24px 20px',
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${s.stageColor}` : `1.5px solid ${colors.inputBorder}`,
                      background: isSelected ? `${s.stageColor}15` : colors.inputBg,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: s.stageColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>
                      </div>
                    )}
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{s.icon}</div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600, color: colors.text }}>{s.title}</h3>
                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: colors.textMuted }}>{s.subtitle}</p>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                      background: isSelected ? s.stageColor : colors.accentLight,
                      color: isSelected ? '#fff' : colors.textMuted,
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>{s.gds}</span>
                  </div>
                );
              })}
            </div>

            {/* Intervention Details */}
            <div style={{ background: colors.inputBg, borderRadius: '16px', padding: '28px', border: `1.5px solid ${colors.inputBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: stage.stageColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                }}>{stage.icon}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: colors.text }}>{stage.title} Care Protocol</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: colors.textMuted }}>Intervention summary for {stage.gds}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Primary Goal */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.2rem' }}>🎯</span>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>
                      Primary Goal: <span style={{ color: stage.stageColor }}>{stage.intervention.primaryGoal}</span>
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: colors.textMuted, lineHeight: 1.5 }}>{stage.intervention.primaryDetail}</p>
                  </div>
                </div>

                {/* Daily Focus */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.2rem' }}>📋</span>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>
                      Daily Focus: <span style={{ color: stage.stageColor }}>{stage.intervention.dailyFocus}</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {stage.intervention.dailyItems.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: colors.textMuted }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: stage.stageColor }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clinical Note */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.2rem' }}>🩺</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>Clinical Note</h4>
                    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '14px 16px', border: `1px solid ${colors.cardBorder}` }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: colors.text, fontFamily: 'monospace', lineHeight: 1.6 }}>{stage.intervention.clinicalNote}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: `1px solid ${colors.cardBorder}` }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: confirmed ? colors.success : colors.textMuted }}>
                {hasChanges ? '⚡ Stage changed — confirm to update care protocols' : confirmed ? '✓ Care protocols updated successfully' : 'Current stage saved'}
              </p>
              <Button 
                onClick={handleConfirm} 
                disabled={!hasChanges || confirming}
                style={{ background: confirmed ? colors.success : hasChanges ? colors.accent : colors.textLight }}
              >
                {confirming ? (
                  <>⏳ Updating...</>
                ) : confirmed ? (
                  <>✓ Updated!</>
                ) : (
                  <>Save Changes →</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
