/** Conservative, deterministic wellness templates, not diagnoses or calorie prescriptions.
 * Evidence and limitations: docs/WELLNESS.md. Keep inputs validated on the server.
 */
export interface WellnessProfile {
  age: number; height: number; weight: number;
  preference: 'vegetarian' | 'non-vegetarian';
  activity: 'seated' | 'mixed' | 'physical';
  experience: 'beginner' | 'regular';
  goal: 'fitness' | 'strength' | 'weight-management';
  days: number;
  equipment: string[];
  allergies: string[];
  needsReview: boolean;
}
export interface WellnessOption { title: string; summary: string; sections: { title: string; lines: string[] }[] }
export interface WellnessResult { version: 1; bmi: number; summary: string; notes: string[]; workouts: WellnessOption[]; diets: WellnessOption[] }
export const EQUIPMENT = ['dumbbells', 'bands', 'leg-press', 'chest-press', 'cable-row', 'lat-pulldown', 'cycle'];
export const ALLERGENS = ['milk', 'soy', 'peanuts', 'wheat', 'eggs', 'fish', 'other'];

export function validateProfile(p: WellnessProfile): string | null {
  if (!p || ![p.age, p.height, p.weight, p.days].every(Number.isFinite)) return 'Enter valid age, height, weight and training days.';
  if (p.age < 18 || p.age > 64) return 'These templates are for adults aged 18–64. Ask a qualified professional for an age-appropriate plan.';
  if (p.height < 120 || p.height > 230 || p.weight < 30 || p.weight > 250) return 'Check height (120–230 cm) and weight (30–250 kg).';
  if (!['vegetarian','non-vegetarian'].includes(p.preference) || !['seated','mixed','physical'].includes(p.activity) || !['beginner','regular'].includes(p.experience) || !['fitness','strength','weight-management'].includes(p.goal) || ![2,3,4].includes(p.days)) return 'Choose valid profile options.';
  if (!Array.isArray(p.equipment) || !Array.isArray(p.allergies) || p.equipment.length > EQUIPMENT.length || p.allergies.length > ALLERGENS.length || p.equipment.some(e => !EQUIPMENT.includes(e)) || p.allergies.some(a => !ALLERGENS.includes(a))) return 'Choose equipment and allergies from the list.';
  if (typeof p.needsReview !== 'boolean' || p.needsReview || p.allergies.includes('other')) return 'A clinician or registered dietitian should tailor your plan for your health or allergy needs. Ask your gym to assign a reviewed plan here.';
  const bmi = p.weight / ((p.height / 100) ** 2);
  if (bmi < 18.5 || bmi >= 40) return 'Your height and weight need an individual nutrition and exercise review before using these general templates. Please check the values or consult a qualified professional.';
  return null;
}

