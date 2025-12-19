'use client';

import React, { useState } from 'react';

export default function CognitiveAnalytics() {
  const [timeRange, setTimeRange] = useState('week');

  const colors = {
    bg1: '#FDF8F3', bg2: '#F5EDE4', warmGlow: 'rgba(255, 210, 160, 0.25)',
    cardBg: 'rgba(255, 255, 255, 0.92)', cardBorder: 'rgba(232, 201, 160, 0.4)',
    accent: '#D4A84A', accentLight: 'rgba(212, 168, 74, 0.12)',
    text: '#4A3D32', textMuted: '#8B7355', textLight: '#A89880',
    success: '#7A9B6D', successLight: 'rgba(122, 155, 109, 0.15)',
    warning: '#D4A84A', warningLight: 'rgba(212, 168, 74, 0.15)',
    danger: '#C47A7A', dangerLight: 'rgba(196, 122, 122, 0.12)',
  };

  type Status = 'good' | 'watch' | 'concern';
  type Trend = 'up' | 'down' | 'stable';

  const metrics = [
    { id: 'lexical', title: 'Vocabulary Range', subtitle: 'Variety of words used', value: '0.72', unit: 'ratio', trend: 'stable' as Trend, trendValue: '0%', status: 'good' as Status, sparkline: [65, 70, 68, 72, 71, 70, 72], interpretation: 'Healthy vocabulary diversity' },
    { id: 'coherence', title: 'Thought Clarity', subtitle: 'How logically ideas connect', value: '92', unit: '%', trend: 'up' as Trend, trendValue: '+3%', status: 'good' as Status, sparkline: [85, 87, 88, 90, 89, 91, 92], interpretation: 'Conversations are well-organized' },
    { id: 'speed', title: 'Response Time', subtitle: 'Time to formulate responses', value: '1.8', unit: 'sec', trend: 'down' as Trend, trendValue: '+0.3s', status: 'watch' as Status, sparkline: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8], interpretation: 'Slightly slower than usual' },
    { id: 'mood', title: 'Emotional State', subtitle: 'Overall mood during sessions', value: 'Calm', unit: '', trend: 'stable' as Trend, trendValue: '', status: 'good' as Status, sparkline: [3, 4, 3, 4, 4, 4, 4], interpretation: 'Consistently positive mood' },
    { id: 'recall', title: 'Short-Term Memory', subtitle: 'Ability to recall recent topics', value: '60', unit: '%', trend: 'stable' as Trend, trendValue: '0%', status: 'watch' as Status, sparkline: [55, 58, 62, 60, 58, 61, 60], interpretation: '3 of 5 memory prompts recalled' },
    { id: 'confusion', title: 'Confusion Episodes', subtitle: 'Moments of disorientation', value: '4', unit: 'today', trend: 'up' as Trend, trendValue: '+2', status: 'concern' as Status, sparkline: [2, 1, 2, 3, 2, 3, 4], interpretation: 'Higher than average today' },
    { id: 'attention', title: 'Attention Span', subtitle: 'Average engaged conversation time', value: '12:30', unit: 'min', trend: 'up' as Trend, trendValue: '+2m', status: 'good' as Status, sparkline: [8, 9, 10, 10, 11, 11, 12], interpretation: 'Improving engagement duration' },
    { id: 'fluency', title: 'Verbal Fluency', subtitle: 'Words spoken per minute', value: '85', unit: 'wpm', trend: 'stable' as Trend, trendValue: '', status: 'good' as Status, sparkline: [82, 84, 83, 85, 84, 86, 85], interpretation: 'Normal speaking pace' },
  ];

  const insights = [
    { type: 'observation', icon: '🔍', text: 'Confusion episodes tend to increase after 4 PM, suggesting sundowning patterns.' },
    { type: 'positive', icon: '✨', text: 'Attention span has improved 25% over the past two weeks.' },
    { type: 'recommendation', icon: '💡', text: 'Consider scheduling important conversations in the morning when clarity is highest.' },
  ];

  const getStatusColor = (status: Status) => ({ good: colors.success, watch: colors.warning, concern: colors.danger }[status]);
  const getStatusBg = (status: Status) => ({ good: colors.successLight, watch: colors.warningLight, concern: colors.dangerLight }[status]);
  const getTrendIcon = (trend: Trend) => ({ up: '↑', down: '↓', stable: '→' }[trend]);

  const Sparkline = ({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) => {
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1, width = 100;
    const points = data.map((val, i) => `${(i / (data.length - 1)) * width},${height - ((val - min) / range) * (height - 10) - 5}`).join(' ');
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * (height - 10) - 5} r="4" fill={color} />
      </svg>
    );
  };

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: colors.cardBg, borderRadius: '16px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 4px 20px rgba(139, 115, 85, 0.06)', ...style }}>{children}</div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 20% 10%, ${colors.warmGlow} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />

      {/* Time Range Selector */}
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 40px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '4px', background: colors.accentLight, padding: '4px', borderRadius: '10px' }}>
          {['today', 'week', 'month'].map((range) => (
            <button key={range} onClick={() => setTimeRange(range)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: timeRange === range ? colors.cardBg : 'transparent', color: timeRange === range ? colors.text : colors.textMuted, fontWeight: timeRange === range ? 600 : 400, fontSize: '0.9rem', cursor: 'pointer', boxShadow: timeRange === range ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', textTransform: 'capitalize' }}>
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      <main style={{ position: 'relative', padding: '0 40px 40px', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Overall Status */}
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: colors.success, fontWeight: 700 }}>✓</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>Cognitive Status:</h2>
                    <span style={{ padding: '6px 16px', borderRadius: '20px', background: colors.successLight, color: colors.success, fontWeight: 700, fontSize: '1rem' }}>Stable</span>
                  </div>
                  <p style={{ margin: '8px 0 0', color: colors.textMuted, fontSize: '1.05rem' }}>Mom&apos;s cognition is stable this week. Thought clarity improved, though response time is slightly slower.</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: colors.textMuted, marginBottom: '4px' }}>Last updated</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text }}>2 minutes ago</div>
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>{metric.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textLight }}>{metric.subtitle}</p>
                    </div>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(metric.status) }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: colors.text }}>{metric.value}</span>
                    <span style={{ fontSize: '1rem', color: colors.textMuted }}>{metric.unit}</span>
                    {metric.trendValue && (
                      <span style={{ marginLeft: '8px', padding: '3px 8px', borderRadius: '12px', background: getStatusBg(metric.status), color: getStatusColor(metric.status), fontSize: '0.8rem', fontWeight: 600 }}>
                        {getTrendIcon(metric.trend)} {metric.trendValue}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '12px' }}><Sparkline data={metric.sparkline} color={getStatusColor(metric.status)} /></div>
                  <div style={{ padding: '10px 12px', background: getStatusBg(metric.status), borderRadius: '8px', fontSize: '0.85rem', color: getStatusColor(metric.status), fontWeight: 500 }}>{metric.interpretation}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Insights Panel */}
          <Card>
            <div style={{ padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 600, color: colors.text }}>📊 Insights & Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {insights.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 20px', background: insight.type === 'positive' ? colors.successLight : insight.type === 'recommendation' ? colors.accentLight : colors.bg2, borderRadius: '12px', borderLeft: `4px solid ${insight.type === 'positive' ? colors.success : insight.type === 'recommendation' ? colors.accent : colors.textMuted}` }}>
                    <span style={{ fontSize: '1.4rem' }}>{insight.icon}</span>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: colors.text, lineHeight: 1.5 }}>{insight.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', padding: '20px', background: colors.accentLight, borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>Week-over-Week Comparison</h4>
                  <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>vs. last week</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[{ label: 'Clarity', value: '+3%', positive: true }, { label: 'Attention', value: '+18%', positive: true }, { label: 'Confusion', value: '+12%', positive: false }, { label: 'Recall', value: '0%', positive: null }].map((stat) => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.positive === true ? colors.success : stat.positive === false ? colors.danger : colors.textMuted }}>{stat.value}</div>
                      <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
