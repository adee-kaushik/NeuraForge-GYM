'use client';

import React, { useState, useEffect } from 'react';
import type { WorkoutPlanItem, WorkoutDay, WorkoutExercise, DietPlanItem, DietMeal, DietMealItem, Member } from '@/types';
import {
  getWorkoutPlans,
  saveWorkoutPlan,
  deleteWorkoutPlan,
  getDietPlans,
  saveDietPlan,
  deleteDietPlan,
  clearAllPrefilledPlans,
  restoreDefaultPlans,
  getWorkoutAndDietPlans,
} from '@/actions/workout-plans';

interface WorkoutPlansViewProps {
  gymName: string;
  members: Member[];
  isOwner?: boolean;
  initialWorkoutPlans?: WorkoutPlanItem[];
  initialDietPlans?: DietPlanItem[];
  onPlansUpdated?: (workouts: WorkoutPlanItem[], diets: DietPlanItem[]) => void;
}

export const WorkoutPlansView: React.FC<WorkoutPlansViewProps> = ({
  gymName,
  members,
  isOwner = true,
  initialWorkoutPlans,
  initialDietPlans,
  onPlansUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  // Workout Plans State
  const [plans, setPlans] = useState<WorkoutPlanItem[]>(initialWorkoutPlans || []);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialWorkoutPlans?.[0]?.id || '');
  const [editingPlan, setEditingPlan] = useState<WorkoutPlanItem | null>(null);

  // Diet Plans State
  const [dietPlans, setDietPlans] = useState<DietPlanItem[]>(initialDietPlans || []);
  const [selectedDietId, setSelectedDietId] = useState<string>(initialDietPlans?.[0]?.id || '');
  const [editingDietPlan, setEditingDietPlan] = useState<DietPlanItem | null>(null);

  const [loading, setLoading] = useState(!initialWorkoutPlans && !initialDietPlans);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Assign / WhatsApp modal
  const [sharingPlan, setSharingPlan] = useState<WorkoutPlanItem | null>(null);
  const [sharingDietPlan, setSharingDietPlan] = useState<DietPlanItem | null>(null);
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (!initialWorkoutPlans || !initialDietPlans) {
      loadAllPlans();
    }
  }, []);

  const loadAllPlans = async () => {
    setLoading(true);
    try {
      const data = await getWorkoutAndDietPlans();
      setPlans(data.workoutPlans);
      if (data.workoutPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(data.workoutPlans[0].id);
      }
      setDietPlans(data.dietPlans);
      if (data.dietPlans.length > 0 && !selectedDietId) {
        setSelectedDietId(data.dietPlans[0].id);
      }
      onPlansUpdated?.(data.workoutPlans, data.dietPlans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeWorkoutPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  const activeDietPlan = dietPlans.find((d) => d.id === selectedDietId) || dietPlans[0] || null;

  // ── Clear All Prefilled Plans Action ──
  const handleClearAllPrefilled = async () => {
    if (!window.confirm(
      '⚠️ Are you sure you want to delete all prefilled workout routines & diet plans?\n\n' +
      'This will give your gym a completely clean slate so you can create your own custom gym plans from scratch. (You can restore defaults anytime if needed).'
    )) {
      return;
    }

    setClearing(true);
    const res = await clearAllPrefilledPlans();
    setClearing(false);

    if (res.ok) {
      setPlans([]);
      setSelectedPlanId('');
      setDietPlans([]);
      setSelectedDietId('');
      onPlansUpdated?.([], []);
      showToast('🗑️ All prefilled plans cleared! Ready for your custom routines.');
    } else {
      showToast(res.error || 'Failed to clear plans');
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore default workout routines and diet templates for your gym?')) return;
    setLoading(true);
    const res = await restoreDefaultPlans();
    setLoading(false);

    if (res.ok && res.workoutPlans && res.dietPlans) {
      setPlans(res.workoutPlans);
      setSelectedPlanId(res.workoutPlans[0]?.id || '');
      setDietPlans(res.dietPlans);
      setSelectedDietId(res.dietPlans[0]?.id || '');
      onPlansUpdated?.(res.workoutPlans, res.dietPlans);
      showToast('✅ Default templates restored!');
    } else {
      showToast(res.error || 'Failed to restore default templates');
    }
  };

  // ── Workout Plans Operations ──
  const handleSaveWorkoutPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setSaving(true);
    const res = await saveWorkoutPlan(editingPlan);
    setSaving(false);

    if (!res.ok || !res.plan) {
      showToast(res.error || 'Failed to save workout plan');
      return;
    }

    let updatedList: WorkoutPlanItem[];
    if (editingPlan.id) {
      updatedList = plans.map((p) => (p.id === res.plan!.id ? res.plan! : p));
      showToast('✅ Workout plan updated successfully!');
    } else {
      updatedList = [...plans, res.plan!];
      setSelectedPlanId(res.plan.id);
      showToast('✅ New workout plan created!');
    }
    setPlans(updatedList);
    onPlansUpdated?.(updatedList, dietPlans);
    setEditingPlan(null);
  };

  const handleDeleteWorkoutPlan = async (id: string, title: string) => {
    if (!window.confirm(`Delete workout routine "${title}"?`)) return;
    const res = await deleteWorkoutPlan(id);
    if (res.ok) {
      const remaining = plans.filter((p) => p.id !== id);
      setPlans(remaining);
      if (selectedPlanId === id) {
        setSelectedPlanId(remaining[0]?.id || '');
      }
      onPlansUpdated?.(remaining, dietPlans);
      showToast('Workout plan removed.');
    } else {
      showToast(res.error || 'Failed to delete');
    }
  };

  const handleAddWorkoutDay = () => {
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

  const handleRemoveWorkoutDay = (dayIndex: number) => {
    if (!editingPlan) return;
    const updated = [...editingPlan.days];
    updated.splice(dayIndex, 1);
    setEditingPlan({ ...editingPlan, days: updated });
  };

  const handleAddExercise = (dayIndex: number) => {
    if (!editingPlan) return;
    const updatedDays = [...editingPlan.days];
    const newEx: WorkoutExercise = {
      id: `ex_${Date.now()}`,
      name: '',
      sets: 3,
      reps: '10-12',
      restSec: 60,
      notes: '',
    };
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      exercises: [...updatedDays[dayIndex].exercises, newEx],
    };
    setEditingPlan({ ...editingPlan, days: updatedDays });
  };

  const handleRemoveExercise = (dayIndex: number, exIndex: number) => {
    if (!editingPlan) return;
    const updatedDays = [...editingPlan.days];
    const updatedEx = [...updatedDays[dayIndex].exercises];
    updatedEx.splice(exIndex, 1);
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], exercises: updatedEx };
    setEditingPlan({ ...editingPlan, days: updatedDays });
  };

  // ── Diet Plans Operations ──
  const handleSaveDietPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDietPlan) return;

    setSaving(true);
    const res = await saveDietPlan(editingDietPlan);
    setSaving(false);

    if (!res.ok || !res.plan) {
      showToast(res.error || 'Failed to save diet plan');
      return;
    }

    let updatedList: DietPlanItem[];
    if (editingDietPlan.id) {
      updatedList = dietPlans.map((d) => (d.id === res.plan!.id ? res.plan! : d));
      showToast('✅ Diet plan updated successfully!');
    } else {
      updatedList = [...dietPlans, res.plan!];
      setSelectedDietId(res.plan.id);
      showToast('✅ New diet plan created!');
    }
    setDietPlans(updatedList);
    onPlansUpdated?.(plans, updatedList);
    setEditingDietPlan(null);
  };

  const handleDeleteDietPlan = async (id: string, title: string) => {
    if (!window.confirm(`Delete diet plan "${title}"?`)) return;
    const res = await deleteDietPlan(id);
    if (res.ok) {
      const remaining = dietPlans.filter((d) => d.id !== id);
      setDietPlans(remaining);
      if (selectedDietId === id) {
        setSelectedDietId(remaining[0]?.id || '');
      }
      onPlansUpdated?.(plans, remaining);
      showToast('Diet plan removed.');
    } else {
      showToast(res.error || 'Failed to delete');
    }
  };

  const handleAddDietMeal = () => {
    if (!editingDietPlan) return;
    const newMeal: DietMeal = {
      id: `meal_${Date.now()}`,
      mealName: `Meal ${editingDietPlan.meals.length + 1}: Healthy Meal`,
      time: '12:00 PM',
      notes: 'Balanced whole food nutrition.',
      items: [
        {
          id: `item_${Date.now()}`,
          name: 'Food item',
          portion: '100g portion',
          calories: 200,
          proteinGrams: 20,
        },
      ],
    };
    setEditingDietPlan({ ...editingDietPlan, meals: [...editingDietPlan.meals, newMeal] });
  };

  const handleRemoveDietMeal = (mealIndex: number) => {
    if (!editingDietPlan) return;
    const updated = [...editingDietPlan.meals];
    updated.splice(mealIndex, 1);
    setEditingDietPlan({ ...editingDietPlan, meals: updated });
  };

  const handleAddDietItem = (mealIndex: number) => {
    if (!editingDietPlan) return;
    const updatedMeals = [...editingDietPlan.meals];
    const newItem: DietMealItem = {
      id: `item_${Date.now()}`,
      name: '',
      portion: '',
      calories: 0,
      proteinGrams: 0,
    };
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      items: [...updatedMeals[mealIndex].items, newItem],
    };
    setEditingDietPlan({ ...editingDietPlan, meals: updatedMeals });
  };

  const handleRemoveDietItem = (mealIndex: number, itemIndex: number) => {
    if (!editingDietPlan) return;
    const updatedMeals = [...editingDietPlan.meals];
    const updatedItems = [...updatedMeals[mealIndex].items];
    updatedItems.splice(itemIndex, 1);
    updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], items: updatedItems };
    setEditingDietPlan({ ...editingDietPlan, meals: updatedMeals });
  };

  // ── WhatsApp Formatters ──
  const formatWorkoutWhatsAppText = (plan: WorkoutPlanItem, memberName?: string) => {
    const greeting = memberName ? `Hi ${memberName}!` : 'Hi!';
    let text = `${greeting} Here is your customized workout routine from *${gymName}*:\n\n`;
    text += `🏋️ *${plan.title}*\n`;
    text += `🎯 Goal: ${plan.goal} | Level: ${plan.difficulty} | ${plan.daysPerWeek} days/week\n`;
    if (plan.description) text += `📝 ${plan.description}\n`;
    text += `\n─────────────────────\n`;

    plan.days.forEach((day, dIdx) => {
      text += `\n📅 *${day.dayName}*\n`;
      text += `🎯 Focus: ${day.targetMuscles}\n`;
      day.exercises.forEach((ex, eIdx) => {
        text += `  ${eIdx + 1}. *${ex.name}* — ${ex.sets} sets × ${ex.reps} (${ex.restSec}s rest)\n`;
        if (ex.notes) text += `     ↳ _${ex.notes}_\n`;
      });
    });

    text += `\n─────────────────────\n`;
    text += `💪 Train hard, stay consistent, and ask the gym floor trainer for any form checks!\n`;
    text += `📍 *${gymName}*`;
    return text;
  };

  const formatDietWhatsAppText = (plan: DietPlanItem, memberName?: string) => {
    const greeting = memberName ? `Hi ${memberName}!` : 'Hi!';
    let text = `${greeting} Here is your customized diet & nutrition plan from *${gymName}*:\n\n`;
    text += `🥗 *${plan.title}*\n`;
    text += `🎯 Goal: ${plan.targetGoal} | 🥬 ${plan.dietaryPreference}\n`;
    text += `📊 *Daily Target:* ${plan.caloriesTarget} kcal | 🍗 ${plan.proteinTarget}g Protein | 💧 ${plan.waterLiters}L Water\n`;
    if (plan.carbsTarget || plan.fatsTarget) {
      text += `🍚 Carbs: ${plan.carbsTarget || 0}g | 🥑 Fats: ${plan.fatsTarget || 0}g\n`;
    }
    if (plan.description) text += `📝 ${plan.description}\n`;
    text += `\n─────────────────────\n`;

    plan.meals.forEach((meal, mIdx) => {
      text += `\n🍽️ *${meal.mealName}*${meal.time ? ` (${meal.time})` : ''}\n`;
      if (meal.notes) text += `  💡 _${meal.notes}_\n`;
      meal.items.forEach((item, iIdx) => {
        text += `  • *${item.name}*: ${item.portion}`;
        if (item.proteinGrams || item.calories) {
          text += ` (${item.proteinGrams || 0}g protein | ${item.calories || 0} kcal)`;
        }
        text += `\n`;
      });
    });

    if (plan.supplementsRecommended && plan.supplementsRecommended.length > 0) {
      text += `\n💊 *Recommended Supplements:* ${plan.supplementsRecommended.join(', ')}\n`;
    }

    text += `\n─────────────────────\n`;
    text += `💧 Remember to hit your ${plan.waterLiters} Liters daily water goal!\n`;
    text += `📍 *${gymName}*`;
    return text;
  };

  const handleSendWorkoutWhatsApp = () => {
    if (!sharingPlan) return;
    let targetPhone = customPhone.trim();
    let memberName = '';
    if (targetMemberId) {
      const member = members.find((m) => m.id === targetMemberId);
      if (member) {
        targetPhone = member.phone;
        memberName = member.name;
      }
    }
    const cleanDigits = targetPhone.replace(/\D/g, '');
    const fullPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const text = formatWorkoutWhatsAppText(sharingPlan, memberName);
    const url = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSharingPlan(null);
    setTargetMemberId('');
    setCustomPhone('');
    showToast('🚀 WhatsApp opened with routine!');
  };

  const handleSendDietWhatsApp = () => {
    if (!sharingDietPlan) return;
    let targetPhone = customPhone.trim();
    let memberName = '';
    if (targetMemberId) {
      const member = members.find((m) => m.id === targetMemberId);
      if (member) {
        targetPhone = member.phone;
        memberName = member.name;
      }
    }
    const cleanDigits = targetPhone.replace(/\D/g, '');
    const fullPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const text = formatDietWhatsAppText(sharingDietPlan, memberName);
    const url = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSharingDietPlan(null);
    setTargetMemberId('');
    setCustomPhone('');
    showToast('🚀 WhatsApp opened with diet plan!');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-surface-container-highest border border-secondary/40 text-on-surface shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
          <span className="text-xs sm:text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">fitness_center</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Workout &amp; Diet Plans</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Build and share customized workout routines and daily nutrition diet charts with your gym members via 1-tap WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Clear All Prefilled Plans Button (Owner only or Staff) */}
          {isOwner && (
            <button
              onClick={handleClearAllPrefilled}
              disabled={clearing || (plans.length === 0 && dietPlans.length === 0)}
              className="px-3 py-1.5 rounded-xl border border-error/30 bg-error/10 hover:bg-error/20 text-error text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete all prefilled default routines and diets to start 100% fresh"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              <span>{clearing ? 'Clearing...' : 'Delete Prefilled Plans'}</span>
            </button>
          )}

          {plans.length === 0 && dietPlans.length === 0 && (
            <button
              onClick={handleRestoreDefaults}
              className="px-3 py-1.5 rounded-xl border border-secondary/40 bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Restore Defaults</span>
            </button>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold shadow-xs">
            <button
              onClick={() => setActiveTab('workout')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'workout'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs font-extrabold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">fitness_center</span>
              <span>Workout Routines ({plans.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'diet'
                  ? 'bg-surface-container-lowest text-tertiary shadow-xs font-extrabold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">restaurant</span>
              <span>Diet &amp; Nutrition ({dietPlans.length})</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-outline gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-secondary">progress_activity</span>
          <span className="text-xs font-semibold">Loading routines and diet plans...</span>
        </div>
      ) : activeTab === 'workout' ? (
        /* ═══════════════════════════════════════════════
           TAB 1: WORKOUT ROUTINES
           ═══════════════════════════════════════════════ */
        plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-low border border-surface-container-high rounded-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">fitness_center</span>
            </div>
            <div>
              <h3 className="font-sora text-lg font-bold text-on-surface">No Workout Routines Yet</h3>
              <p className="text-xs text-outline max-w-md mt-1">
                Your gym has a 100% clean slate! Create your very first personalized workout routine or restore the prefilled templates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setEditingPlan({
                    id: '',
                    title: 'New Custom Workout Routine',
                    description: 'Customized training split for gym members.',
                    difficulty: 'Intermediate',
                    daysPerWeek: 4,
                    goal: 'Muscle Hypertrophy',
                    days: [
                      {
                        id: `day_${Date.now()}`,
                        dayName: 'Day 1: Chest & Triceps',
                        targetMuscles: 'Chest, Triceps',
                        exercises: [
                          { id: `ex_1`, name: 'Bench Press', sets: 4, reps: '8-10', restSec: 90, notes: 'Retract scapula' },
                        ],
                      },
                    ],
                  })
                }
                className="px-4 py-2 rounded-xl bg-secondary text-surface text-xs font-bold hover:bg-secondary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Add Workout Routine</span>
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 border border-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>Restore Templates</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Routines List (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-outline">Available Routines ({plans.length})</span>
                <button
                  onClick={() =>
                    setEditingPlan({
                      id: '',
                      title: 'New Workout Routine',
                      description: 'Custom training routine for gym members.',
                      difficulty: 'Intermediate',
                      daysPerWeek: 4,
                      goal: 'Muscle Hypertrophy',
                      days: [
                        {
                          id: `day_${Date.now()}`,
                          dayName: 'Day 1: Muscle Group',
                          targetMuscles: 'Target Muscles',
                          exercises: [{ id: `ex_${Date.now()}`, name: 'Exercise 1', sets: 3, reps: '10-12', restSec: 60, notes: '' }],
                        },
                      ],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>New Routine</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {plans.map((p) => {
                  const isSelected = p.id === (activeWorkoutPlan?.id || '');
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 text-left ${
                        isSelected
                          ? 'bg-surface-container-lowest border-secondary shadow-md ring-1 ring-secondary/30'
                          : 'bg-surface-container-low border-surface-container-high hover:border-outline/40 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-sora text-sm font-bold text-on-surface line-clamp-1">{p.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-outline border border-surface-container-high shrink-0">
                          {p.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-outline line-clamp-2">{p.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-surface-container-high/40">
                        <span className="flex items-center gap-1 text-secondary font-semibold">
                          <span className="material-symbols-outlined text-xs">calendar_today</span>
                          <span>{p.daysPerWeek} days/wk</span>
                        </span>
                        <span>{p.days.length} split days</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Routine Details & Exercises (8 cols) */}
            {activeWorkoutPlan && (
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-sora text-lg sm:text-xl font-bold text-on-surface">{activeWorkoutPlan.title}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                          {activeWorkoutPlan.goal}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-outline border border-surface-container-high">
                          {activeWorkoutPlan.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-1">{activeWorkoutPlan.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSharingPlan(activeWorkoutPlan)}
                        className="px-3 py-1.5 rounded-xl bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm text-[#25D366]">send</span>
                        <span>WhatsApp Routine</span>
                      </button>
                      <button
                        onClick={() => setEditingPlan(JSON.parse(JSON.stringify(activeWorkoutPlan)))}
                        className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWorkoutPlan(activeWorkoutPlan.id, activeWorkoutPlan.title)}
                        className="p-1.5 rounded-xl hover:bg-error/15 text-outline hover:text-error transition-all cursor-pointer"
                        title="Delete Routine"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Days List */}
                  <div className="space-y-4">
                    {activeWorkoutPlan.days.map((day, dIdx) => (
                      <div key={day.id || dIdx} className="rounded-xl bg-surface-container-lowest border border-surface-container-high p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
                          <div>
                            <span className="font-sora text-sm font-bold text-on-surface">{day.dayName}</span>
                            <p className="text-[11px] text-secondary font-medium">Target: {day.targetMuscles}</p>
                          </div>
                          <span className="text-[11px] text-outline font-semibold">{day.exercises.length} exercises</span>
                        </div>

                        <div className="space-y-2">
                          {day.exercises.map((ex, eIdx) => (
                            <div
                              key={ex.id || eIdx}
                              className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-surface-container-highest text-outline flex items-center justify-center text-[10px] font-bold">
                                  {eIdx + 1}
                                </span>
                                <div>
                                  <span className="font-semibold text-on-surface">{ex.name}</span>
                                  {ex.notes && <p className="text-[10px] text-outline italic">{ex.notes}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-outline text-[11px] shrink-0">
                                <span className="font-semibold text-on-surface">
                                  {ex.sets} sets × {ex.reps} reps
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container">
                                  {ex.restSec}s rest
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ═══════════════════════════════════════════════
           TAB 2: DIET & NUTRITION PLANS
           ═══════════════════════════════════════════════ */
        dietPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-low border border-surface-container-high rounded-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">restaurant</span>
            </div>
            <div>
              <h3 className="font-sora text-lg font-bold text-on-surface">No Diet Plans Yet</h3>
              <p className="text-xs text-outline max-w-md mt-1">
                Both gym owners and trainers can create customized meal routines, calorie targets, and macro charts for members.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setEditingDietPlan({
                    id: '',
                    title: 'Custom High-Protein Diet Plan',
                    description: 'Structured daily meal plan with optimal protein and hydration.',
                    targetGoal: 'Muscle Gain',
                    caloriesTarget: 2500,
                    proteinTarget: 150,
                    carbsTarget: 280,
                    fatsTarget: 65,
                    waterLiters: 4.0,
                    dietaryPreference: 'Non-Vegetarian',
                    supplementsRecommended: ['Whey Protein', 'Creatine Monohydrate', 'Multivitamin'],
                    meals: [
                      {
                        id: `meal_${Date.now()}`,
                        mealName: 'Meal 1: Breakfast',
                        time: '8:00 AM',
                        notes: 'High protein to jumpstart muscle recovery.',
                        items: [
                          { id: 'i1', name: 'Eggs Omelet', portion: '4 whites + 2 whole eggs', calories: 240, proteinGrams: 28 },
                          { id: 'i2', name: 'Oatmeal with Almonds', portion: '50g oats + 10 almonds', calories: 230, proteinGrams: 8 },
                        ],
                      },
                    ],
                  })
                }
                className="px-4 py-2 rounded-xl bg-tertiary text-surface text-xs font-bold hover:bg-tertiary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Create Diet Plan</span>
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 border border-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>Restore Templates</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Diet Plans List (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-outline">Diet &amp; Nutrition ({dietPlans.length})</span>
                <button
                  onClick={() =>
                    setEditingDietPlan({
                      id: '',
                      title: 'New Diet Plan',
                      description: 'Custom meal chart tailored for gym goals.',
                      targetGoal: 'Muscle Gain',
                      caloriesTarget: 2400,
                      proteinTarget: 140,
                      carbsTarget: 240,
                      fatsTarget: 60,
                      waterLiters: 3.5,
                      dietaryPreference: 'Non-Vegetarian',
                      supplementsRecommended: ['Whey Protein'],
                      meals: [
                        {
                          id: `meal_${Date.now()}`,
                          mealName: 'Meal 1: Breakfast',
                          time: '8:30 AM',
                          notes: 'Eat within 1 hour of waking up.',
                          items: [{ id: `item_${Date.now()}`, name: 'Boiled Eggs / Paneer', portion: '4 egg whites or 100g paneer', calories: 200, proteinGrams: 20 }],
                        },
                      ],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>New Diet</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {dietPlans.map((d) => {
                  const isSelected = d.id === (activeDietPlan?.id || '');
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDietId(d.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 text-left ${
                        isSelected
                          ? 'bg-surface-container-lowest border-tertiary shadow-md ring-1 ring-tertiary/30'
                          : 'bg-surface-container-low border-surface-container-high hover:border-outline/40 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-sora text-sm font-bold text-on-surface line-clamp-1">{d.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-outline border border-surface-container-high shrink-0">
                          {d.targetGoal}
                        </span>
                      </div>
                      <p className="text-xs text-outline line-clamp-2">{d.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-surface-container-high/40">
                        <span className="flex items-center gap-1 text-tertiary font-bold">
                          <span className="material-symbols-outlined text-xs">local_fire_department</span>
                          <span>{d.caloriesTarget} kcal</span>
                        </span>
                        <span className="font-semibold text-on-surface">🍗 {d.proteinTarget}g Protein</span>
                        <span>{d.meals.length} meals</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Diet Details & Meal Breakdown (8 cols) */}
            {activeDietPlan && (
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-sora text-lg sm:text-xl font-bold text-on-surface">{activeDietPlan.title}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                          {activeDietPlan.targetGoal}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-outline border border-surface-container-high">
                          {activeDietPlan.dietaryPreference}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-secondary bg-secondary/10 border border-secondary/20 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">water_drop</span>
                          <span>{activeDietPlan.waterLiters}L Water</span>
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-1">{activeDietPlan.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSharingDietPlan(activeDietPlan)}
                        className="px-3 py-1.5 rounded-xl bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm text-[#25D366]">send</span>
                        <span>WhatsApp Diet</span>
                      </button>
                      <button
                        onClick={() => setEditingDietPlan(JSON.parse(JSON.stringify(activeDietPlan)))}
                        className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDietPlan(activeDietPlan.id, activeDietPlan.title)}
                        className="p-1.5 rounded-xl hover:bg-error/15 text-outline hover:text-error transition-all cursor-pointer"
                        title="Delete Diet Plan"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Daily Macro Target Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                      <span className="text-[10px] uppercase font-bold text-outline">Daily Energy</span>
                      <p className="font-sora text-lg font-bold text-tertiary">{activeDietPlan.caloriesTarget} kcal</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                      <span className="text-[10px] uppercase font-bold text-outline">Protein Target</span>
                      <p className="font-sora text-lg font-bold text-secondary">{activeDietPlan.proteinTarget}g</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                      <span className="text-[10px] uppercase font-bold text-outline">Carbohydrates</span>
                      <p className="font-sora text-lg font-bold text-on-surface">{activeDietPlan.carbsTarget || '—'}g</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                      <span className="text-[10px] uppercase font-bold text-outline">Healthy Fats</span>
                      <p className="font-sora text-lg font-bold text-on-surface">{activeDietPlan.fatsTarget || '—'}g</p>
                    </div>
                  </div>

                  {/* Recommended Supplements */}
                  {activeDietPlan.supplementsRecommended && activeDietPlan.supplementsRecommended.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-bold text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-secondary">medication</span>
                        <span>Supplements:</span>
                      </span>
                      {activeDietPlan.supplementsRecommended.map((sup, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[11px] font-semibold border border-surface-container-high">
                          {sup}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meals Breakdown */}
                  <div className="space-y-4">
                    {activeDietPlan.meals.map((meal, mIdx) => (
                      <div key={meal.id || mIdx} className="rounded-xl bg-surface-container-lowest border border-surface-container-high p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
                          <div>
                            <span className="font-sora text-sm font-bold text-on-surface">{meal.mealName}</span>
                            {meal.time && <span className="ml-2 text-xs text-outline font-medium">⏰ {meal.time}</span>}
                          </div>
                          <span className="text-[11px] text-outline font-semibold">{meal.items.length} food items</span>
                        </div>

                        {meal.notes && (
                          <p className="text-[11px] text-secondary/90 italic bg-secondary/5 px-2.5 py-1 rounded-md border border-secondary/15">
                            💡 {meal.notes}
                          </p>
                        )}

                        <div className="space-y-2">
                          {meal.items.map((item, iIdx) => (
                            <div
                              key={item.id || iIdx}
                              className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-surface-container-highest text-outline flex items-center justify-center text-[10px] font-bold">
                                  {iIdx + 1}
                                </span>
                                <div>
                                  <span className="font-semibold text-on-surface">{item.name}</span>
                                  <p className="text-[11px] text-outline">{item.portion}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-outline text-[11px] shrink-0">
                                {item.proteinGrams !== undefined && (
                                  <span className="font-bold text-secondary">{item.proteinGrams}g Protein</span>
                                )}
                                {item.calories !== undefined && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container">
                                    {item.calories} kcal
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════
         MODAL: CREATE / EDIT WORKOUT PLAN
         ═══════════════════════════════════════════════ */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-container-high flex items-center justify-between">
              <div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">
                  {editingPlan.id ? 'Edit Workout Routine' : 'Create New Workout Routine'}
                </h2>
                <p className="text-xs text-outline">Configure weekly training split, muscle targets, and exercise parameters.</p>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveWorkoutPlan} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Routine Title</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.title}
                    onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                    placeholder="e.g. 5-Day Push / Pull / Legs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Goal</label>
                  <select
                    value={editingPlan.goal}
                    onChange={(e) => setEditingPlan({ ...editingPlan, goal: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  >
                    <option value="Muscle Hypertrophy">Muscle Hypertrophy</option>
                    <option value="Fat Loss &amp; Conditioning">Fat Loss &amp; Conditioning</option>
                    <option value="Strength &amp; Power">Strength &amp; Power</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Difficulty</label>
                  <select
                    value={editingPlan.difficulty}
                    onChange={(e) => setEditingPlan({ ...editingPlan, difficulty: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Days Per Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={editingPlan.daysPerWeek}
                    onChange={(e) => setEditingPlan({ ...editingPlan, daysPerWeek: Number(e.target.value) || 4 })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-outline">Description</label>
                <textarea
                  rows={2}
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none"
                  placeholder="Overview of this training routine..."
                />
              </div>

              {/* Days & Exercises Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">Routine Days ({editingPlan.days.length})</span>
                  <button
                    type="button"
                    onClick={handleAddWorkoutDay}
                    className="px-2.5 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Split Day</span>
                  </button>
                </div>

                {editingPlan.days.map((day, dIdx) => (
                  <div key={day.id || dIdx} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          required
                          value={day.dayName}
                          onChange={(e) => {
                            const updated = [...editingPlan.days];
                            updated[dIdx] = { ...updated[dIdx], dayName: e.target.value };
                            setEditingPlan({ ...editingPlan, days: updated });
                          }}
                          className="bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none"
                          placeholder="Day Name (e.g. Day 1: Chest)"
                        />
                        <input
                          type="text"
                          value={day.targetMuscles}
                          onChange={(e) => {
                            const updated = [...editingPlan.days];
                            updated[dIdx] = { ...updated[dIdx], targetMuscles: e.target.value };
                            setEditingPlan({ ...editingPlan, days: updated });
                          }}
                          className="bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none"
                          placeholder="Target Muscles (e.g. Chest, Triceps)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkoutDay(dIdx)}
                        className="text-outline hover:text-error p-1 cursor-pointer"
                        title="Delete Day"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    {/* Exercises */}
                    <div className="space-y-2 pl-2 border-l-2 border-surface-container-highest">
                      {day.exercises.map((ex, eIdx) => (
                        <div key={ex.id || eIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-surface-container-lowest p-2 rounded-lg border border-surface-container-high">
                          <input
                            type="text"
                            required
                            value={ex.name}
                            onChange={(e) => {
                              const updated = [...editingPlan.days];
                              const exList = [...updated[dIdx].exercises];
                              exList[eIdx] = { ...exList[eIdx], name: e.target.value };
                              updated[dIdx] = { ...updated[dIdx], exercises: exList };
                              setEditingPlan({ ...editingPlan, days: updated });
                            }}
                            className="sm:col-span-5 bg-transparent border-0 px-1 py-1 text-xs font-semibold text-on-surface focus:outline-none"
                            placeholder="Exercise Name"
                          />
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-outline">Sets:</span>
                            <input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                const exList = [...updated[dIdx].exercises];
                                exList[eIdx] = { ...exList[eIdx], sets: Number(e.target.value) || 3 };
                                updated[dIdx] = { ...updated[dIdx], exercises: exList };
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              className="w-12 bg-surface-container px-1 py-0.5 rounded text-xs text-center text-on-surface focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-outline">Reps:</span>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                const exList = [...updated[dIdx].exercises];
                                exList[eIdx] = { ...exList[eIdx], reps: e.target.value };
                                updated[dIdx] = { ...updated[dIdx], exercises: exList };
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              className="w-14 bg-surface-container px-1 py-0.5 rounded text-xs text-center text-on-surface focus:outline-none"
                              placeholder="10-12"
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-outline">Rest:</span>
                            <input
                              type="number"
                              min="0"
                              value={ex.restSec}
                              onChange={(e) => {
                                const updated = [...editingPlan.days];
                                const exList = [...updated[dIdx].exercises];
                                exList[eIdx] = { ...exList[eIdx], restSec: Number(e.target.value) || 60 };
                                updated[dIdx] = { ...updated[dIdx], exercises: exList };
                                setEditingPlan({ ...editingPlan, days: updated });
                              }}
                              className="w-12 bg-surface-container px-1 py-0.5 rounded text-xs text-center text-on-surface focus:outline-none"
                            />
                            <span className="text-[10px] text-outline">s</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(dIdx, eIdx)}
                            className="sm:col-span-1 text-outline hover:text-error p-1 justify-self-end cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddExercise(dIdx)}
                        className="px-2 py-1 text-[11px] font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Exercise</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-secondary text-surface text-xs font-bold hover:bg-secondary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>{saving ? 'Saving...' : 'Save Workout Routine'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         MODAL: CREATE / EDIT DIET PLAN
         ═══════════════════════════════════════════════ */}
      {editingDietPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-container-high flex items-center justify-between">
              <div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">
                  {editingDietPlan.id ? 'Edit Diet & Nutrition Plan' : 'Create New Diet & Nutrition Plan'}
                </h2>
                <p className="text-xs text-outline">Configure calorie targets, macros, hydration, and scheduled meal timings.</p>
              </div>
              <button
                onClick={() => setEditingDietPlan(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDietPlan} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Diet Plan Title</label>
                  <input
                    type="text"
                    required
                    value={editingDietPlan.title}
                    onChange={(e) => setEditingDietPlan({ ...editingDietPlan, title: e.target.value })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                    placeholder="e.g. High-Protein Lean Bulk"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Target Goal</label>
                  <select
                    value={editingDietPlan.targetGoal}
                    onChange={(e) => setEditingDietPlan({ ...editingDietPlan, targetGoal: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  >
                    <option value="Muscle Gain">Muscle Gain</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Lean Maintenance">Lean Maintenance</option>
                    <option value="High-Protein Vegetarian">High-Protein Vegetarian</option>
                    <option value="Keto / Low Carb">Keto / Low Carb</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Dietary Preference</label>
                  <select
                    value={editingDietPlan.dietaryPreference}
                    onChange={(e) => setEditingDietPlan({ ...editingDietPlan, dietaryPreference: e.target.value as any })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  >
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Eggetarian">Eggetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline">Daily Water Target (Liters)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={editingDietPlan.waterLiters}
                    onChange={(e) => setEditingDietPlan({ ...editingDietPlan, waterLiters: Number(e.target.value) || 3.5 })}
                    className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Macro Targets */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Daily Macro &amp; Energy Targets</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-outline font-semibold">Calories (kcal)</label>
                    <input
                      type="number"
                      required
                      min="500"
                      max="8000"
                      value={editingDietPlan.caloriesTarget}
                      onChange={(e) => setEditingDietPlan({ ...editingDietPlan, caloriesTarget: Number(e.target.value) || 2000 })}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-tertiary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-outline font-semibold">Protein (grams)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingDietPlan.proteinTarget}
                      onChange={(e) => setEditingDietPlan({ ...editingDietPlan, proteinTarget: Number(e.target.value) || 100 })}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-secondary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-outline font-semibold">Carbs (grams)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingDietPlan.carbsTarget || ''}
                      onChange={(e) => setEditingDietPlan({ ...editingDietPlan, carbsTarget: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-outline font-semibold">Fats (grams)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingDietPlan.fatsTarget || ''}
                      onChange={(e) => setEditingDietPlan({ ...editingDietPlan, fatsTarget: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-outline">Recommended Supplements (comma-separated)</label>
                <input
                  type="text"
                  value={(editingDietPlan.supplementsRecommended || []).join(', ')}
                  onChange={(e) =>
                    setEditingDietPlan({
                      ...editingDietPlan,
                      supplementsRecommended: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none"
                  placeholder="e.g. Whey Protein, Creatine Monohydrate, Fish Oil, Multivitamin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-outline">Description / Plan Instructions</label>
                <textarea
                  rows={2}
                  value={editingDietPlan.description}
                  onChange={(e) => setEditingDietPlan({ ...editingDietPlan, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none"
                  placeholder="Overview and key guidance for the member..."
                />
              </div>

              {/* Meals Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Daily Meals ({editingDietPlan.meals.length})</span>
                  <button
                    type="button"
                    onClick={handleAddDietMeal}
                    className="px-2.5 py-1 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Meal</span>
                  </button>
                </div>

                {editingDietPlan.meals.map((meal, mIdx) => (
                  <div key={meal.id || mIdx} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1">
                        <input
                          type="text"
                          required
                          value={meal.mealName}
                          onChange={(e) => {
                            const updated = [...editingDietPlan.meals];
                            updated[mIdx] = { ...updated[mIdx], mealName: e.target.value };
                            setEditingDietPlan({ ...editingDietPlan, meals: updated });
                          }}
                          className="sm:col-span-7 bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none"
                          placeholder="Meal Title (e.g. Meal 1: Breakfast)"
                        />
                        <input
                          type="text"
                          value={meal.time || ''}
                          onChange={(e) => {
                            const updated = [...editingDietPlan.meals];
                            updated[mIdx] = { ...updated[mIdx], time: e.target.value };
                            setEditingDietPlan({ ...editingDietPlan, meals: updated });
                          }}
                          className="sm:col-span-5 bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none"
                          placeholder="Time (e.g. 8:30 AM)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDietMeal(mIdx)}
                        className="text-outline hover:text-error p-1 cursor-pointer"
                        title="Delete Meal"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={meal.notes || ''}
                      onChange={(e) => {
                        const updated = [...editingDietPlan.meals];
                        updated[mIdx] = { ...updated[mIdx], notes: e.target.value };
                        setEditingDietPlan({ ...editingDietPlan, meals: updated });
                      }}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1 text-xs text-outline italic focus:outline-none"
                      placeholder="Meal instructions / notes (e.g. Drink 500ml water 30 mins before)"
                    />

                    {/* Food Items in Meal */}
                    <div className="space-y-2 pl-2 border-l-2 border-surface-container-highest">
                      {meal.items.map((item, iIdx) => (
                        <div key={item.id || iIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-surface-container-lowest p-2 rounded-lg border border-surface-container-high">
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...editingDietPlan.meals];
                              const itemList = [...updated[mIdx].items];
                              itemList[iIdx] = { ...itemList[iIdx], name: e.target.value };
                              updated[mIdx] = { ...updated[mIdx], items: itemList };
                              setEditingDietPlan({ ...editingDietPlan, meals: updated });
                            }}
                            className="sm:col-span-5 bg-transparent border-0 px-1 py-1 text-xs font-semibold text-on-surface focus:outline-none"
                            placeholder="Food Item (e.g. Whole Eggs)"
                          />
                          <input
                            type="text"
                            value={item.portion}
                            onChange={(e) => {
                              const updated = [...editingDietPlan.meals];
                              const itemList = [...updated[mIdx].items];
                              itemList[iIdx] = { ...itemList[iIdx], portion: e.target.value };
                              updated[mIdx] = { ...updated[mIdx], items: itemList };
                              setEditingDietPlan({ ...editingDietPlan, meals: updated });
                            }}
                            className="sm:col-span-3 bg-surface-container px-2 py-0.5 rounded text-xs text-on-surface focus:outline-none"
                            placeholder="Portion (e.g. 2 whole + 4 whites)"
                          />
                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={item.proteinGrams || ''}
                              onChange={(e) => {
                                const updated = [...editingDietPlan.meals];
                                const itemList = [...updated[mIdx].items];
                                itemList[iIdx] = { ...itemList[iIdx], proteinGrams: e.target.value ? Number(e.target.value) : undefined };
                                updated[mIdx] = { ...updated[mIdx], items: itemList };
                                setEditingDietPlan({ ...editingDietPlan, meals: updated });
                              }}
                              className="w-14 bg-surface-container px-1 py-0.5 rounded text-xs text-center text-secondary font-bold focus:outline-none"
                              placeholder="Prot(g)"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.calories || ''}
                              onChange={(e) => {
                                const updated = [...editingDietPlan.meals];
                                const itemList = [...updated[mIdx].items];
                                itemList[iIdx] = { ...itemList[iIdx], calories: e.target.value ? Number(e.target.value) : undefined };
                                updated[mIdx] = { ...updated[mIdx], items: itemList };
                                setEditingDietPlan({ ...editingDietPlan, meals: updated });
                              }}
                              className="w-14 bg-surface-container px-1 py-0.5 rounded text-xs text-center text-outline focus:outline-none"
                              placeholder="kcal"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDietItem(mIdx, iIdx)}
                            className="sm:col-span-1 text-outline hover:text-error p-1 justify-self-end cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddDietItem(mIdx)}
                        className="px-2 py-1 text-[11px] font-semibold text-tertiary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Food Item</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setEditingDietPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-tertiary text-surface text-xs font-bold hover:bg-tertiary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>{saving ? 'Saving...' : 'Save Diet Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         MODAL: SHARE WORKOUT ROUTINE VIA WHATSAPP
         ═══════════════════════════════════════════════ */}
      {sharingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#25D366] text-2xl">send</span>
                <h3 className="font-sora text-base font-bold text-on-surface">Share Routine via WhatsApp</h3>
              </div>
              <button
                onClick={() => setSharingPlan(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1.5">Select Gym Member</label>
                <select
                  value={targetMemberId}
                  onChange={(e) => {
                    setTargetMemberId(e.target.value);
                    if (e.target.value) setCustomPhone('');
                  }}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2.5 text-on-surface focus:outline-none"
                >
                  <option value="">-- Choose member from list --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone}) — {m.planName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-surface-container-high w-full" />
                <span className="bg-surface-container-lowest px-3 text-[11px] font-bold uppercase tracking-wider text-outline">Or Custom Phone</span>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1.5">Mobile Number (10 Digits)</label>
                <input
                  type="tel"
                  value={customPhone}
                  onChange={(e) => {
                    setCustomPhone(e.target.value);
                    if (e.target.value) setTargetMemberId('');
                  }}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2.5 text-on-surface focus:outline-none"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high text-[11px] text-outline space-y-1">
                <span className="font-bold text-on-surface">Sharing:</span> {sharingPlan.title} ({sharingPlan.days.length} days split)
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button
                onClick={() => setSharingPlan(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWorkoutWhatsApp}
                className="px-5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20ba59] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Send WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         MODAL: SHARE DIET PLAN VIA WHATSAPP
         ═══════════════════════════════════════════════ */}
      {sharingDietPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#25D366] text-2xl">send</span>
                <h3 className="font-sora text-base font-bold text-on-surface">Share Diet Plan via WhatsApp</h3>
              </div>
              <button
                onClick={() => setSharingDietPlan(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1.5">Select Gym Member</label>
                <select
                  value={targetMemberId}
                  onChange={(e) => {
                    setTargetMemberId(e.target.value);
                    if (e.target.value) setCustomPhone('');
                  }}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2.5 text-on-surface focus:outline-none"
                >
                  <option value="">-- Choose member from list --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone}) — {m.planName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-surface-container-high w-full" />
                <span className="bg-surface-container-lowest px-3 text-[11px] font-bold uppercase tracking-wider text-outline">Or Custom Phone</span>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1.5">Mobile Number (10 Digits)</label>
                <input
                  type="tel"
                  value={customPhone}
                  onChange={(e) => {
                    setCustomPhone(e.target.value);
                    if (e.target.value) setTargetMemberId('');
                  }}
                  className="w-full bg-surface-container-low border border-surface-container-high focus:border-tertiary rounded-xl px-3 py-2.5 text-on-surface focus:outline-none"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high text-[11px] text-outline space-y-1">
                <span className="font-bold text-on-surface">Sharing:</span> {sharingDietPlan.title} ({sharingDietPlan.caloriesTarget} kcal · {sharingDietPlan.proteinTarget}g Protein)
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button
                onClick={() => setSharingDietPlan(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDietWhatsApp}
                className="px-5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20ba59] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
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