export function buildWellnessPlans(p: WellnessProfile): WellnessResult {
  const error = validateProfile(p); if (error) throw new Error(error);
  const has = (e: string) => p.equipment.includes(e);
  const novice = p.experience === 'beginner';
  const sets = novice || p.activity === 'physical' ? 2 : 3;
  const dose = `${sets} sets × ${novice ? '6–10' : '8–12'} comfortable repetitions; rest 60–90 seconds`;
  const pick = (machine: string, machineName: string, weighted: string, body: string) => has(machine) ? machineName : has('dumbbells') ? weighted : body;
  const squat = pick('leg-press','Leg press (trainer-adjusted seat)','Goblet squat with a light dumbbell','Sit-to-stand from a stable chair');
  const push = pick('chest-press','Machine chest press','Dumbbell floor press','Wall press-up');
  const row = has('cable-row') ? 'Seated cable row' : has('dumbbells') ? 'Supported one-arm dumbbell row' : has('bands') ? 'Seated band row around feet (inspect band first)' : 'Prone W raise (light posture exercise; not an equivalent loaded row)';
  const pull = has('lat-pulldown') ? 'Lat pulldown to upper chest' : row;
  const hinge = has('dumbbells') && !novice ? 'Light dumbbell Romanian deadlift, after coached practice' : 'Glute bridge';
  const cardio = has('cycle') ? 'Easy stationary cycling' : 'Brisk walking on a level surface';
  const exercises = (names: string[]) => names.map(n => `${n} — ${n.includes('Bird-dog') || n.includes('Dead bug') ? '2 × 5 slow repetitions each side' : dose}`);
  const dayCounts = [2, Math.min(3,p.days), 2, Math.min(novice ? 3 : 4,p.days)];
  const templates = [
    {title:'Foundation full body', a:[squat,push,row,'Bird-dog'], b:[hinge,push,pull,'Supported standing calf raise']},
    {title:'Strength skills', a:[squat,row,push,'Dead bug'], b:[hinge,pull,'Supported split squat (small, comfortable range)','Bird-dog']},
    {title:'Busy-week essentials', a:[squat,push,row], b:[hinge,push,pull,'Dead bug']},
    {title:'Balanced movement', a:[squat,row,'Wall press-up','Bird-dog'], b:[hinge,pull,'Supported standing calf raise','Dead bug']},
  ];
  const workouts = templates.map((t,i) => ({title:t.title, summary:`${dayCounts[i]} strength days/week · ${i===2 ? '20–30' : '30–40'} minutes/session · ${novice ? 'beginner' : 'regular exerciser'}`, sections:[
    {title:'Weekly rhythm',lines:[dayCounts[i]===2 ? 'Monday A, Thursday B; other days easy movement or rest.' : dayCounts[i]===3 ? 'Monday A, Wednesday B, Friday A; reverse A/B next week.' : 'Monday A, Wednesday B, Friday A, Sunday B; next strength session Tuesday. Keep at least a day between full-body sessions.', `Warm up with 5 minutes of easy movement. ${cardio}: start with ${p.activity==='seated' ? '10' : '15–20'} minutes on 3–5 days, accounting for activity already done at work. Increase gradually as comfortable.`, 'Choose ONE of these four workout options; do not combine all four.']},
    {title:'Session A',lines:exercises(t.a)}, {title:'Session B',lines:exercises(t.b)},
    {title:'Equipment alternatives',lines:['Leg press → light goblet squat → chair sit-to-stand.','Chest press → dumbbell floor press → wall press-up.','Cable row / pulldown → supported dumbbell row or band row. Without resistance equipment, use gentle W raises for posture; add supervised pulling when equipment is available.','Cycle / treadmill → level-ground walking. A replacement trains a similar area, but is not always an exact equivalent.']},
    {title:'Progress and recovery',lines:[`Finish with 2–3 repetitions still possible; avoid training to failure. ${novice ? 'For the first week, one set per exercise is enough if needed.' : 'Increase repetitions before using a heavier weight.'}`, 'When all sets feel controlled for two sessions, add 1–2 repetitions or the smallest weight increase, not both. Reduce volume on physically demanding work days.', 'Stop for sharp pain, dizziness, chest pain or unusual breathlessness; seek appropriate medical help. Ask a trainer to check technique.']}
  ]}));
  const allergic = (a: string) => p.allergies.includes(a);
  const bread = allergic('wheat') ? '2 small bajra/jowar rotis made without wheat' : '2 small whole-wheat rotis';
  const dairy = allergic('milk') ? '½–1 cup cooked chana' : '1 cup plain curd';
  const snack = allergic('peanuts') ? 'a small handful of roasted chana' : 'a small handful of unsalted peanuts or roasted chana';
  const protein = p.preference==='non-vegetarian' ? (!allergic('eggs') ? '2 well-cooked eggs' : 'a palm-sized portion of cooked chicken') : (!allergic('soy') ? 'soya-chunk curry (about 30 g dry chunks before cooking)' : '1 cup cooked rajma');
  const supper = p.preference==='non-vegetarian' ? (!allergic('fish') ? 'a palm-sized portion of cooked local fish or chicken' : 'a palm-sized portion of cooked chicken') : '1 cup cooked dal or chana';
  const menus = [
    {title:'Everyday home thali', meals:[['Breakfast',`1 bowl vegetable poha + ${dairy}`],['Lunch',`${bread} + 1 cup dal + 1–2 cups seasonal sabzi`],['Snack',`1 seasonal fruit + ${snack}`],['Dinner',`1 cup cooked rice + ${protein} + 1–2 cups vegetables`]]},
    {title:'Rice & dal comfort',meals:[['Breakfast',`2–3 idlis + 1 cup sambar`],['Lunch',`1 cup cooked rice + 1 cup rajma + cooked vegetables`],['Snack',`1 banana or guava + ${dairy}`],['Dinner',`${bread} + ${supper} + seasonal vegetables`]]},
    {title:'Hostel-friendly basics',meals:[['Breakfast',`2 besan chillas with vegetables + ${dairy}`],['Lunch',`Mess thali: ${bread}, 1 cup dal and 1–2 cups sabzi`],['Snack',`1 seasonal fruit + ${snack}`],['Dinner',`1 bowl vegetable moong khichdi + ${protein}`]]},
    {title:'Local grains & legumes',meals:[['Breakfast',`1 bowl vegetable rice upma + ½–1 cup cooked chana`],['Lunch',`${bread} + ${protein} + cooked greens`],['Snack',`1 seasonal fruit + ${dairy}`],['Dinner',`1 cup cooked rice + ${supper} + 1–2 cups mixed vegetables`]]},
  ];
  const adjustment = p.goal==='strength' || p.activity==='physical' ? 'For active work or strength training, add a roti or ½ cup cooked rice and an extra serving of dal/curd if hungry. These are starting portions, not a fixed intake target.' : p.goal==='weight-management' ? 'Keep regular balanced meals. Prefer water over sugary drinks, avoid routinely fried snacks, and adjust portions with a dietitian rather than skipping meals.' : 'Adjust grain and protein portions to appetite, energy, recovery and your usual meals. These starting portions are not a calorie prescription.';
  const diets = menus.map(m => ({title:m.title,summary:`${p.preference==='vegetarian' ? 'Vegetarian (no eggs/meat/fish)' : 'Non-vegetarian'} · everyday Indian staples`,sections:[
    ...m.meals.map(([title,meal]) => ({title,lines:[meal]})),
    {title:'Make it yours',lines:[adjustment,'Use seasonal vegetables and local fruit; rice, atta, dal, chana and roasted gram keep the shopping list simple. Prices vary by city and season; no supplement purchase is required.',`All portions are cooked/ready-to-eat unless marked dry. A cup is approximately 240 ml; katori sizes differ. ${allergic('wheat') ? 'Use verified wheat-free ingredients and separate utensils for allergy/celiac needs.' : ''}`]},
    {title:'Food safety & variety',lines:['Wash produce, cook pulses thoroughly, refrigerate perishables promptly, and fully cook eggs/meat/fish. Avoid raw sprouts and raw eggs.','Check packaged ingredients and cross-contact for every declared allergy; substitutions are not a guarantee of allergen-free preparation.','Include varied vegetables, fruit, pulses and whole grains over the week. Drink water regularly; heat and sweating change needs. Follow clinician advice if fluids are restricted.']}
  ]}));
  return {version:1,bmi:Math.round(p.weight/((p.height/100)**2)*10)/10,summary:`Based on ${p.activity==='seated' ? 'mostly seated days' : p.activity==='physical' ? 'physically demanding days' : 'mixed sitting and walking'}, ${p.experience} experience, ${p.days} available days and ${p.preference} food preferences.`,notes:['BMI is a screening measure, not a diagnosis or a measure of muscle mass. No calorie target is inferred from BMI.','These are general templates adapted to your answers. Pick one workout option and one meal-day option; rotate meal options for variety.','Work gradually towards 150–300 minutes of moderate weekly activity and strength work on at least two days. Everyday activity counts; beginners can start below this target.'],workouts,diets};
}
