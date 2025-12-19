'use client';

import React, { useState } from 'react';

export default function NewScience() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedArticles, setSavedArticles] = useState([1, 4]);
  const [email, setEmail] = useState('');

  const colors = {
    bg1: '#FDF8F3', bg2: '#F5EDE4', warmGlow: 'rgba(255, 210, 160, 0.25)',
    cardBg: 'rgba(255, 255, 255, 0.92)', cardBorder: 'rgba(232, 201, 160, 0.4)',
    accent: '#D4A84A', accentLight: 'rgba(212, 168, 74, 0.12)',
    text: '#4A3D32', textMuted: '#8B7355', textLight: '#A89880',
    inputBg: '#FEFCFA', inputBorder: 'rgba(212, 168, 74, 0.3)',
    success: '#7A9B6D', successLight: 'rgba(122, 155, 109, 0.15)',
    brand: '#1a3a5c',
    categoryResearch: '#6B8CAE', categoryCaregiving: '#7A9B6D',
    categorySelfCare: '#B8860B', categoryCommunity: '#9B7A9B', categoryClinical: '#C47A7A',
  };

  const categories = [
    { id: 'all', label: 'All', icon: '📚', color: colors.accent },
    { id: 'research', label: 'Research', icon: '🔬', color: colors.categoryResearch },
    { id: 'caregiving', label: 'Techniques', icon: '💝', color: colors.categoryCaregiving },
    { id: 'selfcare', label: 'Self-Care', icon: '🧘', color: colors.categorySelfCare },
    { id: 'clinical', label: 'Clinical', icon: '💊', color: colors.categoryClinical },
    { id: 'community', label: 'Community', icon: '👥', color: colors.categoryCommunity },
  ];

  const quickGuides = [
    { id: 'g1', title: '5 Ways to Reduce Agitation', icon: '😌', readTime: '3 min' },
    { id: 'g2', title: 'Handling Sundowning', icon: '🌅', readTime: '5 min' },
    { id: 'g3', title: 'Better Sleep Guide', icon: '😴', readTime: '4 min' },
    { id: 'g4', title: 'Signs of Progress', icon: '📈', readTime: '3 min' },
    { id: 'g5', title: 'Communication Tips', icon: '💬', readTime: '4 min' },
  ];

  const articles = [
    { id: 1, category: 'research', title: 'Breakthrough in Non-Invasive Memory Stimulation', summary: 'New study shows promising results using 40Hz gamma frequency light and sound therapy.', date: 'Nov 28, 2025', readTime: '8 min' },
    { id: 2, category: 'caregiving', title: 'The Power of Personalized Music Therapy', summary: 'How curated playlists from a patient\'s youth can reduce agitation.', date: 'Nov 25, 2025', readTime: '6 min' },
    { id: 3, category: 'clinical', title: 'Phase 3 Trial Results for Leqembi', summary: 'Detailed analysis of the latest clinical data on the new antibody treatment.', date: 'Nov 20, 2025', readTime: '12 min' },
    { id: 4, category: 'selfcare', title: 'Preventing Caregiver Burnout', summary: 'Recognizing the signs early and building sustainable self-care routines.', date: 'Nov 18, 2025', readTime: '7 min' },
    { id: 5, category: 'community', title: 'Finding Your Support Network', summary: 'How to connect with other caregivers who understand your journey.', date: 'Nov 15, 2025', readTime: '5 min' },
    { id: 6, category: 'research', title: 'Sleep Disruption and Cognitive Decline', summary: 'New research links poor sleep quality to accelerated disease progression.', date: 'Nov 12, 2025', readTime: '9 min' },
  ];

  const videos = [
    { id: 'v1', title: 'Validation Therapy Basics', duration: '3:42', views: '2.4k' },
    { id: 'v2', title: 'Redirecting Difficult Moments', duration: '5:10', views: '1.8k' },
    { id: 'v3', title: 'Creating a Calm Environment', duration: '2:58', views: '3.1k' },
    { id: 'v4', title: 'Understanding Aggression', duration: '4:22', views: '1.2k' },
  ];

  const communityQuestions = [
    { id: 'q1', question: 'How do I handle it when mom doesn\'t recognize me?', answeredBy: 'Dr. Sarah Chen', responses: 24, helpful: 142 },
    { id: 'q2', question: 'What activities work best for late-stage dementia?', answeredBy: 'Nurse Patricia Williams', responses: 18, helpful: 98 },
  ];

  const resources = [
    { id: 'r1', title: 'Daily Routine Template', type: 'PDF', icon: '📋', downloads: 1243 },
    { id: 'r2', title: 'Emergency Contact Sheet', type: 'PDF', icon: '🚨', downloads: 892 },
    { id: 'r3', title: 'Care Plan Builder', type: 'Interactive', icon: '📝', downloads: 2105 },
    { id: 'r4', title: 'Medication Tracker', type: 'PDF', icon: '💊', downloads: 756 },
  ];

  const getCategoryColor = (cat: string) => categories.find(c => c.id === cat)?.color || colors.accent;
  const getCategoryLabel = (cat: string) => categories.find(c => c.id === cat)?.label || cat;
  const toggleSave = (id: number) => setSavedArticles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const Card = ({ children, style = {}, hover = false }: { children: React.ReactNode; style?: React.CSSProperties; hover?: boolean }) => (
    <div style={{ background: colors.cardBg, borderRadius: '16px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 4px 20px rgba(139, 115, 85, 0.06)', cursor: hover ? 'pointer' : 'default', transition: 'transform 0.2s ease', ...style }}>{children}</div>
  );

  const SectionHeader = ({ icon, title, action }: { icon: string; title: string; action?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: '10px' }}><span>{icon}</span> {title}</h2>
      {action && <button style={{ background: 'transparent', border: 'none', color: colors.accent, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>{action} →</button>}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 20% 10%, ${colors.warmGlow} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />

      {/* Search Bar */}
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 40px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder="Search articles, guides, videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '320px', padding: '12px 20px 12px 44px', borderRadius: '12px', border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.text, fontSize: '0.95rem', outline: 'none' }} />
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>🔍</span>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.text, fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
          🔖 Saved <span style={{ background: colors.accent, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>{savedArticles.length}</span>
        </button>
      </div>

      {/* Hero Section */}
      <section style={{ position: 'relative', zIndex: 1, padding: '32px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 300, margin: '0 0 12px', color: colors.text }}>The Science of Care</h1>
        <p style={{ fontSize: '1.15rem', color: colors.textMuted, margin: '0 0 32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>Research, guidance, and hope for your caregiving journey</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '10px 20px', borderRadius: '25px', border: activeCategory === cat.id ? 'none' : `1px solid ${colors.cardBorder}`, background: activeCategory === cat.id ? colors.accent : colors.cardBg, color: activeCategory === cat.id ? '#fff' : colors.text, fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </section>

      <main style={{ position: 'relative', zIndex: 1, padding: '0 40px 60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Featured */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="⭐" title="Featured" />
            <Card hover>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '280px' }}>
                <div style={{ background: `linear-gradient(135deg, ${colors.brand} 0%, #2a4a6c 100%)`, borderRadius: '16px 0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><span style={{ fontSize: '2rem', marginLeft: '4px' }}>▶</span></div>
                  <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>12:34</div>
                </div>
                <div style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: `${colors.categoryResearch}20`, color: colors.categoryResearch, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Research</span>
                    <span style={{ color: colors.textLight, fontSize: '0.85rem' }}>Dec 15, 2025</span>
                  </div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>Understanding Sundowning: New Research Offers Hope</h3>
                  <p style={{ margin: '0 0 24px', color: colors.textMuted, fontSize: '1rem', lineHeight: 1.6 }}>Dr. Fanny Elahi explains the biological mechanisms behind evening agitation and emerging interventions.</p>
                  <button style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: colors.accent, color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>Watch Now →</button>
                </div>
              </div>
            </Card>
          </section>

          {/* Quick Guides */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="⚡" title="Quick Guides" action="View All" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {quickGuides.map((guide) => (
                <Card key={guide.id} hover><div style={{ padding: '24px 20px', textAlign: 'center' }}><div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{guide.icon}</div><h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 600, color: colors.text, lineHeight: 1.4 }}>{guide.title}</h4><span style={{ fontSize: '0.8rem', color: colors.textLight }}>{guide.readTime} read</span></div></Card>
              ))}
            </div>
          </section>

          {/* Articles */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="📰" title="Latest Articles" action="View All" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {articles.map((article) => (
                <Card key={article.id} hover>
                  <div style={{ height: '160px', background: `linear-gradient(135deg, ${getCategoryColor(article.category)}40 0%, ${getCategoryColor(article.category)}20 100%)`, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '3rem', opacity: 0.5 }}>{categories.find(c => c.id === article.category)?.icon || '📄'}</span>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '10px', background: `${getCategoryColor(article.category)}20`, color: getCategoryColor(article.category), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{getCategoryLabel(article.category)}</span>
                      <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>{article.date}</span>
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: colors.text, lineHeight: 1.4 }}>{article.title}</h4>
                    <p style={{ margin: '0 0 16px', color: colors.textMuted, fontSize: '0.9rem', lineHeight: 1.5 }}>{article.summary}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: colors.textLight }}>{article.readTime} read</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleSave(article.id); }} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: savedArticles.includes(article.id) ? 1 : 0.4 }}>🔖</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Videos */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="🎬" title="Video Library" action="View All" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {videos.map((video) => (
                <Card key={video.id} hover>
                  <div style={{ height: '120px', background: `linear-gradient(135deg, ${colors.brand} 0%, #2a4a6c 100%)`, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '1.2rem', marginLeft: '2px' }}>▶</span></div>
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{video.duration}</div>
                  </div>
                  <div style={{ padding: '16px' }}><h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 600, color: colors.text }}>{video.title}</h4><span style={{ fontSize: '0.8rem', color: colors.textLight }}>{video.views} views</span></div>
                </Card>
              ))}
            </div>
          </section>

          {/* Community Q&A */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="💬" title="Community Q&A" action="Ask a Question" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {communityQuestions.map((q) => (
                <Card key={q.id} hover><div style={{ padding: '24px' }}><h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: colors.text }}>Q: &quot;{q.question}&quot;</h4><div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: colors.textMuted, fontSize: '0.9rem' }}><span>Answered by <strong style={{ color: colors.text }}>{q.answeredBy}</strong></span><span>💬 {q.responses} responses</span><span>👍 {q.helpful} found helpful</span></div></div></Card>
              ))}
            </div>
          </section>

          {/* Resources */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader icon="📥" title="Downloadable Resources" action="View All" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {resources.map((resource) => (
                <Card key={resource.id} hover><div style={{ padding: '24px', textAlign: 'center' }}><div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{resource.icon}</div><h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600, color: colors.text }}>{resource.title}</h4><p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: colors.textLight }}>{resource.type} • {resource.downloads.toLocaleString()} downloads</p><button style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>↓ Download</button></div></Card>
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section>
            <Card>
              <div style={{ padding: '48px', textAlign: 'center', background: `linear-gradient(135deg, ${colors.accentLight} 0%, transparent 100%)`, borderRadius: '16px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📬</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>Stay Updated</h3>
                <p style={{ margin: '0 0 24px', color: colors.textMuted, fontSize: '1rem' }}>Get the latest research and caregiving tips delivered weekly</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '480px', margin: '0 auto' }}>
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', border: `1px solid ${colors.inputBorder}`, background: '#fff', color: colors.text, fontSize: '1rem', outline: 'none' }} />
                  <button style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: colors.accent, color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Subscribe</button>
                </div>
              </div>
            </Card>
          </section>

        </div>
      </main>
    </div>
  );
}
