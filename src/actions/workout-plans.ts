'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db-init';
import type { WorkoutPlanItem, DietPlanItem } from '@/types';

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
          { id: 'bx-5', name: 'Romanian Dumbbell Deadlifts', sets: 3, reps: '10-12', restSec: 75, notes: 'Hinge at hips, slight knee bend, flat back.' },
          { id: 'bx-6', name: 'Lat Pulldown (Neutral Grip)', sets: 3, reps: '10-12', restSec: 60, notes: 'Pull smooth to chest, avoid leaning back.' },
          { id: 'bx-7', name: 'Dumbbell Overhead Shoulder Press', sets: 3, reps: '10-12', restSec: 60, notes: 'Brace core, don’t arch lower back.' },
          { id: 'bx-8', name: 'Bicycle Crunches', sets: 3, reps: '15/side', restSec: 45, notes: 'Slow deliberate twist to opposite knee.' },
        ],
      },
      {
        id: 'b-day-3',
        dayName: 'Workout C (Friday)',
        targetMuscles: 'Legs, Chest & Arms',
        exercises: [
          { id: 'bx-9', name: 'Leg Press Machine', sets: 3, reps: '12-15', restSec: 60, notes: 'Controlled tempo, drive from heels.' },
          { id: 'bx-10', name: 'Incline Push-ups or Machine Press', sets: 3, reps: '10-12', restSec: 60, notes: 'Full range of motion, touch chest.' },
          { id: 'bx-11', name: 'Dumbbell Standing Bicep Curls', sets: 3, reps: '12-14', restSec: 45, notes: 'Rotate wrists as you curl up.' },
          { id: 'bx-12', name: 'Tricep Cable Rope Pushdown', sets: 3, reps: '12-15', restSec: 45, notes: 'Squeeze triceps at bottom.' },
        ],
      },
    ],
  },
  {
    title: '4-Day Upper / Lower Power & Hypertrophy',
    description: 'High-efficiency 4-day frequency allowing maximum recovery between heavy compound pushing, pulling and leg days.',
    difficulty: 'Advanced',
    daysPerWeek: 4,
    goal: 'Strength & Power',
    days: [
      {
        id: 'ul-1',
        dayName: 'Day 1: Upper Power',
        targetMuscles: 'Chest, Back, Shoulders, Arms',
        exercises: [
          { id: 'ulx-1', name: 'Barbell Flat Bench Press', sets: 5, reps: '5', restSec: 120, notes: 'Heavy strength sets, explosive press.' },
          { id: 'ulx-2', name: 'Barbell Bent-Over Row', sets: 5, reps: '5', restSec: 120, notes: 'Torso at 45 degrees, pull bar to navel.' },
          { id: 'ulx-3', name: 'Overhead Barbell Military Press', sets: 4, reps: '6-8', restSec: 90, notes: 'Lockout overhead, squeeze glutes.' },
          { id: 'ulx-4', name: 'Heavy Barbell Shrugs', sets: 3, reps: '8-10', restSec: 60, notes: 'Elevate traps straight up, pause 2s.' },
        ],
      },
      {
        id: 'ul-2',
        dayName: 'Day 2: Lower Power',
        targetMuscles: 'Quads, Hamstrings, Glutes, Core',
        exercises: [
          { id: 'ulx-5', name: 'Barbell Back Squats', sets: 5, reps: '5', restSec: 150, notes: 'Heavy power sets, deep hip crease.' },
          { id: 'ulx-6', name: 'Conventional Barbell Deadlift', sets: 3, reps: '5', restSec: 150, notes: 'Reset each rep, maintain neutral spine.' },
          { id: 'ulx-7', name: 'Bulgarian Split Squats', sets: 3, reps: '8/leg', restSec: 75, notes: 'Rear foot elevated on bench.' },
          { id: 'ulx-8', name: 'Standing Heavy Calf Raise', sets: 4, reps: '10-12', restSec: 60, notes: 'Heavy loading, full dorsiflexion.' },
        ],
      },
      {
        id: 'ul-3',
        dayName: 'Day 3: Upper Hypertrophy',
        targetMuscles: 'Chest, Back, Shoulders, Arms',
        exercises: [
          { id: 'ulx-9', name: 'Incline Dumbbell Bench Press', sets: 4, reps: '10-12', restSec: 75, notes: 'Continuous tension on upper pecs.' },
          { id: 'ulx-10', name: 'Close-Grip Lat Pulldown', sets: 4, reps: '10-12', restSec: 75, notes: 'Pull to lower chest, flare lats on return.' },
          { id: 'ulx-11', name: 'Cable Lateral Raise', sets: 4, reps: '12-15', restSec: 45, notes: 'Constant cable resistance throughout ROM.' },
          { id: 'ulx-12', name: 'Overhead Cable Tricep Extension', sets: 3, reps: '12-15', restSec: 60, notes: 'Full long head tricep extension.' },
          { id: 'ulx-13', name: 'Incline Dumbbell Bicep Curl', sets: 3, reps: '12-14', restSec: 60, notes: 'Elbows pinned back behind torso.' },
        ],
      },
      {
        id: 'ul-4',
        dayName: 'Day 4: Lower Hypertrophy',
        targetMuscles: 'Quads, Hamstrings, Glutes, Calves',
        exercises: [
          { id: 'ulx-14', name: 'Hack Squat or Leg Press', sets: 4, reps: '10-12', restSec: 90, notes: 'Feet low on platform for quad focus.' },
          { id: 'ulx-15', name: 'Dumbbell Stiff-Legged Deadlift', sets: 4, reps: '10-12', restSec: 75, notes: 'Deep stretch in hamstrings and glutes.' },
          { id: 'ulx-16', name: 'Leg Extension Machine', sets: 3, reps: '15-18', restSec: 45, notes: 'Hold peak contraction for 1 full second.' },
          { id: 'ulx-17', name: 'Seated Calf Raise', sets: 4, reps: '15-20', restSec: 45, notes: 'Focus on soleus muscle development.' },
        ],
      },
    ],
  },
];

