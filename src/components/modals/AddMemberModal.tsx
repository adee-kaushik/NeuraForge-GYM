import React, { useState, useMemo } from 'react';
import { MembershipPlan, NewMemberInput, PaymentMode } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  plans: MembershipPlan[];
  onClose: () => void;
  onAddMember: (input: NewMemberInput) => Promise<boolean>;
}

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors';

const DEFAULT_PHONE = '+91 ';

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, plans, onClose, onAddMember }) => {
  const defaultPlanId = (plans.find((p) => p.popular) ?? plans[0])?.id ?? '';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [planId, setPlanId] = useState(defaultPlanId);
  const [biometricId, setBiometricId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [recordPayment, setRecordPayment] = useState(true);

  // 1. Timings (Morning / Evening slot)
  const [timingSlot, setTimingSlot] = useState<'MORNING' | 'EVENING' | 'BOTH'>('MORNING');

  // 2. Custom Discount
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountValue, setDiscountValue] = useState('');

  // 3. Due Payments & Renewal Days
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [customRenewalDays, setCustomRenewalDays] = useState('30');
  const [renewalPreset, setRenewalPreset] = useState<'7' | '15' | '30' | 'full' | 'custom'>('30');

  // 4. BMI Calculator
  const [showBmiCalc, setShowBmiCalc] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('8');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Selected plan calculation
  const plan = plans.find((p) => p.id === planId) ?? plans[0] ?? { id: '', price: 0, durationMonths: 1, durationLabel: '1 Month', name: 'Plan', features: [] };

  // Calculate discount amount
  const calculatedDiscount = useMemo(() => {
    if (!showDiscount || !discountValue) return 0;
    const parsed = parseFloat(discountValue) || 0;
    if (parsed <= 0) return 0;
    if (discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, parsed));
      return Math.round((plan.price * pct) / 100);
    }
    return Math.min(plan.price, Math.max(0, Math.round(parsed)));
  }, [showDiscount, discountValue, discountType, plan.price]);

  const finalEffectivePrice = Math.max(0, plan.price - calculatedDiscount);

  // Partial / Due payment calculation
  const paidNowNum = useMemo(() => {
    if (!isPartialPayment) return finalEffectivePrice;
    const parsed = parseFloat(amountPaidNow) || 0;
    return Math.max(0, Math.min(finalEffectivePrice, Math.round(parsed)));
  }, [isPartialPayment, amountPaidNow, finalEffectivePrice]);

  const dueAmountNum = Math.max(0, finalEffectivePrice - paidNowNum);

  // Renewal days calculation & preview
  const resolvedRenewalDays = useMemo(() => {
    if (!isPartialPayment) return plan.durationMonths * 30;
    if (renewalPreset === 'full') return plan.durationMonths * 30;
    if (renewalPreset === '7') return 7;
    if (renewalPreset === '15') return 15;
    if (renewalPreset === '30') return 30;
    const custom = parseInt(customRenewalDays, 10);
    return Number.isFinite(custom) && custom > 0 ? custom : 30;
  }, [isPartialPayment, renewalPreset, customRenewalDays, plan.durationMonths]);

  const renewalExpiryPreview = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + resolvedRenewalDays);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [resolvedRenewalDays]);

  // BMI calculation
  const calculatedHeightCm = useMemo(() => {
    if (heightUnit === 'cm') {
      return parseFloat(heightCm) || 0;
    }
    const ft = parseFloat(heightFt) || 0;
    const inch = parseFloat(heightIn) || 0;
    return Math.round((ft * 30.48 + inch * 2.54) * 10) / 10;
  }, [heightUnit, heightCm, heightFt, heightIn]);

  const bmiData = useMemo(() => {
    const w = parseFloat(weightKg) || 0;
    const h = calculatedHeightCm;
    if (w <= 0 || h <= 50) return null;
    const hM = h / 100;
    const score = Math.round((w / (hM * hM)) * 10) / 10;

    let category = 'Normal';
    let colorClass = 'text-[#4edea3] border-[#4edea3]/40 bg-[#4edea3]/10';
    let label = 'Healthy Weight';

    if (score < 18.5) {
      category = 'Underweight';
      colorClass = 'text-[#7bd0ff] border-[#7bd0ff]/40 bg-[#7bd0ff]/10';
      label = 'Underweight';
    } else if (score < 25) {
      category = 'Normal';
      colorClass = 'text-[#4edea3] border-[#4edea3]/40 bg-[#4edea3]/10';
      label = 'Normal / Healthy';
    } else if (score < 30) {
      category = 'Overweight';
      colorClass = 'text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10';
      label = 'Overweight';
    } else {
      category = 'Obese';
      colorClass = 'text-[#f87171] border-[#f87171]/40 bg-[#f87171]/10';
      label = 'Obese';
    }

    // Ideal healthy weight range for height
    const minWeight = Math.round(18.5 * hM * hM);
    const maxWeight = Math.round(24.9 * hM * hM);

    return { score, category, label, colorClass, minWeight, maxWeight };
  }, [weightKg, calculatedHeightCm]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid phone number (at least 10 digits).');
      return;
    }

    if (isPartialPayment && dueAmountNum > 0 && resolvedRenewalDays <= 0) {
      setError('Please specify valid renewal / validity days for partial payment.');
      return;
    }

    setSubmitting(true);
    const ok = await onAddMember({
      name,
      phone,
      email,
      dob: dob || undefined,
      planId: plan.id,
      recordPayment,
      paymentMode,
      biometricId: biometricId.trim() || undefined,
      timingSlot,
      discountAmount: calculatedDiscount > 0 ? calculatedDiscount : undefined,
      discountType,
      isPartialPayment,
      amountPaidNow: isPartialPayment ? paidNowNum : undefined,
      dueAmount: isPartialPayment ? dueAmountNum : undefined,
      customRenewalDays: isPartialPayment ? resolvedRenewalDays : undefined,
      weight: parseFloat(weightKg) || undefined,
      height: calculatedHeightCm > 0 ? calculatedHeightCm : undefined,
      bmi: bmiData ? bmiData.score : undefined,
      bmiCategory: bmiData ? bmiData.category : undefined,
    });
    setSubmitting(false);
    if (!ok) return;

    // Reset form
    setName('');
    setPhone(DEFAULT_PHONE);
    setEmail('');
    setDob('');
    setBiometricId('');
    setPlanId(defaultPlanId);
    setPaymentMode('UPI');
    setRecordPayment(true);
    setTimingSlot('MORNING');
    setShowDiscount(false);
    setDiscountValue('');
    setIsPartialPayment(false);
    setAmountPaidNow('');
    setCustomRenewalDays('30');
    setRenewalPreset('30');
    setShowBmiCalc(false);
    setWeightKg('');
    setHeightCm('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-surface-container-low border border-primary-container/40 rounded-2xl shadow-[0_0_50px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Corner neon accents */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-secondary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-secondary"></div>

        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 text-primary flex items-center justify-center border border-primary/40 shadow-xs">
              <span className="material-symbols-outlined text-xl">person_add</span>
            </div>
            <div>
              <h3 className="font-sora text-base font-semibold text-on-surface">Add New Member</h3>
              <p className="text-xs text-outline">Register member details, timings, discount, dues &amp; BMI</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Member Basic Information */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Malhotra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone Number (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-secondary">cake</span>
                    <span>Date of Birth (DOB)</span>
                  </label>
                  <span className="text-[10px] text-outline">Birthday wishes 🎂</span>
                </div>
                <input
                  type="date"
                  value={dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Biometric machine ID (digits only) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-sm text-secondary">fingerprint</span>
                  <span>Biometric ID (number on the machine)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={biometricId}
                  onChange={(e) => setBiometricId(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Auto-assigned if left blank"
                  className={`${inputClass} font-mono`}
                />
                <p className="text-[10px] text-outline mt-1">
                  Enroll the member's finger or face on the machine under this same number. Digits only.
                </p>
              </div>
            </div>
          </div>

          {/* 1. TIMING SLOT (MORNING / EVENING SLOT) */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>Workout Timing Slot *</span>
              </label>
              <span className="text-[10px] text-outline font-medium">Slot allocation</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimingSlot('MORNING')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  timingSlot === 'MORNING'
                    ? 'bg-amber-500/25 border-amber-400 text-[#fde047] font-bold shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                    : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:border-outline'
                }`}
              >
                <div className={`flex items-center gap-1 text-xs font-bold ${timingSlot === 'MORNING' ? 'text-[#fde047]' : 'text-on-surface'}`}>
                  <span>🌅</span>
                  <span>Morning Slot</span>
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${timingSlot === 'MORNING' ? 'text-amber-200' : 'text-slate-300'}`}>
                  6:00 AM – 11:30 AM
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingSlot('EVENING')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  timingSlot === 'EVENING'
                    ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 font-bold shadow-[0_0_14px_rgba(129,140,248,0.3)]'
                    : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:border-outline'
                }`}
              >
                <div className={`flex items-center gap-1 text-xs font-bold ${timingSlot === 'EVENING' ? 'text-indigo-200' : 'text-on-surface'}`}>
                  <span>🌇</span>
                  <span>Evening Slot</span>
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${timingSlot === 'EVENING' ? 'text-indigo-200' : 'text-slate-300'}`}>
                  4:30 PM – 10:30 PM
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingSlot('BOTH')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  timingSlot === 'BOTH'
                    ? 'bg-primary/25 border-primary text-primary font-bold shadow-[0_0_14px_rgba(148,125,255,0.3)]'
                    : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:border-outline'
                }`}
              >
                <div className={`flex items-center gap-1 text-xs font-bold ${timingSlot === 'BOTH' ? 'text-primary' : 'text-on-surface'}`}>
                  <span>⚡</span>
                  <span>Flexible</span>
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${timingSlot === 'BOTH' ? 'text-primary/90' : 'text-slate-300'}`}>
                  Full Day Access
                </span>
              </button>
            </div>
          </div>

          {/* 4. BMI & FITNESS CALCULATOR */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#4edea3]">monitor_weight</span>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  BMI Calculator &amp; Fitness Metrics
                </span>
                {bmiData && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bmiData.colorClass}`}>
                    BMI {bmiData.score} · {bmiData.category}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowBmiCalc(!showBmiCalc)}
                className="text-xs font-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{showBmiCalc ? 'Collapse' : bmiData ? 'Edit BMI' : '+ Calculate BMI'}</span>
                <span className="material-symbols-outlined text-sm">
                  {showBmiCalc ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {showBmiCalc && (
              <div className="pt-2 border-t border-surface-container-high/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Weight Input */}
                  <div>
                    <label className="text-[11px] font-bold text-outline block mb-1">
                      Body Weight (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="20"
                        max="300"
                        step="0.5"
                        placeholder="e.g. 70"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className={inputClass}
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-outline">kg</span>
                    </div>
                  </div>

                  {/* Height Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-outline">Height</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setHeightUnit('cm')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            heightUnit === 'cm' ? 'bg-secondary text-[#001f28]' : 'text-outline hover:text-on-surface'
                          }`}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeightUnit('ft')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            heightUnit === 'ft' ? 'bg-secondary text-[#001f28]' : 'text-outline hover:text-on-surface'
                          }`}
                        >
                          ft / in
                        </button>
                      </div>
                    </div>

                    {heightUnit === 'cm' ? (
                      <div className="relative">
                        <input
                          type="number"
                          min="50"
                          max="250"
                          placeholder="e.g. 175"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          className={inputClass}
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-outline">cm</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="3"
                            max="8"
                            value={heightFt}
                            onChange={(e) => setHeightFt(e.target.value)}
                            className={inputClass}
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-outline">ft</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            value={heightIn}
                            onChange={(e) => setHeightIn(e.target.value)}
                            className={inputClass}
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-outline">in</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BMI Result Banner */}
                {bmiData && (
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${bmiData.colorClass}`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-sora text-sm font-bold">
                          BMI: {bmiData.score}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-lowest/80">
                          {bmiData.label}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90">
                        Healthy weight for {Math.round(calculatedHeightCm)} cm height: <b>{bmiData.minWeight} – {bmiData.maxWeight} kg</b>
                      </p>
                    </div>
                    <div className="text-[11px] font-bold shrink-0">
                      ✓ Will be saved to member record
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan selection */}
          <div>
            <label className={`${labelClass} mb-1.5`}>Choose a Plan *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    planId === p.id
                      ? 'bg-surface-container-high border-primary text-primary shadow-[0_0_12px_rgba(148,125,255,0.2)]'
                      : 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="text-xs font-semibold mt-0.5 text-on-surface">₹{p.price.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-outline">{p.durationLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. CUSTOM DISCOUNT BUTTON & SECTION */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-tertiary">loyalty</span>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Custom Discount
                </span>
                {calculatedDiscount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                    -₹{calculatedDiscount.toLocaleString('en-IN')} OFF
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDiscount(!showDiscount);
                  if (showDiscount) setDiscountValue('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  showDiscount
                    ? 'bg-tertiary text-[#002113]'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-tertiary border border-tertiary/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{showDiscount ? 'check' : 'add'}</span>
                <span>{showDiscount ? 'Discount Active' : '+ Custom Discount'}</span>
              </button>
            </div>

            {showDiscount && (
              <div className="pt-2 border-t border-surface-container-high/60 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg bg-surface-container-lowest border border-surface-container-high p-0.5">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        discountType === 'flat' ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      Flat (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        discountType === 'percentage' ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      Percent (%)
                    </button>
                  </div>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : plan.price}
                      placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className={inputClass}
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-outline">
                      {discountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-outline font-bold">Quick:</span>
                  {(discountType === 'flat' ? [100, 200, 500, 1000] : [5, 10, 15, 20]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountValue(String(val))}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                        discountValue === String(val)
                          ? 'bg-tertiary text-[#002113] font-bold'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high border border-surface-container-high'
                      }`}
                    >
                      {discountType === 'flat' ? `₹${val}` : `${val}%`}
                    </button>
                  ))}
                </div>

                {calculatedDiscount > 0 && (
                  <div className="p-2 rounded-lg bg-surface-container-lowest flex items-center justify-between text-xs border border-tertiary/20">
                    <span className="text-outline">
                      Original: <s className="text-outline">₹{plan.price.toLocaleString('en-IN')}</s>
                    </span>
                    <span className="text-tertiary font-bold">
                      Discount: -₹{calculatedDiscount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-on-surface font-bold">
                      Net: ₹{finalEffectivePrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. DUE PAYMENTS & MEMBERSHIP RENEWAL DAYS */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-error">pending_actions</span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface block">
                    Due / Partial Payment
                  </span>
                  <span className="text-[10px] text-outline">
                    Member pays some amount now, gives balance later
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPartialPayment(!isPartialPayment);
                  if (!isPartialPayment && !amountPaidNow) {
                    setAmountPaidNow(String(Math.round(finalEffectivePrice / 2)));
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  isPartialPayment
                    ? 'bg-error text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-error border border-error/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{isPartialPayment ? 'check_circle' : 'hourglass_top'}</span>
                <span>{isPartialPayment ? 'Due Payment Enabled' : '+ Add Due Payment'}</span>
              </button>
            </div>

            {isPartialPayment && (
              <div className="pt-3 border-t border-surface-container-high/60 space-y-3 animate-in fade-in">
                {/* Amount Paid Now vs Due */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Amount Paid Now (₹) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={finalEffectivePrice}
                        required
                        value={amountPaidNow}
                        onChange={(e) => setAmountPaidNow(e.target.value)}
                        placeholder="e.g. 1000"
                        className={inputClass}
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-outline">₹</span>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Remaining Due Balance</label>
                    <div className="px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-error/40 flex items-center justify-between">
                      <span className="font-sora text-sm font-bold text-error">
                        ₹{dueAmountNum.toLocaleString('en-IN')} Due
                      </span>
                      <span className="text-[10px] uppercase font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>

                {/* Membership Renewal / Validity Days */}
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-secondary/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      <span>Renewal / Validity Days for Partial Payment *</span>
                    </span>
                    <span className="text-[10px] text-outline font-semibold">
                      Valid until: <b className="text-tertiary">{renewalExpiryPreview}</b>
                    </span>
                  </div>
                  <p className="text-[11px] text-outline">
                    Specify how many days this membership will be valid/renewed until the remaining balance is paid.
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { key: '7', label: '7 Days (1w)' },
                      { key: '15', label: '15 Days (Half-mo)' },
                      { key: '30', label: '30 Days (1mo)' },
                      { key: 'full', label: `Full Plan (${plan.durationMonths * 30}d)` },
                      { key: 'custom', label: 'Custom' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRenewalPreset(item.key as typeof renewalPreset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          renewalPreset === item.key
                            ? 'bg-secondary text-[#001f28] font-bold shadow-xs'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {renewalPreset === 'custom' && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-outline">Days:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customRenewalDays}
                          onChange={(e) => setCustomRenewalDays(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-16 bg-surface-container border border-surface-container-high rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method & Total Payable Summary */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className={labelClass}>Payment Method</label>
                <div className="flex items-center gap-2">
                  {(['UPI', 'Cash', 'Card'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface-container border-surface-container-high text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-outline block">
                  {isPartialPayment ? 'Paid Today' : 'Total Payable'}
                </span>
                <span className="font-sora text-lg font-bold text-on-surface">
                  ₹{(isPartialPayment ? paidNowNum : finalEffectivePrice).toLocaleString('en-IN')}
                </span>
                {isPartialPayment && dueAmountNum > 0 && (
                  <span className="text-[11px] text-error font-bold block">
                    + ₹{dueAmountNum.toLocaleString('en-IN')} Due Later
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-surface-container-high/50">
              <input
                type="checkbox"
                id="recordPayment"
                checked={recordPayment}
                onChange={(e) => setRecordPayment(e.target.checked)}
                className="accent-[#947dff] rounded w-4 h-4 cursor-pointer"
              />
              <label htmlFor="recordPayment" className="text-xs text-on-surface-variant cursor-pointer">
                {isPartialPayment
                  ? `Record paid amount ₹${paidNowNum.toLocaleString('en-IN')} & mark ₹${dueAmountNum.toLocaleString('en-IN')} as pending due`
                  : `Record payment of ₹${finalEffectivePrice.toLocaleString('en-IN')} and generate GST invoice`}
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-error font-semibold p-2 rounded bg-error/10 border border-error/20">{error}</p>}

          {/* Footer */}
          <div className="pt-3 border-t border-surface-container-high flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_20px_rgba(148,125,255,0.35)] cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {submitting && (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              )}
              <span>{submitting ? 'Registering...' : 'Add Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

