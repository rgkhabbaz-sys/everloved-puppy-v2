/**
 * EverLoved - StageClassifier Component
 * Maps to Global Deterioration Scale (GDS) for clinical accuracy.
 */

'use client';

import React, { useState } from 'react';
import { Sprout, Heart, Moon, Target, Calendar, Stethoscope, Check, ChevronRight, Loader2 } from 'lucide-react';

const STAGES = {
  early: {
    id: 'early',
    title: 'Early Stage',
    subtitle: 'Mild Cognitive Decline',
    gds: 'GDS 3-4',
    icon: Sprout,
    color: {
      bg: 'bg-teal-50', bgActive: 'bg-teal-100', border: 'border-teal-200',
      borderActive: 'border-teal-500', text: 'text-teal-700', icon: 'text-teal-600',
      accent: 'bg-teal-500', ring: 'ring-teal-400',
    },
    intervention: {
      primaryGoal: 'Maintaining Independence',
      primaryDetail: 'Support cognitive function while preserving autonomy.',
      dailyFocus: 'Cognitive Engagement',
      dailyItems: ['Memory exercises', 'Structured routines', 'Social activities', 'Medication reminders'],
      clinicalNote: 'GDS 3-4: Patient retains awareness of deficits. MMSE typically 18-26. Focus on compensatory strategies.',
    }
  },
  middle: {
    id: 'middle',
    title: 'Middle Stage',
    subtitle: 'Moderate Cognitive Decline',
    gds: 'GDS 5-6',
    icon: Heart,
    color: {
      bg: 'bg-amber-50', bgActive: 'bg-amber-100', border: 'border-amber-200',
      borderActive: 'border-amber-500', text: 'text-amber-700', icon: 'text-amber-600',
      accent: 'bg-amber-500', ring: 'ring-amber-400',
    },
    intervention: {
      primaryGoal: 'Safety & Emotional Support',
      primaryDetail: 'Balance safety with dignity. Increase supervision while reducing anxiety.',
      dailyFocus: 'Safety & Comfort',
      dailyItems: ['Wandering prevention', 'Simplified choices', 'Sundowning protocols', 'Activity engagement'],
      clinicalNote: 'GDS 5-6: Requires ADL assistance. MMSE typically 10-18. BPSD common. Implement sundowning protocols.',
    }
  },
  late: {
    id: 'late',
    title: 'Late Stage',
    subtitle: 'Severe Cognitive Decline',
    gds: 'GDS 7',
    icon: Moon,
    color: {
      bg: 'bg-indigo-50', bgActive: 'bg-indigo-100', border: 'border-indigo-200',
      borderActive: 'border-indigo-500', text: 'text-indigo-700', icon: 'text-indigo-600',
      accent: 'bg-indigo-500', ring: 'ring-indigo-400',
    },
    intervention: {
      primaryGoal: 'Sensory Comfort & Presence',
      primaryDetail: 'Prioritize physical comfort and peaceful presence.',
      dailyFocus: 'Comfort & Connection',
      dailyItems: ['Gentle touch', 'Music therapy', 'Familiar voices', 'Comfort positioning'],
      clinicalNote: 'GDS 7: Minimal verbal communication. MMSE typically <10. Focus on comfort care.',
    }
  }
};

type StageKey = 'early' | 'middle' | 'late';

export default function StageClassifier() {
  const [selectedStage, setSelectedStage] = useState<StageKey>('middle');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [savedStage, setSavedStage] = useState<StageKey>('middle');

  const stage = STAGES[selectedStage];
  const hasChanges = selectedStage !== savedStage;

  const handleConfirm = async () => {
    setConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSavedStage(selectedStage);
    setConfirming(false);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Disease Stage Classification</h1>
          <p className="text-slate-600 text-lg">Select the current stage to adjust care protocols</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" role="radiogroup" aria-label="Select disease stage">
          {(Object.keys(STAGES) as StageKey[]).map((key) => {
            const s = STAGES[key];
            const Icon = s.icon;
            const isSelected = selectedStage === key;
            return (
              <button key={key} onClick={() => setSelectedStage(key)} role="radio" aria-checked={isSelected}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${s.color.ring}
                  ${isSelected ? `${s.color.bgActive} ${s.color.borderActive} shadow-lg` : `${s.color.bg} ${s.color.border} hover:shadow-md`}`}>
                {isSelected && (
                  <div className={`absolute top-3 right-3 w-7 h-7 rounded-full ${s.color.accent} flex items-center justify-center`}>
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                )}
                <div className={`w-14 h-14 rounded-xl ${s.color.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 ${s.color.icon}`} />
                </div>
                <h3 className={`text-xl font-bold ${s.color.text} mb-1`}>{s.title}</h3>
                <p className="text-slate-600 text-sm mb-2">{s.subtitle}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${s.color.bg} ${s.color.text}`}>{s.gds}</span>
              </button>
            );
          })}
        </div>

        <div className={`rounded-2xl border-2 ${stage.color.border} ${stage.color.bg} p-6 md:p-8`}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div className={`w-10 h-10 rounded-lg ${stage.color.accent} flex items-center justify-center`}>
              <stage.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{stage.title} Care Protocol</h2>
              <p className="text-slate-500 text-sm">Intervention summary for {stage.gds}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-xl ${stage.color.bgActive} flex items-center justify-center flex-shrink-0`}>
                <Target className={`w-6 h-6 ${stage.color.icon}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">Primary Goal: <span className={stage.color.text}>{stage.intervention.primaryGoal}</span></h3>
                <p className="text-slate-600 mt-1">{stage.intervention.primaryDetail}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-xl ${stage.color.bgActive} flex items-center justify-center flex-shrink-0`}>
                <Calendar className={`w-6 h-6 ${stage.color.icon}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">Daily Focus: <span className={stage.color.text}>{stage.intervention.dailyFocus}</span></h3>
                <ul className="mt-2 grid grid-cols-2 gap-2">
                  {stage.intervention.dailyItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-600">
                      <div className={`w-1.5 h-1.5 rounded-full ${stage.color.accent}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-xl ${stage.color.bgActive} flex items-center justify-center flex-shrink-0`}>
                <Stethoscope className={`w-6 h-6 ${stage.color.icon}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg mb-2">Clinical Note</h3>
                <div className="bg-white/60 rounded-xl p-4 border border-slate-200">
                  <p className="text-slate-700 text-sm font-mono">{stage.intervention.clinicalNote}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              {hasChanges ? 'Stage changed — confirm to update' : confirmed ? '✓ Updated successfully' : 'Current stage saved'}
            </p>
            <button onClick={handleConfirm} disabled={!hasChanges || confirming}
              className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2
                ${hasChanges ? `${stage.color.accent} hover:opacity-90 shadow-lg` : 'bg-slate-300 cursor-not-allowed'}
                ${confirmed ? 'bg-green-500' : ''}`}>
              {confirming ? <><Loader2 className="w-5 h-5 animate-spin" />Updating...</> 
                : confirmed ? <><Check className="w-5 h-5" />Updated!</> 
                : <>Confirm Update<ChevronRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