const DEFAULT_DIET_PLANS: Omit<DietPlanItem, 'id'>[] = [
  {
    title: 'High-Protein Muscle Gain (2800 kcal)',
    description: 'Calculated surplus nutrition for steady lean muscle hypertrophy without excess body fat accumulation.',
    targetGoal: 'Muscle Gain',
    caloriesTarget: 2800,
    proteinTarget: 160,
    carbsTarget: 320,
    fatsTarget: 70,
    waterLiters: 4.0,
    dietaryPreference: 'Non-Vegetarian',
    supplementsRecommended: ['Whey Protein', 'Creatine Monohydrate', 'Fish Oil', 'Multivitamin'],
    meals: [
      {
        id: 'm1',
        mealName: 'Meal 1: High-Power Breakfast',
        time: '8:00 AM',
        notes: 'Eat within 1 hour of waking up. Drink 500ml water first.',
        items: [
          { id: 'i1', name: 'Whole Eggs & Egg Whites Omelet', portion: '2 whole eggs + 4 egg whites', calories: 240, proteinGrams: 28, carbsGrams: 2, fatsGrams: 11 },
          { id: 'i2', name: 'Toasted Brown Bread with Peanut Butter', portion: '2 slices + 1 tbsp peanut butter', calories: 230, proteinGrams: 9, carbsGrams: 26, fatsGrams: 10 },
          { id: 'i3', name: 'Fresh Banana', portion: '1 medium banana', calories: 105, proteinGrams: 1, carbsGrams: 27, fatsGrams: 0 },
        ],
      },
      {
        id: 'm2',
        mealName: 'Meal 2: Mid-Morning Anabolic Fuel',
        time: '11:30 AM',
        notes: 'Can blend together as a quick office/campus shake.',
        items: [
          { id: 'i4', name: 'Whey Protein Shake (in water or skimmed milk)', portion: '1 level scoop (33g)', calories: 130, proteinGrams: 25, carbsGrams: 3, fatsGrams: 1.5 },
          { id: 'i5', name: 'California Raw Almonds & Walnuts', portion: '15 almonds + 3 walnut halves', calories: 160, proteinGrams: 5, carbsGrams: 5, fatsGrams: 14 },
          { id: 'i6', name: 'Crisp Green Apple', portion: '1 whole fruit', calories: 80, proteinGrams: 0, carbsGrams: 21, fatsGrams: 0 },
        ],
      },
      {
        id: 'm3',
        mealName: 'Meal 3: Solid Bodybuilder Lunch',
        time: '2:00 PM',
        notes: 'High complex carbs to replenish glycogen before training.',
        items: [
          { id: 'i7', name: 'Grilled Chicken Breast or Low-Fat Paneer', portion: '150g grilled breast or 150g paneer', calories: 250, proteinGrams: 42, carbsGrams: 0, fatsGrams: 5 },
          { id: 'i8', name: 'Steamed Brown Basmati Rice', portion: '1.5 cooked cups (200g)', calories: 220, proteinGrams: 5, carbsGrams: 46, fatsGrams: 2 },
          { id: 'i9', name: 'Moong Dal or Yellow Lentil Soup', portion: '1 medium bowl (150g)', calories: 150, proteinGrams: 9, carbsGrams: 24, fatsGrams: 1 },
          { id: 'i10', name: 'Cucumber, Tomato & Beetroot Salad', portion: '1 large bowl with lemon squeeze', calories: 50, proteinGrams: 2, carbsGrams: 10, fatsGrams: 0 },
        ],
      },
      {
        id: 'm4',
        mealName: 'Meal 4: Pre-Workout Ignition',
        time: '5:00 PM',
        notes: 'Consume 60-90 minutes before your workout session.',
        items: [
          { id: 'i11', name: 'Rolled Oatmeal with Honey & Cinnamon', portion: '50g dry oats cooked in water', calories: 190, proteinGrams: 7, carbsGrams: 34, fatsGrams: 3 },
          { id: 'i12', name: 'Black Coffee or Pre-Workout Drink', portion: '1 mug strong black coffee', calories: 5, proteinGrams: 0, carbsGrams: 1, fatsGrams: 0 },
        ],
      },
      {
        id: 'm5',
        mealName: 'Meal 5: Post-Workout Recovery Dinner',
        time: '8:30 PM',
        notes: 'Supports overnight muscle protein synthesis and recovery.',
        items: [
          { id: 'i13', name: 'Grilled Fish fillet or Chicken Breast or Soya chunks', portion: '150g cooked portion', calories: 240, proteinGrams: 38, carbsGrams: 2, fatsGrams: 4 },
          { id: 'i14', name: 'Whole Wheat Phulkas / Rotis', portion: '2 medium rotis without oil', calories: 180, proteinGrams: 6, carbsGrams: 34, fatsGrams: 1 },
          { id: 'i15', name: 'Steamed Broccoli, Carrots & French Beans', portion: '1 bowl sautéed with pinch of rock salt', calories: 80, proteinGrams: 4, carbsGrams: 14, fatsGrams: 1 },
        ],
      },
    ],
  },
  {
    title: 'Fat Loss & Calorie Deficit (1800 kcal)',
    description: 'High-satiety, high-protein cutting diet designed to maximize fat oxidation while preserving lean muscle mass.',
    targetGoal: 'Weight Loss',
    caloriesTarget: 1800,
    proteinTarget: 140,
    carbsTarget: 160,
    fatsTarget: 45,
    waterLiters: 4.0,
    dietaryPreference: 'Non-Vegetarian',
    supplementsRecommended: ['Whey Isolate', 'L-Carnitine', 'Green Tea Extract', 'Multivitamin'],
    meals: [
      {
        id: 'm1',
        mealName: 'Meal 1: Lean Morning Jumpstart',
        time: '8:30 AM',
        notes: 'Low glycemic carbs with high bio-available protein.',
        items: [
          { id: 'i1', name: 'Oats in water with 1 scoop Whey Isolate', portion: '40g oats + 1 scoop whey', calories: 270, proteinGrams: 28, carbsGrams: 28, fatsGrams: 3 },
          { id: 'i2', name: 'Boiled Egg Whites', portion: '3 egg whites with black pepper', calories: 51, proteinGrams: 11, carbsGrams: 1, fatsGrams: 0 },
        ],
      },
      {
        id: 'm2',
        mealName: 'Meal 2: Mid-Day Metabolism Booster',
        time: '12:00 PM',
        notes: 'Fights hunger pangs and provides hydration.',
        items: [
          { id: 'i3', name: 'Green Tea (Unsweetened)', portion: '1 cup', calories: 2, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0 },
          { id: 'i4', name: 'Roasted Bengal Gram (Chana)', portion: '30g dry roasted', calories: 115, proteinGrams: 6, carbsGrams: 18, fatsGrams: 2 },
        ],
      },
      {
        id: 'm3',
        mealName: 'Meal 3: Lean Protein & Fiber Lunch',
        time: '2:00 PM',
        notes: 'High vegetable volume keeps you full for hours.',
        items: [
          { id: 'i5', name: 'Grilled Herb Chicken Breast / Paneer', portion: '140g breast or 120g low-fat paneer', calories: 220, proteinGrams: 38, carbsGrams: 0, fatsGrams: 4 },
          { id: 'i6', name: 'Multigrain Roti', portion: '1 medium roti', calories: 90, proteinGrams: 3, carbsGrams: 17, fatsGrams: 1 },
          { id: 'i7', name: 'Giant Salad Bowl (Lettuce, Cucumber, Tomato)', portion: '1 large bowl with apple cider vinegar', calories: 60, proteinGrams: 2, carbsGrams: 12, fatsGrams: 0 },
        ],
      },
      {
        id: 'm4',
        mealName: 'Meal 4: Pre-Workout Energy Spark',
        time: '5:30 PM',
        notes: 'Fast digesting fuel 45 mins before training.',
        items: [
          { id: 'i8', name: 'Espresso Black Coffee + 1 Rice Cake', portion: '1 cup + 1 cake with peanut butter swipe', calories: 95, proteinGrams: 3, carbsGrams: 11, fatsGrams: 4 },
        ],
      },
      {
        id: 'm5',
        mealName: 'Meal 5: Light Low-Carb Dinner',
        time: '8:30 PM',
        notes: 'Zero heavy carbs at night for optimal fat burning during sleep.',
        items: [
          { id: 'i9', name: 'Chicken Soup or Soya-Veggie Stir Fry', portion: '1 large bowl', calories: 240, proteinGrams: 32, carbsGrams: 14, fatsGrams: 4 },
          { id: 'i10', name: 'Boiled Egg Whites', portion: '3 egg whites', calories: 51, proteinGrams: 11, carbsGrams: 1, fatsGrams: 0 },
        ],
      },
    ],
  },
  {
    title: 'Vegetarian High-Protein Power Plan (2200 kcal)',
    description: '100% pure vegetarian diet structured with plant & dairy protein sources to hit 130g+ daily protein without meat or eggs.',
    targetGoal: 'High-Protein Vegetarian',
    caloriesTarget: 2200,
    proteinTarget: 130,
    carbsTarget: 260,
    fatsTarget: 55,
    waterLiters: 4.0,
    dietaryPreference: 'Vegetarian',
    supplementsRecommended: ['Plant or Whey Protein', 'Creatine Monohydrate', 'Vitamin B12', 'Ashwagandha'],
    meals: [
      {
        id: 'm1',
        mealName: 'Meal 1: High-Protein Veggie Breakfast',
        time: '8:00 AM',
        notes: 'Soya chunks contain over 52g protein per 100g dry weight.',
        items: [
          { id: 'i1', name: 'Soya Chunks Bhurji with onion & tomatoes', portion: '50g soya chunks boiled & scrambled', calories: 220, proteinGrams: 26, carbsGrams: 16, fatsGrams: 1 },
          { id: 'i2', name: 'Whole Wheat Rotis', portion: '2 rotis', calories: 180, proteinGrams: 6, carbsGrams: 34, fatsGrams: 1 },
          { id: 'i3', name: 'Fresh Curd / Dahi', portion: '100g bowl', calories: 65, proteinGrams: 4, carbsGrams: 5, fatsGrams: 3 },
        ],
      },
      {
        id: 'm2',
        mealName: 'Meal 2: Protein Shake & Nut Snack',
        time: '11:30 AM',
        notes: 'Convenient mid-morning nutrition.',
        items: [
          { id: 'i4', name: 'Whey or Pea Protein in water', portion: '1 scoop (30g)', calories: 120, proteinGrams: 25, carbsGrams: 2, fatsGrams: 1 },
          { id: 'i5', name: 'Soaked Walnuts & Pumpkin Seeds', portion: '10g walnuts + 10g seeds', calories: 120, proteinGrams: 5, carbsGrams: 3, fatsGrams: 10 },
        ],
      },
      {
        id: 'm3',
        mealName: 'Meal 3: Wholesome Desi Thali Lunch',
        time: '2:00 PM',
        notes: 'Combines grains and legumes for a complete amino acid profile.',
        items: [
          { id: 'i6', name: 'Low-Fat Paneer Curry (minimal oil)', portion: '150g paneer with onion-tomato gravy', calories: 280, proteinGrams: 28, carbsGrams: 8, fatsGrams: 14 },
          { id: 'i7', name: 'Cooked Basmati Rice or 2 Rotis', portion: '1 cup rice or 2 rotis', calories: 180, proteinGrams: 4, carbsGrams: 38, fatsGrams: 1 },
          { id: 'i8', name: 'Thick Rajma or Chole Curry', portion: '1 bowl (150g)', calories: 170, proteinGrams: 9, carbsGrams: 26, fatsGrams: 2 },
          { id: 'i9', name: 'Mixed Sprouted Moong Salad', portion: '1 cup with lime', calories: 75, proteinGrams: 5, carbsGrams: 13, fatsGrams: 0.5 },
        ],
      },
      {
        id: 'm4',
        mealName: 'Meal 4: Pre-Workout Booster',
        time: '5:00 PM',
        notes: 'Energy support before evening gym lifting.',
        items: [
          { id: 'i10', name: 'Peanut Butter Toast on Brown Bread', portion: '1 slice bread + 1 tbsp peanut butter', calories: 160, proteinGrams: 6, carbsGrams: 14, fatsGrams: 8 },
          { id: 'i11', name: 'Black Coffee', portion: '1 cup', calories: 2, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0 },
        ],
      },
      {
        id: 'm5',
        mealName: 'Meal 5: High-Protein Night Dinner',
        time: '8:30 PM',
        notes: 'Sustained protein release for muscle repair.',
        items: [
          { id: 'i12', name: 'Tofu / Soya Stir Fry with Bell Peppers', portion: '120g tofu sautéed with garlic & veggies', calories: 180, proteinGrams: 17, carbsGrams: 6, fatsGrams: 9 },
          { id: 'i13', name: 'Multigrain Roti', portion: '2 rotis', calories: 180, proteinGrams: 6, carbsGrams: 34, fatsGrams: 1 },
          { id: 'i14', name: 'Warm Turmeric Spiced Skimmed Milk', portion: '150ml with cinnamon', calories: 75, proteinGrams: 5, carbsGrams: 8, fatsGrams: 1.5 },
        ],
      },
    ],
  },
];

