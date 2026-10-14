'use client';

import React, { useState, useEffect } from 'react';
import type { WorkoutPlanItem, WorkoutDay, WorkoutExercise, Member } from '@/types';
import { getWorkoutPlans, saveWorkoutPlan, deleteWorkoutPlan } from '@/actions/workout-plans';

interface WorkoutPlansViewProps {
  gymName: string;
  members: Member[];
}

export const WorkoutPlansView: React.FC<WorkoutPlansViewProps> = ({ gymName, members }) => {
  const [plans, setPlans] = useState<WorkoutPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Editing state
  const [editingPlan, setEditingPlan] = useState<WorkoutPlanItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Assign / WhatsApp modal
  const [sharingPlan, setSharingPlan] = useState<WorkoutPlanItem | null>(null);
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await getWorkoutPlans().catch(() => []);
    setPlans(data);
    if (data.length > 0 && !selectedPlanId) {
      setSelectedPlanId(data[0].id);
    }
    setLoading(false);
  };

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Handle Save (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setSaving(true);
    const res = await saveWorkoutPlan(editingPlan);
    setSaving(false);

    if (!res.ok || !res.plan) {
      showToast(res.error || 'Failed to save workout plan');
      return;
    }

    if (editingPlan.id) {
      setPlans((prev) => prev.map((p) => (p.id === res.plan!.id ? res.plan! : p)));
      showToast('✅ Workout plan updated successfully!');
    } else {
      setPlans((prev) => [...prev, res.plan!]);
      setSelectedPlanId(res.plan.id);
      showToast('✅ New workout plan created!');
    }
    setEditingPlan(null);
  };

  const handleDeletePlan = async (id: string, title: string) => {
    if (!window.confirm(`Delete workout routine "${title}"?`)) return;
    const res = await deleteWorkoutPlan(id);
    if (res.ok) {
      const remaining = plans.filter((p) => p.id !== id);
      setPlans(remaining);
      if (selectedPlanId === id) {
        setSelectedPlanId(remaining[0]?.id || '');
      }
      showToast('Workout plan removed.');
    } else {
      showToast(res.error || 'Failed to delete');
    }
  };

  // Helper for editing plan days
  const handleAddDay = () => {
    if (!editingPlan) return;
    const newDay: WorkoutDay = {
      id: `day_${Date.now()}`,
      dayName: `Day ${editingPlan.days.length + 1}: Muscle Group`,
      targetMuscles: 'Target Muscles',
      exercises: [
        {
          id: `ex_${Date.now()}`,
          name: 'Exercise 1',
          sets: 3,
          reps: '10-12',
          restSec: 60,
          notes: 'Focus on full range of motion.',
        },
      ],
    };
    setEditingPlan({ ...editingPlan, days: [...editingPlan.days, newDay] });
  };

  const handleRemoveDay = (dayIndex: number) => {
    if (!editingPlan) return;
    const updated = [...editingPlan.days];
    updated.splice(dayIndex, 1);
    setEditingPlan({ ...editingPlan, days: updated });
  };

  const handleAddExercise = (dayIndex: number) => {
    if (!editingPlan) return;
    const updatedDays = [...editingPlan.days];
    const newEx: WorkoutExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Exercise',
      sets: 3,
      reps: '10-12',
      restSec: 60,
      notes: '',
    };
    updatedDays[dayIndex].exercises.push(newEx);
    setEditingPlan({ ...editingPlan, days: updatedDays });
  };

  const handleRemoveExercise = (dayIndex: number, exIndex: number) => {
    if (!editingPlan) return;
    const updatedDays = [...editingPlan.days];
    updatedDays[dayIndex].exercises.splice(exIndex, 1);
    setEditingPlan({ ...editingPlan, days: updatedDays });
  };

  // Share on WhatsApp
  const handleSendWhatsApp = (plan: WorkoutPlanItem) => {
    let phone = customPhone.trim().replace(/\D/g, '');
    let memberName = 'Member';

    if (targetMemberId) {
      const found = members.find((m) => m.id === targetMemberId);
      if (found) {
        memberName = found.name;
        phone = (found.phone || '').replace(/\D/g, '');
      }
    }

    let routineText = `🏋️‍♂️ *${gymName.toUpperCase()} - PERSONALIZED WORKOUT PLAN*\n` +
      `-------------------------------------------\n` +
      `👤 *Member:* ${memberName}\n` +
      `📋 *Routine:* ${plan.title}\n` +
      `🎯 *Goal:* ${plan.goal} | *Level:* ${plan.difficulty}\n` +
      `📅 *Schedule:* ${plan.daysPerWeek} Days / Week\n` +
      `-------------------------------------------\n\n`;

    plan.days.forEach((day, dIdx) => {
      routineText += `📌 *${day.dayName}*\n`;
      routineText += `Target: ${day.targetMuscles}\n`;
      day.exercises.forEach((ex, eIdx) => {
        routineText += `  ${eIdx + 1}. *${ex.name}* — ${ex.sets} sets x ${ex.reps} reps (Rest: ${ex.restSec}s)${ex.notes ? `\n     💡 _Tip: ${ex.notes}_` : ''}\n`;
      });
      routineText += `\n`;
    });

    routineText += `🔥 *Gym Coach Tips:* Stay hydrated, warm up with 5 mins of mobility, and track your weights progressively! Have a beast workout! 💪\n`;

    const url = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone.slice(-10))}&text=${encodeURIComponent(routineText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(routineText)}`;

    window.open(url, '_blank');
    setSharingPlan(null);
    showToast('WhatsApp routine opened!');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-surface-container-highest border border-secondary/40 text-on-surface shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">fitness_center</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Workout Plans &amp; Routines</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Create, edit, and assign custom workout splits and exercises for gym members with 1-tap WhatsApp sharing.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingPlan({
              id: '',
              title: 'Custom Split Routine',
              description: 'Targeted strength and muscle development routine.',
              difficulty: 'Intermediate',
              daysPerWeek: 4,
              goal: 'Muscle Hypertrophy',
              days: [
                {
                  id: 'd-1',
                  dayName: 'Day 1: Upper Body Push',
                  targetMuscles: 'Chest, Shoulders, Triceps',
                  exercises: [
                    { id: 'e-1', name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', restSec: 90, notes: 'Touch chest gently' },
                    { id: 'e-2', name: 'Overhead Dumbbell Press', sets: 3, reps: '10-12', restSec: 75, notes: 'Keep core tight' },
                    { id: 'e-3', name: 'Rope Tricep Extension', sets: 3, reps: '12-15', restSec: 60, notes: 'Full lock at bottom' },
                  ],
                },
              ],
            })
          }
          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>+ Create New Routine</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-outline text-xs">Loading workout plans...</div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-container-low border border-surface-container-high">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">exercise</span>
          <p className="text-sm font-semibold text-on-surface">No workout plans created yet.</p>
          <p className="text-xs text-outline mt-1">Click &quot;+ Create New Routine&quot; to design the first workout plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Plan Selector Tabs (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="font-sans text-xs uppercase font-bold tracking-wider text-outline px-1">
              Workout Routine Library ({plans.length})
            </h2>

            <div className="flex flex-col gap-2.5">
              {plans.map((p) => {
                const isSelected = p.id === (activePlan?.id ?? '');
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-surface-container border-secondary/60 shadow-md ring-1 ring-secondary/30'
                        : 'bg-surface-container-low border-surface-container-high hover:border-secondary/40 hover:bg-surface-container/60'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                        {p.goal}
                      </span>
                      <span className="text-[10px] font-bold text-outline">
                        {p.daysPerWeek} Days / Week
                      </span>
                    </div>

                    <h3 className="font-sora text-sm font-bold text-on-surface">{p.title}</h3>
                    <p className="text-[11px] text-outline line-clamp-2 mt-1 leading-relaxed">
                      {p.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-container-high text-[11px]">
                      <span className="text-outline">
                        {p.days.length} Workout {p.days.length === 1 ? 'Day' : 'Days'}
                      </span>
                      <span className="font-bold text-tertiary">
                        {p.difficulty}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Routine View (8 cols) */}
          {activePlan && (
            <div className="lg:col-span-8 bg-surface-container-low rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-5 shadow-sm">
              {/* Routine Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-high">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-secondary bg-secondary/15 px-2.5 py-0.5 rounded-full border border-secondary/30">
                      {activePlan.difficulty}
                    </span>
                    <span className="text-xs font-bold text-tertiary bg-tertiary/15 px-2.5 py-0.5 rounded-full border border-tertiary/30">
                      {activePlan.goal}
                    </span>
                  </div>
                  <h2 className="font-sora text-lg sm:text-xl font-bold text-on-surface mt-2">{activePlan.title}</h2>
                  <p className="text-xs text-outline mt-1">{activePlan.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSharingPlan(activePlan);
                      setTargetMemberId(members[0]?.id || '');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    <span>Send on WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPlan(JSON.parse(JSON.stringify(activePlan)))}
                    className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    <span>Edit Routine</span>
                  </button>
                </div>
              </div>

              {/* Days & Exercises Accordion/List */}
              <div className="space-y-4">
                {activePlan.days.map((day, dIdx) => (
                  <div
                    key={day.id || dIdx}
                    className="rounded-xl bg-surface-container-lowest border border-surface-container-high overflow-hidden"
                  >
                    <div className="p-3.5 bg-surface-container/60 border-b border-surface-container-high flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-secondary/20 text-secondary font-bold text-xs flex items-center justify-center">
                          {dIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-sora text-xs sm:text-sm font-bold text-on-surface">{day.dayName}</h4>
                          <p className="text-[10px] text-outline">Target: {day.targetMuscles}</p>
                        </div>
                      </div>
                      <span className="text-xs text-outline font-bold">
                        {day.exercises.length} Exercises
                      </span>
                    </div>

                    <div className="divide-y divide-surface-container-high text-xs">
                      {day.exercises.map((ex, eIdx) => (
                        <div
                          key={ex.id || eIdx}
                          className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-container/20 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-outline">#{eIdx + 1}</span>
                              <p className="font-semibold text-on-surface">{ex.name}</p>
                            </div>
                            {ex.notes && (
                              <p className="text-[11px] text-outline mt-0.5 pl-5">
                                💡 {ex.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 pl-5 sm:pl-0 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-surface-container font-mono font-bold text-secondary">
                              {ex.sets} Sets × {ex.reps}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-outline">
                              ⏱ {ex.restSec}s rest
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Workout Routine Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSavePlan}
            className="w-full max-w-3xl my-8 bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-xs max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">edit_note</span>
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  {editingPlan.id ? 'Edit Workout Routine' : 'Create New Workout Routine'}
                </h3>
              </div>
              <button type="button" onClick={() => setEditingPlan(null)} className="text-outline hover:text-on-surface p-1">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Meta details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-outline mb-1">Routine Title *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.title}
                    onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })}
                    placeholder="e.g. 5-Day Push/Pull/Legs Hypertrophy"
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-outline mb-1">Target Fitness Goal</label>
                  <select
                    value={editingPlan.goal}
                    onChange={(e) => setEditingPlan({ ...editingPlan, goal: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  >
                    <option value="Muscle Hypertrophy">Muscle Hypertrophy</option>
                    <option value="Fat Loss & Conditioning">Fat Loss &amp; Conditioning</option>
                    <option value="Strength & Power">Strength &amp; Power</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-outline mb-1">Difficulty Level</label>
                  <select
                    value={editingPlan.difficulty}
                    onChange={(e) => setEditingPlan({ ...editingPlan, difficulty: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-outline mb-1">Days Per Week</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={editingPlan.daysPerWeek}
                    onChange={(e) => setEditingPlan({ ...editingPlan, daysPerWeek: Number(e.target.value) })}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-outline mb-1">Description / Overview</label>
                  <textarea
                    rows={2}
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    placeholder="Brief description of the training frequency and methodology..."
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Days & Exercises Builder */}
              <div className="pt-3 border-t border-surface-container-high space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-sora text-xs uppercase font-bold tracking-wider text-secondary">
                    Workout Days &amp; Exercises
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>+ Add Day</span>
                  </button>
                </div>

                {editingPlan.days.map((day, dIdx) => (
                  <div
                    key={day.id || dIdx}
                    className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={day.dayName}
                        onChange={(e) => {
                          const updated = [...editingPlan.days];
                          updated[dIdx].dayName = e.target.value;
                          setEditingPlan({ ...editingPlan, days: updated });
                        }}
                        placeholder="e.g. Day 1: Chest & Triceps"
                        className="flex-1 font-sora font-bold text-xs bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none"
                      />

                      <input
                        type="text"
                        value={day.targetMuscles}
                        onChange={(e) => {
                          const updated = [...editingPlan.days];
                          updated[dIdx].targetMuscles = e.target.value;
                          setEditingPlan({ ...editingPlan, days: updated });
                        }}
                        placeholder="Target: Chest, Triceps"
                        className="flex-1 text-xs bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveDay(dIdx)}
                        className="p-1.5 text-error hover:bg-error/15 rounded-lg transition-colors cursor-pointer"
                        title="Remove Day"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>

                    {/* Exercise list inside day */}
                    <div className="space-y-2 pt-1">
                      {day.exercises.map((ex, eIdx) => (
                        <div
                          key={ex.id || eIdx}
                          className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high items-center"
                        >
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                updated[dIdx].exercises[eIdx].name = e.target.value;
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              placeholder="Exercise Name"
                              className="w-full text-xs font-semibold bg-transparent text-on-surface focus:outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min={1}
                              value={ex.sets}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                updated[dIdx].exercises[eIdx].sets = Number(e.target.value);
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              placeholder="Sets"
                              className="w-full text-xs bg-surface-container border border-surface-container-high rounded px-1.5 py-1 text-on-surface text-center focus:outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                updated[dIdx].exercises[eIdx].reps = e.target.value;
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              placeholder="Reps (8-12)"
                              className="w-full text-xs bg-surface-container border border-surface-container-high rounded px-1.5 py-1 text-on-surface text-center focus:outline-none"
                            />
                          </div>

                          <div className="col-span-3">
                            <input
                              type="text"
                              value={ex.notes || ''}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                updated[dIdx].exercises[eIdx].notes = e.target.value;
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              placeholder="Form notes / cues"
                              className="w-full text-[11px] bg-transparent text-outline focus:outline-none"
                            />
                          </div>

                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(dIdx, eIdx)}
                              className="text-outline hover:text-error p-1"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddExercise(dIdx)}
                        className="text-xs text-secondary hover:underline font-bold flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Exercise to {day.dayName}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high shrink-0">
              {editingPlan.id ? (
                <button
                  type="button"
                  onClick={() => handleDeletePlan(editingPlan.id, editingPlan.title)}
                  className="text-error font-bold text-xs hover:underline cursor-pointer"
                >
                  Delete Routine
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-outline hover:text-on-surface font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Routine'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Send Routine via WhatsApp Modal */}
      {sharingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-xl">send</span>
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">Share on WhatsApp</h3>
              </div>
              <button onClick={() => setSharingPlan(null)} className="text-outline hover:text-on-surface p-1">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high">
              <p className="font-sora text-xs font-bold text-on-surface">{sharingPlan.title}</p>
              <p className="text-[11px] text-outline mt-0.5">
                {sharingPlan.days.length} Days Split • {sharingPlan.goal}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-outline mb-1">Select Member</label>
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
              >
                <option value="">-- Choose Member or Enter Custom Phone --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.phone}) - {m.planName}
                  </option>
                ))}
              </select>
            </div>

            {!targetMemberId && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Or Enter 10-Digit Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSharingPlan(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-container-high text-xs font-bold text-outline hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(sharingPlan)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Send WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
