'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import QRCode from 'qrcode';
import { getPublicGymJoinInfo, submitSelfEnrollment, PublicGymJoinInfo } from '@/actions/enrollments';
import { MembershipPlan } from '@/types';

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export default function JoinGymPage({ params }: JoinPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicGymJoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [timingSlot, setTimingSlot] = useState<'MORNING' | 'EVENING' | 'BOTH'>('MORNING');

  // BMI states
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Selected Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // UPI payment
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentOption, setPaymentOption] = useState<'UPI' | 'CASH'>('UPI');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch gym info
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicGymJoinInfo(slug)
      .then((res) => {
        setLoading(false);
        if ('data' in res && res.ok) {
          setData(res.data);
          if (res.data.plans.length > 0) {
            setSelectedPlanId(res.data.plans[0].id);
          }
        } else if ('error' in res) {
          setError(res.error);
        } else {
          setError('Gym details not found.');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('Could not connect to gym servers.');
      });
  }, [slug]);

  // Selected plan object
  const selectedPlan: MembershipPlan | undefined = useMemo(() => {
    return data?.plans.find((p) => p.id === selectedPlanId);
  }, [data, selectedPlanId]);

  // Dynamic BMI Calculation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightInM = h / 100;
    const val = parseFloat((w / (heightInM * heightInM)).toFixed(1));
    let category = 'Normal';
    let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30';
    if (val < 18.5) {
      category = 'Underweight';
      color = 'text-sky-400 bg-sky-500/10 border-sky-400/30';
    } else if (val >= 25 && val < 30) {
      category = 'Overweight';
      color = 'text-amber-400 bg-amber-500/10 border-amber-400/30';
    } else if (val >= 30) {
      category = 'Obese';
      color = 'text-rose-400 bg-rose-500/10 border-rose-400/30';
    }
    return { val, category, color };
  }, [height, weight]);

  // Generate UPI QR and deep link
  const upiId = data?.gym.upiId || '';
  const gymName = data?.gym.name || 'Gym';
  const planPrice = selectedPlan?.price || 0;

  const upiDeepLink = useMemo(() => {
    if (!upiId || !planPrice) return '';
    const cleanUpi = upiId.trim();
    const cleanGym = encodeURIComponent(gymName);
    const cleanNotes = encodeURIComponent(`Gym Join - ${name.trim() || 'Member'}`);
    return `upi://pay?pa=${cleanUpi}&pn=${cleanGym}&am=${planPrice}&cu=INR&tn=${cleanNotes}`;
  }, [upiId, gymName, planPrice, name]);

  useEffect(() => {
    if (!upiDeepLink) {
      setUpiQrUrl('');
      return;
    }
    QRCode.toDataURL(
      upiDeepLink,
      {
        width: 220,
        margin: 1,
        color: {
          dark: '#0a0a0c',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setUpiQrUrl(url);
        }
      }
    );
  }, [upiDeepLink]);

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!selectedPlanId) {
      setFormError('Please select a membership plan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitSelfEnrollment({
        gymSlug: slug,
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined,
        gender,
        dob: dob || undefined,
        planId: selectedPlanId,
        timingSlot,
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        bmi: bmiInfo?.val,
        bmiCategory: bmiInfo?.category,
        utrNumber: paymentOption === 'UPI' ? utrNumber.trim() || undefined : undefined,
      });

      setSubmitting(false);
      if ('ok' in res && res.ok) {
        setSubmitSuccess(true);
      } else if ('error' in res) {
        setFormError(res.error);
      } else {
        setFormError('Failed to submit enrollment.');
      }
    } catch {
      setSubmitting(false);
      setFormError('Network error. Please try again or notify front desk.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070911] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#7bd0ff] animate-spin">
            progress_activity
          </span>
          <p className="text-xs text-slate-400 font-mono tracking-wider">
            Loading {slug} Front Desk Portal...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#070911] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#121624] border border-rose-500/40 p-6 rounded-2xl text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-rose-400">error</span>
          <h2 className="text-lg font-bold text-white">Gym Portal Not Found</h2>
          <p className="text-xs text-slate-400">
            {error || `No gym found with code "${slug}". Please scan the QR code placed at the front desk.`}
          </p>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#070911] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#121624] border border-secondary/40 p-7 rounded-2xl text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[#4edea3]/20 border border-[#4edea3]/40 text-[#4edea3] flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4edea3] bg-[#4edea3]/10 px-2.5 py-0.5 rounded-full border border-[#4edea3]/30">
              Registration Received
            </span>
            <h2 className="text-xl font-bold text-white mt-2">
              Welcome to {data.gym.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Hi <strong>{name}</strong>, your details and selected plan (<strong>{selectedPlan?.name}</strong>) have been sent to the gym staff.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 text-secondary font-bold">
              <span className="material-symbols-outlined text-base">fingerprint</span>
              <span>Next Step: Biometric Activation</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Please meet your trainer or front desk staff. They will approve your admission and register your fingerprint/face ID on the biometric turnstile terminal for instant gym access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitSuccess(false);
              setName('');
              setPhone('');
              setUtrNumber('');
            }}
            className="w-full py-2.5 rounded-xl bg-secondary text-[#001f28] font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            Register Another Member
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070911] text-white selection:bg-secondary/30 selection:text-white pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#121624] via-[#1a2138] to-[#121624] border-b border-white/10 px-4 py-6 text-center">
        <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary/20 text-secondary border border-secondary/40 mb-1">
          Front Desk Self-Enrollment
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
          {data.gym.name}
        </h1>
        {data.gym.address && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">location_on</span>
            <span>{data.gym.address}</span>
          </p>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: Personal Details */}
          <div className="bg-[#121624] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <span className="w-6 h-6 rounded-full bg-secondary text-[#001f28] text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold text-white">Your Personal Details</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 pl-11 pr-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="aditya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full bg-slate-900 px-3 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-900 px-3.5 py-2 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Preferred Slot */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Training Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MORNING', label: '🌅 Morning', sub: '6 AM - 11 AM' },
                    { id: 'EVENING', label: '🌇 Evening', sub: '5 PM - 10 PM' },
                    { id: 'BOTH', label: '⚡ Flexible', sub: 'All Day Pass' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTimingSlot(s.id as 'MORNING' | 'EVENING' | 'BOTH')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        timingSlot === s.id
                          ? 'bg-secondary/20 border-secondary text-secondary shadow-xs'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold">{s.label}</span>
                      <span className="text-[10px] opacity-75">{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Fitness & BMI Metrics */}
          <div className="bg-[#121624] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary text-[#001f28] text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-white">Body Metrics &amp; BMI (Optional)</h2>
              </div>
              {bmiInfo && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${bmiInfo.color}`}>
                  BMI {bmiInfo.val} · {bmiInfo.category}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-secondary focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Choose Membership Plan */}
          <div className="bg-[#121624] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <span className="w-6 h-6 rounded-full bg-secondary text-[#001f28] text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-white">Select Membership Plan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.plans.map((p) => {
                const isSelected = p.id === selectedPlanId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-secondary/15 border-secondary shadow-[0_0_20px_rgba(123,208,255,0.25)]'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                        Popular
                      </span>
                    )}
                    <h3 className="font-sora text-sm font-bold text-white">{p.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.durationLabel}</p>

                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-extrabold text-[#4edea3]">
                        ₹{p.price.toLocaleString('en-IN')}
                      </span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-xs text-slate-500 line-through">
                          ₹{p.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {p.features && p.features.length > 0 && (
                      <ul className="mt-2.5 space-y-1 text-[11px] text-slate-300">
                        {p.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-[#4edea3] text-xs">✓</span>
                            <span className="truncate">{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Pay via Owner's UPI ID / QR */}
          <div className="bg-[#121624] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <span className="w-6 h-6 rounded-full bg-[#4edea3] text-slate-950 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h2 className="text-sm font-bold text-white">Payment via UPI / Front Desk</h2>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentOption('UPI')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentOption === 'UPI'
                    ? 'bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3]'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>Instant UPI Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentOption('CASH')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentOption === 'CASH'
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>Pay Cash at Desk</span>
              </button>
            </div>

            {paymentOption === 'UPI' && (
              <div className="space-y-4 pt-1">
                {/* Dynamic UPI QR Code */}
                {upiId ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                    <p className="text-xs text-slate-300">
                      Scan with any UPI App (GPay, PhonePe, Paytm, BHIM) to pay{' '}
                      <strong className="text-[#4edea3]">₹{planPrice.toLocaleString('en-IN')}</strong>:
                    </p>

                    {upiQrUrl && (
                      <div className="inline-block p-2.5 bg-white rounded-xl shadow-lg border-2 border-slate-800">
                        <img
                          src={upiQrUrl}
                          alt="Pay Gym Fee UPI QR"
                          className="w-40 h-40 object-contain mx-auto"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xs text-[#7bd0ff] font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                        {upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                      >
                        {copiedUpi ? 'Copied!' : 'Copy UPI'}
                      </button>
                    </div>

                    {/* 1-Tap Mobile UPI button */}
                    {upiDeepLink && (
                      <a
                        href={upiDeepLink}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4edea3] text-slate-950 text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">touch_app</span>
                        <span>Tap to Pay on GPay / PhonePe / Paytm</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-700 text-xs text-slate-300">
                    UPI ID is being configured by the gym owner. You can complete your enrollment now and pay directly at the front desk counter.
                  </div>
                )}

                {/* Enter UPI UTR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UPI Reference / UTR Number (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. 428719208391 (found in UPI app receipt)"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.trim())}
                    className="w-full bg-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-white border border-slate-700 focus:border-[#4edea3] focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Optional but helps staff verify your payment instantly.
                  </span>
                </div>
              </div>
            )}

            {paymentOption === 'CASH' && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-xs text-amber-200 space-y-1">
                <p className="font-bold">Pay ₹{planPrice.toLocaleString('en-IN')} Cash at Front Desk</p>
                <p className="text-[11px] text-amber-300/80">
                  Submit this form to register your details. Hand over the admission fee to the front desk staff to activate your gym access.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary to-[#4edea3] text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(123,208,255,0.4)] hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                <span>Submitting Registration...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">how_to_reg</span>
                <span>Complete Enrollment (₹{planPrice.toLocaleString('en-IN')})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