export async function getWorkoutPlans(): Promise<WorkoutPlanItem[]> {
  const user = await requireStaff();

  try {
    const [rows, gymMeta] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "WorkoutPlan" WHERE "gymId" = $1 ORDER BY "createdAt" ASC
      `, user.gymId).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "clearedPrefilledPlans" FROM "Gym" WHERE "id" = $1 LIMIT 1
      `, user.gymId).catch(() => []),
    ]);

    const isCleared = gymMeta?.[0]?.clearedPrefilledPlans === true;

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

    // If owner explicitly cleared prefilled plans, DO NOT re-seed! Return empty array so they start fresh
    if (isCleared) {
      return [];
    }

    // Seed default plans for new gym
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

// ── Diet Plans Actions ──

export async function getDietPlans(): Promise<DietPlanItem[]> {
  const user = await requireStaff();

  try {
    const [rows, gymMeta] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "DietPlan" WHERE "gymId" = $1 ORDER BY "createdAt" ASC
      `, user.gymId).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "clearedPrefilledPlans" FROM "Gym" WHERE "id" = $1 LIMIT 1
      `, user.gymId).catch(() => []),
    ]);

    const isCleared = gymMeta?.[0]?.clearedPrefilledPlans === true;

    if (rows && rows.length > 0) {
      return rows.map((r) => {
        let meals = [];
        try {
          meals = JSON.parse(r.mealsJson || '[]');
        } catch {
          meals = [];
        }
        let supplementsRecommended: string[] = [];
        try {
          supplementsRecommended = r.supplementsRecommended ? JSON.parse(r.supplementsRecommended) : [];
        } catch {
          supplementsRecommended = [];
        }
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          targetGoal: (r.targetGoal || 'Muscle Gain') as any,
          caloriesTarget: Number(r.caloriesTarget) || 2400,
          proteinTarget: Number(r.proteinTarget) || 140,
          carbsTarget: r.carbsTarget ? Number(r.carbsTarget) : undefined,
          fatsTarget: r.fatsTarget ? Number(r.fatsTarget) : undefined,
          waterLiters: Number(r.waterLiters) || 3.5,
          dietaryPreference: (r.dietaryPreference || 'Non-Vegetarian') as any,
          meals,
          supplementsRecommended,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
        };
      });
    }

    if (isCleared) {
      return [];
    }

    // Seed default diet plans for new gym
    for (const def of DEFAULT_DIET_PLANS) {
      const id = `dp_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DietPlan" ("id", "gymId", "title", "description", "targetGoal", "caloriesTarget", "proteinTarget", "carbsTarget", "fatsTarget", "waterLiters", "dietaryPreference", "mealsJson", "supplementsRecommended")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, id, user.gymId, def.title, def.description, def.targetGoal, def.caloriesTarget, def.proteinTarget, def.carbsTarget ?? null, def.fatsTarget ?? null, def.waterLiters, def.dietaryPreference, JSON.stringify(def.meals), JSON.stringify(def.supplementsRecommended || [])).catch(() => {});
    }

    const reloaded = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "DietPlan" WHERE "gymId" = $1 ORDER BY "createdAt" ASC
    `, user.gymId).catch(() => []);

    return (reloaded || []).map((r) => {
      let meals = [];
      try {
        meals = JSON.parse(r.mealsJson || '[]');
      } catch {
        meals = [];
      }
      let supplementsRecommended: string[] = [];
      try {
        supplementsRecommended = r.supplementsRecommended ? JSON.parse(r.supplementsRecommended) : [];
      } catch {
        supplementsRecommended = [];
      }
      return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        targetGoal: (r.targetGoal || 'Muscle Gain') as any,
        caloriesTarget: Number(r.caloriesTarget) || 2400,
        proteinTarget: Number(r.proteinTarget) || 140,
        carbsTarget: r.carbsTarget ? Number(r.carbsTarget) : undefined,
        fatsTarget: r.fatsTarget ? Number(r.fatsTarget) : undefined,
        waterLiters: Number(r.waterLiters) || 3.5,
        dietaryPreference: (r.dietaryPreference || 'Non-Vegetarian') as any,
        meals,
        supplementsRecommended,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
      };
    });
  } catch (err) {
    console.error('getDietPlans error:', err);
    return DEFAULT_DIET_PLANS.map((d, i) => ({
      ...d,
      id: `def_dp_${i}`,
    }));
  }
}

