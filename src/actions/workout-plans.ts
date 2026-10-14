'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db-init';
import type { WorkoutPlanItem } from '@/types';

const DEFAULT_WORKOUT_PLANS: Omit<WorkoutPlanItem, 'id'>[] = [
  {
    title: '5-Day Hypertrophy Split (Classic)',
    description: 'High-volume muscle building routine targeting one major muscle group daily with optimal compound & isolation mix.',
    difficulty: 'Intermediate',
    daysPerWeek: 5,
    goal: 'Muscle Hypertrophy',
    days: [
      {
        id: 'day-1',
        dayName: 'Day 1: Chest & Triceps',
        targetMuscles: 'Pectoralis Major/Minor, Triceps Lateral/Long Head',
        exercises: [
          { id: 'ex-1', name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', restSec: 90, notes: 'Arch lower back slightly, retract scapula, pause at bottom.' },
          { id: 'ex-2', name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', restSec: 75, notes: 'Set bench to 30 degrees, full stretch at bottom.' },
          { id: 'ex-3', name: 'Cable Chest Flyes (Mid-Height)', sets: 3, reps: '12-15', restSec: 60, notes: 'Squeeze pecs for 1s at peak contraction.' },
          { id: 'ex-4', name: 'Rope Tricep Pushdown', sets: 4, reps: '12-15', restSec: 60, notes: 'Spread ropes apart at bottom, lock elbows in place.' },
          { id: 'ex-5', name: 'Overhead Dumbbell Tricep Extension', sets: 3, reps: '10-12', restSec: 60, notes: 'Deep stretch on the long head of triceps.' },
        ],
      },
      {
        id: 'day-2',
        dayName: 'Day 2: Back & Biceps',
        targetMuscles: 'Latissimus Dorsi, Rhomboids, Biceps Brachii',
        exercises: [
          { id: 'ex-6', name: 'Lat Pulldown (Wide Grip)', sets: 4, reps: '10-12', restSec: 75, notes: 'Pull with elbows down to clavicle, avoid swinging.' },
          { id: 'ex-7', name: 'Seated Cable Row', sets: 4, reps: '10-12', restSec: 75, notes: 'Squeeze shoulder blades together, upright torso.' },
          { id: 'ex-8', name: 'One-Arm Dumbbell Row', sets: 3, reps: '10-12', restSec: 60, notes: 'Row towards hip pocket, full stretch at bottom.' },
          { id: 'ex-9', name: 'Barbell EZ-Bar Bicep Curl', sets: 4, reps: '10-12', restSec: 60, notes: 'Control eccentric for 2 full seconds.' },
          { id: 'ex-10', name: 'Incline Dumbbell Hammer Curl', sets: 3, reps: '12-15', restSec: 60, notes: 'Targets brachialis and forearms.' },
        ],
      },
      {
        id: 'day-3',
        dayName: 'Day 3: Shoulders & Abs',
        targetMuscles: 'Anterior/Lateral/Posterior Delts, Core',
        exercises: [
          { id: 'ex-11', name: 'Seated Dumbbell Overhead Press', sets: 4, reps: '8-10', restSec: 90, notes: 'Press up and slightly inward, brace core.' },
          { id: 'ex-12', name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', restSec: 60, notes: 'Lead with elbows, avoid using body momentum.' },
          { id: 'ex-13', name: 'Face Pulls with Cable Rope', sets: 4, reps: '15-18', restSec: 60, notes: 'Pull rope towards eyes, external shoulder rotation.' },
          { id: 'ex-14', name: 'Hanging Leg Raise', sets: 3, reps: '12-15', restSec: 60, notes: 'Roll pelvis upward, avoid swinging.' },
          { id: 'ex-15', name: 'Cable Woodchoppers', sets: 3, reps: '15/side', restSec: 45, notes: 'Engage rotational core and obliques.' },
        ],
      },
      {
        id: 'day-4',
        dayName: 'Day 4: Legs & Calves',
        targetMuscles: 'Quadriceps, Hamstrings, Glutes, Calves',
        exercises: [
          { id: 'ex-16', name: 'Barbell Back Squats', sets: 4, reps: '8-10', restSec: 120, notes: 'Hit parallel or below, drive through midfoot.' },
          { id: 'ex-17', name: 'Leg Press 45-Degree', sets: 4, reps: '10-12', restSec: 90, notes: 'Do not lock knees at lockout, deep knee flexion.' },
          { id: 'ex-18', name: 'Lying Hamstring Leg Curl', sets: 4, reps: '10-12', restSec: 60, notes: 'Keep hips pinned to pad, slow negative.' },
          { id: 'ex-19', name: 'Walking Dumbbell Lunges', sets: 3, reps: '12 steps/leg', restSec: 60, notes: 'Torso upright, 90 degree knee angles.' },
          { id: 'ex-20', name: 'Standing Calf Raise', sets: 4, reps: '15-20', restSec: 45, notes: '2s pause at top contraction, 2s stretch at bottom.' },
        ],
      },
      {
        id: 'day-5',
        dayName: 'Day 5: Arms & Core Blitz',
        targetMuscles: 'Biceps, Triceps, Forearms, Core',
        exercises: [
          { id: 'ex-21', name: 'Close-Grip Barbell Bench Press', sets: 4, reps: '8-10', restSec: 75, notes: 'Hands shoulder-width apart, elbows tucked.' },
          { id: 'ex-22', name: 'Preacher Curl (Machine or Bench)', sets: 4, reps: '10-12', restSec: 60, notes: 'Strict isolation, avoid lifting elbows off pad.' },
          { id: 'ex-23', name: 'Dips (Weighted or Bodyweight)', sets: 3, reps: '10-12', restSec: 60, notes: 'Upright posture for tricep emphasis.' },
          { id: 'ex-24', name: 'Incline Dumbbell Curl', sets: 3, reps: '12-14', restSec: 60, notes: 'Maximum long head bicep stretch.' },
          { id: 'ex-25', name: 'Plank with Shoulder Taps', sets: 3, reps: '60 sec', restSec: 45, notes: 'Anti-rotational core stability.' },
        ],
      },
    ],
  },
  {
    title: '3-Day Beginner Full Body Kickstart',
    description: 'Perfect introductory workout program for new members to build fundamental strength, improve motor patterns and prevent burnout.',
    difficulty: 'Beginner',
    daysPerWeek: 3,
    goal: 'General Fitness',
    days: [
      {
        id: 'b-day-1',
        dayName: 'Workout A (Monday)',
        targetMuscles: 'Full Body Push/Pull/Legs',
        exercises: [
          { id: 'bx-1', name: 'Goblet Squats with Dumbbell', sets: 3, reps: '10-12', restSec: 60, notes: 'Hold dumbbell close to chest, chest upright.' },
          { id: 'bx-2', name: 'Dumbbell Flat Chest Press', sets: 3, reps: '10-12', restSec: 60, notes: 'Keep elbows at 45 degrees, smooth tempo.' },
          { id: 'bx-3', name: 'Seated Cable Row', sets: 3, reps: '10-12', restSec: 60, notes: 'Focus on retracting shoulder blades.' },
          { id: 'bx-4', name: 'Plank Hold', sets: 3, reps: '30-45 sec', restSec: 45, notes: 'Keep body in straight line, glutes squeezed.' },
        ],
      },
      {
        id: 'b-day-2',
        dayName: 'Workout B (Wednesday)',
        targetMuscles: 'Posterior Chain & Core',
        exercises: [
          { id: 'bx-5', name: 'Romanian Dumbbell Deadlift', sets: 3, reps: '10-12', restSec: 75, notes: 'Hinge at hips, keep slight knee bend.' },
          { id: 'bx-6', name: 'Lat Pulldown (Neutral Grip)', sets: 3, reps: '10-12', restSec: 60, notes: 'Pull towards upper chest, control ascent.' },
          { id: 'bx-7', name: 'Dumbbell Standing Overhead Press', sets: 3, reps: '10-12', restSec: 60, notes: 'Keep core tight, press directly overhead.' },
          { id: 'bx-8', name: 'Russian Twists', sets: 3, reps: '20 total', restSec: 45, notes: 'Rotate with torso, not just arms.' },
        ],
      },
      {
        id: 'b-day-3',
        dayName: 'Workout C (Friday)',
        targetMuscles: 'Full Body Conditioning',
        exercises: [
          { id: 'bx-9', name: 'Leg Press', sets: 3, reps: '12-15', restSec: 60, notes: 'Controlled tempo, focus on quad contraction.' },
          { id: 'bx-10', name: 'Push-Ups (or Incline Push-Ups)', sets: 3, reps: '8-12', restSec: 60, notes: 'Strict full range of motion.' },
          { id: 'bx-11', name: 'Dumbbell Hammer Curls', sets: 3, reps: '12-14', restSec: 45, notes: 'Controlled movement, no swinging.' },
          { id: 'bx-12', name: 'Treadmill Incline Walk', sets: 1, reps: '15 mins', restSec: 0, notes: 'Speed 4.5, Incline 8-10% for aerobic base.' },
        ],
      },
    ],
  },
  {
    title: 'Fat Shred & High-Velocity Conditioning',
    description: 'High intensity interval metabolic routine designed for rapid fat burning, cardio endurance and lean muscle preservation.',
    difficulty: 'Intermediate',
    daysPerWeek: 4,
    goal: 'Fat Loss & Conditioning',
    days: [
      {
        id: 'f-day-1',
        dayName: 'Day 1: Upper Body Circuit & Sprints',
        targetMuscles: 'Chest, Back, Shoulders, HIIT',
        exercises: [
          { id: 'fx-1', name: 'Dumbbell Push Press', sets: 4, reps: '12', restSec: 45, notes: 'Dip and drive explosively.' },
          { id: 'fx-2', name: 'Renegade Rows (Push-up + Row)', sets: 4, reps: '10/side', restSec: 45, notes: 'Keep hips square to the floor.' },
          { id: 'fx-3', name: 'Kettlebell Swings', sets: 4, reps: '20', restSec: 45, notes: 'Explosive hip hinge, eye level swing.' },
          { id: 'fx-4', name: 'Rowing Machine Sprint', sets: 5, reps: '250m', restSec: 60, notes: 'All-out sprint, max wattage.' },
        ],
      },
      {
        id: 'f-day-2',
        dayName: 'Day 2: Lower Body Metcon & Core',
        targetMuscles: 'Quads, Glutes, Core, Cardio',
        exercises: [
          { id: 'fx-5', name: 'Barbell Thrusters', sets: 4, reps: '10-12', restSec: 60, notes: 'Full front squat directly into overhead press.' },
          { id: 'fx-6', name: 'Jump Squats (Bodyweight)', sets: 4, reps: '15', restSec: 45, notes: 'Soft landing, explosive takeoff.' },
          { id: 'fx-7', name: 'Mountain Climbers', sets: 4, reps: '40 sec', restSec: 30, notes: 'Fast cadence, flat back.' },
          { id: 'fx-8', name: 'Battle Ropes Alternating Waves', sets: 5, reps: '30 sec', restSec: 45, notes: 'Maintain athletic stance, rapid arms.' },
        ],
      },
    ],
  },
];

export async function getWorkoutPlans(): Promise<WorkoutPlanItem[]> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "WorkoutPlan" WHERE "gymId" = $1 ORDER BY "createdAt" ASC
    `, user.gymId);

    if (rows && rows.length > 0) {
      return rows.map((r) => {
        let days = [];
        try {
          days = JSON.parse(r.routineJson || '[]');
        } catch {
          days = [];
        }
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          difficulty: (r.difficulty || 'Intermediate') as any,
          daysPerWeek: Number(r.daysPerWeek) || 4,
          goal: (r.goal || 'Muscle Hypertrophy') as any,
          days,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
        };
      });
    }

    // Seed default plans if brand new
    for (const def of DEFAULT_WORKOUT_PLANS) {
      const id = `wp_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "WorkoutPlan" ("id", "gymId", "title", "description", "difficulty", "daysPerWeek", "goal", "routineJson")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, id, user.gymId, def.title, def.description, def.difficulty, def.daysPerWeek, def.goal, JSON.stringify(def.days)).catch(() => {});
    }

    const reloaded = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "WorkoutPlan" WHERE "gymId" = $1 ORDER BY "createdAt" ASC
    `, user.gymId).catch(() => []);

    return (reloaded || []).map((r) => {
      let days = [];
      try {
        days = JSON.parse(r.routineJson || '[]');
      } catch {
        days = [];
      }
      return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        difficulty: (r.difficulty || 'Intermediate') as any,
        daysPerWeek: Number(r.daysPerWeek) || 4,
        goal: (r.goal || 'Muscle Hypertrophy') as any,
        days,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
      };
    });
  } catch (err) {
    console.error('getWorkoutPlans error:', err);
    return DEFAULT_WORKOUT_PLANS.map((d, i) => ({
      ...d,
      id: `def_wp_${i}`,
    }));
  }
}

export async function saveWorkoutPlan(
  plan: Omit<WorkoutPlanItem, 'id'> & { id?: string }
): Promise<{ ok: boolean; plan?: WorkoutPlanItem; error?: string }> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  const id = plan.id || `wp_${Math.random().toString(36).substring(2, 9)}`;
  const title = String(plan.title || 'Workout Routine').trim();
  const description = String(plan.description || '').trim();
  const difficulty = plan.difficulty || 'Intermediate';
  const daysPerWeek = Math.max(1, Math.min(7, Number(plan.daysPerWeek) || 4));
  const goal = plan.goal || 'Muscle Hypertrophy';
  const routineJson = JSON.stringify(plan.days || []);

  try {
    if (plan.id) {
      await prisma.$executeRawUnsafe(`
        UPDATE "WorkoutPlan"
        SET "title" = $1, "description" = $2, "difficulty" = $3, "daysPerWeek" = $4, "goal" = $5, "routineJson" = $6, "updatedAt" = NOW()
        WHERE "id" = $7 AND "gymId" = $8
      `, title, description, difficulty, daysPerWeek, goal, routineJson, plan.id, user.gymId);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "WorkoutPlan" ("id", "gymId", "title", "description", "difficulty", "daysPerWeek", "goal", "routineJson")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, id, user.gymId, title, description, difficulty, daysPerWeek, goal, routineJson);
    }

    return {
      ok: true,
      plan: {
        id,
        title,
        description,
        difficulty,
        daysPerWeek,
        goal,
        days: plan.days || [],
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('saveWorkoutPlan error:', err);
    return { ok: false, error: err?.message || 'Failed to save workout plan' };
  }
}

export async function deleteWorkoutPlan(id: string): Promise<{ ok: boolean; error?: string }> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "WorkoutPlan" WHERE "id" = $1 AND "gymId" = $2
    `, id, user.gymId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete plan' };
  }
}
