'use client';
import { useState } from 'react';
import { generateMemberPlans } from '@/actions/member-wellness';
import { ALLERGENS, EQUIPMENT, type WellnessOption, type WellnessProfile, type WellnessResult } from '@/lib/wellness';

const field = 'w-full rounded-xl border border-surface-container-high bg-white px-3 py-3 text-sm mt-1';
function Option({ option }: { option: WellnessOption }) {
  return <details className="rounded-2xl border border-surface-container-high bg-white p-4">
    <summary className="cursor-pointer font-bold text-sm min-h-11"><span>{option.title}</span><p className="font-normal text-outline text-xs mt-2">{option.summary}</p></summary>
    <div className="pt-4 space-y-4">{option.sections.map(s => <section key={s.title}><h4 className="font-semibold text-sm mb-2">{s.title}</h4><ul className="list-disc pl-5 text-sm space-y-2 text-on-surface-variant">{s.lines.map((line,i) => <li key={i}>{line}</li>)}</ul></section>)}</div>
  </details>;
}
export function MemberWellness({ initialResult }: { initialResult: WellnessResult | null }) {
  const [result,setResult] = useState(initialResult);
  const [edit,setEdit] = useState(!initialResult);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [p,setP] = useState<WellnessProfile>({age:0,height:0,weight:0,preference:'vegetarian',activity:'seated',experience:'beginner',goal:'fitness',days:2,equipment:[],allergies:[],needsReview:false});
  const set = <K extends keyof WellnessProfile>(key: K, value: WellnessProfile[K]) => setP(old => ({...old,[key]:value}));
  const bmi = p.height && p.weight ? (p.weight/(p.height/100)**2).toFixed(1) : '—';
  const toggle = (key:'equipment'|'allergies',value:string) => set(key,p[key].includes(value) ? p[key].filter(v=>v!==value) : [...p[key],value]);
  return <section className="space-y-5">
    <div className="flex items-center justify-between gap-3"><h2 className="font-sora text-xl font-bold">Your personal options</h2>{result && <button onClick={()=>setEdit(!edit)} className="text-sm underline p-2">{edit?'Close form':'Update answers'}</button>}</div>
    {edit && <form className="p-5 rounded-2xl border border-surface-container-high bg-white space-y-5" onSubmit={async e=>{
      e.preventDefault(); if(busy)return; setBusy(true);setError('');
      try {const r=await generateMemberPlans(p);if(r.ok&&r.result){setResult(r.result);setEdit(false);}else setError(r.error||'Could not generate plans.');}
      catch{setError('Connection interrupted. Please retry.');}finally{setBusy(false);}
    }}>
      <p className="text-sm text-outline">Get four workout options and four meal-day options using affordable Indian staples. For adults 18–64. Choose the option that fits your week.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{(['age','height','weight'] as const).map((key)=><label className="text-sm font-semibold" key={key}>{key==='age'?'Age (years)':key==='height'?'Height (cm)':'Weight (kg)'}<input className={field} type="number" required min={key==='age'?18:key==='height'?120:30} max={key==='age'?64:key==='height'?230:250} step={key==='age'?1:0.1} value={p[key]||''} onChange={e=>set(key,Number(e.target.value))}/></label>)}</div>
      <p className="text-sm">Calculated BMI: <strong>{bmi}</strong> <span className="text-outline">· a screening number, not a diagnosis.</span></p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-semibold">Food preference<select className={field} value={p.preference} onChange={e=>set('preference',e.target.value as WellnessProfile['preference'])}><option value="vegetarian">Vegetarian (no eggs)</option><option value="non-vegetarian">Non-vegetarian</option></select></label>
        <label className="text-sm font-semibold">Daily physical activity<select className={field} value={p.activity} onChange={e=>set('activity',e.target.value as WellnessProfile['activity'])}><option value="seated">Mostly seated / studying / desk work</option><option value="mixed">Some walking and standing</option><option value="physical">Physical work / on my feet most of the day</option></select></label>
        <label className="text-sm font-semibold">Training experience<select className={field} value={p.experience} onChange={e=>set('experience',e.target.value as WellnessProfile['experience'])}><option value="beginner">Beginner / returning after a break</option><option value="regular">Regular strength training</option></select></label>
        <label className="text-sm font-semibold">Main goal<select className={field} value={p.goal} onChange={e=>set('goal',e.target.value as WellnessProfile['goal'])}><option value="fitness">General fitness</option><option value="strength">Build strength</option><option value="weight-management">Manage weight sustainably</option></select></label>
        <label className="text-sm font-semibold">Days available each week<select className={field} value={p.days} onChange={e=>set('days',Number(e.target.value))}>{[2,3,4].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>
      </div>
      <fieldset><legend className="font-semibold text-sm mb-2">Available equipment (leave empty for bodyweight)</legend><div className="grid grid-cols-2 gap-2">{EQUIPMENT.map(eq=><label className="flex items-center gap-2 text-sm min-h-11" key={eq}><input type="checkbox" checked={p.equipment.includes(eq)} onChange={()=>toggle('equipment',eq)}/>{eq.replaceAll('-',' ')}</label>)}</div></fieldset>
      <fieldset><legend className="font-semibold text-sm mb-2">Allergies / foods to exclude (select all that apply)</legend><div className="grid grid-cols-2 gap-2">{ALLERGENS.map(a=><label className="flex items-center gap-2 text-sm min-h-11" key={a}><input type="checkbox" checked={p.allergies.includes(a)} onChange={()=>toggle('allergies',a)}/>{a}</label>)}</div></fieldset>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={p.needsReview} onChange={e=>set('needsReview',e.target.checked)}/><span>I have an injury, pregnancy/postpartum needs, an eating disorder, a medical condition, or a prescribed diet/exercise restriction that needs professional guidance.</span></label>
      <p className="text-xs text-outline">Your resulting plans and BMI are saved to your member account. The raw questionnaire answers are not saved. General templates do not replace a clinician, dietitian or trainer.</p>
      {error && <p role="alert" className="p-3 rounded-xl bg-amber-50 text-amber-900 text-sm">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-primary text-on-primary py-3 font-bold disabled:opacity-50">{busy?'Preparing your options…':'Create my 4 workout + 4 diet options'}</button>
    </form>}
    {result && <div className="space-y-5">
      <div className="p-4 bg-secondary-container rounded-2xl text-sm space-y-2"><p className="font-semibold">BMI {result.bmi} · Your saved options</p><p>{result.summary}</p>{result.notes.map(n=><p key={n}>{n}</p>)}</div>
      <h3 className="font-sora text-lg font-semibold">4 workout options</h3><div className="grid md:grid-cols-2 gap-3 items-start">{result.workouts.map(o=><Option key={o.title} option={o}/>)}</div>
      <h3 className="font-sora text-lg font-semibold">4 diet options</h3><div className="grid md:grid-cols-2 gap-3 items-start">{result.diets.map(o=><Option key={o.title} option={o}/>)}</div>
    </div>}
    <p className="text-xs text-outline leading-relaxed">Guidance: <a className="underline" href="https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf" target="_blank" rel="noreferrer">ICMR–NIN Dietary Guidelines for Indians (2024)</a> · <a className="underline" href="https://www.who.int/publications/i/item/9789240015128" target="_blank" rel="noreferrer">WHO physical activity guidelines</a> · <a className="underline" href="https://www.nhs.uk/live-well/exercise/strength-exercises/" target="_blank" rel="noreferrer">NHS beginner strength exercises</a>. These organisations provide the principles; NeuraFitness assembles the options.</p>
  </section>;
}