export async function saveDietPlan(
  plan: Omit<DietPlanItem, 'id'> & { id?: string }
): Promise<{ ok: boolean; plan?: DietPlanItem; error?: string }> {
  const user = await requireStaff();

  const id = plan.id || `dp_${Math.random().toString(36).substring(2, 9)}`;
  const title = String(plan.title || 'Diet Plan').trim();
  const description = String(plan.description || '').trim();
  const targetGoal = plan.targetGoal || 'Muscle Gain';
  const caloriesTarget = Math.max(500, Math.min(10000, Number(plan.caloriesTarget) || 2000));
  const proteinTarget = Math.max(0, Math.min(500, Number(plan.proteinTarget) || 100));
  const carbsTarget = plan.carbsTarget ? Number(plan.carbsTarget) : null;
  const fatsTarget = plan.fatsTarget ? Number(plan.fatsTarget) : null;
  const waterLiters = Number(plan.waterLiters) || 3.5;
  const dietaryPreference = plan.dietaryPreference || 'Non-Vegetarian';
  const mealsJson = JSON.stringify(plan.meals || []);
  const supplementsRecommended = JSON.stringify(plan.supplementsRecommended || []);

  try {
    if (plan.id) {
      await prisma.$executeRawUnsafe(`
        UPDATE "DietPlan"
        SET "title" = $1, "description" = $2, "targetGoal" = $3, "caloriesTarget" = $4, "proteinTarget" = $5, "carbsTarget" = $6, "fatsTarget" = $7, "waterLiters" = $8, "dietaryPreference" = $9, "mealsJson" = $10, "supplementsRecommended" = $11, "updatedAt" = NOW()
        WHERE "id" = $12 AND "gymId" = $13
      `, title, description, targetGoal, caloriesTarget, proteinTarget, carbsTarget, fatsTarget, waterLiters, dietaryPreference, mealsJson, supplementsRecommended, plan.id, user.gymId);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DietPlan" ("id", "gymId", "title", "description", "targetGoal", "caloriesTarget", "proteinTarget", "carbsTarget", "fatsTarget", "waterLiters", "dietaryPreference", "mealsJson", "supplementsRecommended")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, id, user.gymId, title, description, targetGoal, caloriesTarget, proteinTarget, carbsTarget, fatsTarget, waterLiters, dietaryPreference, mealsJson, supplementsRecommended);
    }

    return {
      ok: true,
      plan: {
        id,
        title,
        description,
        targetGoal,
        caloriesTarget,
        proteinTarget,
        carbsTarget: carbsTarget ?? undefined,
        fatsTarget: fatsTarget ?? undefined,
        waterLiters,
        dietaryPreference,
        meals: plan.meals || [],
        supplementsRecommended: plan.supplementsRecommended || [],
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('saveDietPlan error:', err);
    return { ok: false, error: err?.message || 'Failed to save diet plan' };
  }
}

export async function deleteDietPlan(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "DietPlan" WHERE "id" = $1 AND "gymId" = $2
    `, id, user.gymId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete diet plan' };
  }
}

// ── Clear All Prefilled Plans & Restore ──

export async function clearAllPrefilledPlans(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();

  try {
    await Promise.all([
      prisma.$executeRawUnsafe(`DELETE FROM "WorkoutPlan" WHERE "gymId" = $1`, user.gymId),
      prisma.$executeRawUnsafe(`DELETE FROM "DietPlan" WHERE "gymId" = $1`, user.gymId),
      prisma.$executeRawUnsafe(`UPDATE "Gym" SET "clearedPrefilledPlans" = true WHERE "id" = $1`, user.gymId).catch(() => {}),
    ]);

    return { ok: true };
  } catch (err: any) {
    console.error('clearAllPrefilledPlans error:', err);
    return { ok: false, error: err?.message || 'Failed to clear prefilled plans' };
  }
}

export async function restoreDefaultPlans(): Promise<{
  ok: boolean;
  workoutPlans?: WorkoutPlanItem[];
  dietPlans?: DietPlanItem[];
  error?: string;
}> {
  const user = await requireStaff();

  try {
    await prisma.$executeRawUnsafe(`UPDATE "Gym" SET "clearedPrefilledPlans" = false WHERE "id" = $1`, user.gymId).catch(() => {});

    // Seed defaults
    for (const def of DEFAULT_WORKOUT_PLANS) {
      const id = `wp_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "WorkoutPlan" ("id", "gymId", "title", "description", "difficulty", "daysPerWeek", "goal", "routineJson")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, id, user.gymId, def.title, def.description, def.difficulty, def.daysPerWeek, def.goal, JSON.stringify(def.days)).catch(() => {});
    }

    for (const def of DEFAULT_DIET_PLANS) {
      const id = `dp_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DietPlan" ("id", "gymId", "title", "description", "targetGoal", "caloriesTarget", "proteinTarget", "carbsTarget", "fatsTarget", "waterLiters", "dietaryPreference", "mealsJson", "supplementsRecommended")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, id, user.gymId, def.title, def.description, def.targetGoal, def.caloriesTarget, def.proteinTarget, def.carbsTarget ?? null, def.fatsTarget ?? null, def.waterLiters, def.dietaryPreference, JSON.stringify(def.meals), JSON.stringify(def.supplementsRecommended || [])).catch(() => {});
    }

    const [workoutPlans, dietPlans] = await Promise.all([
      getWorkoutPlans(),
      getDietPlans(),
    ]);

    return { ok: true, workoutPlans, dietPlans };
  } catch (err: any) {
    console.error('restoreDefaultPlans error:', err);
    return { ok: false, error: err?.message || 'Failed to restore templates' };
  }
}

export async function getWorkoutAndDietPlans(): Promise<{
  workoutPlans: WorkoutPlanItem[];
  dietPlans: DietPlanItem[];
}> {
  const [workoutPlans, dietPlans] = await Promise.all([
    getWorkoutPlans(),
    getDietPlans(),
  ]);
  return { workoutPlans, dietPlans };
}
