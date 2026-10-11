import React, { useRef, useState } from 'react';
import { MembershipPlan, MemberRecord, Member } from '../../types';
import { importMembers, type NewPlanToCreate } from '@/actions/import';
import {
  MAX_IMPORT_ROWS,
  TEMPLATE_CSV,
  parseCsv,
  phoneKey,
  detectColumnMapping,
  tableToRowsWithMapping,
  validateRows,
  findUnmatchedPlans,
  type RawImportRow,
  type ValidatedRow,
} from '../../lib/import';

interface ImportMembersModalProps {
  isOpen: boolean;
  plans: MembershipPlan[];
  members: Member[];
  onClose: () => void;
  onImported: (members: MemberRecord[], newPlans?: MembershipPlan[]) => void;
}

type Stage = 'choose' | 'mapping' | 'plans' | 'preview' | 'done';

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({
  isOpen,
  plans,
  members,
  onClose,
  onImported,
}) => {
  const [stage, setStage] = useState<Stage>('choose');
  const [table, setTable] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<keyof RawImportRow, number>>({
    name: -1,
    phone: -1,
    email: -1,
    plan: -1,
    expiry: -1,
    memberCode: -1,
  });

  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [checked, setChecked] = useState<ValidatedRow[]>([]);
  const [unmatchedPlans, setUnmatchedPlans] = useState<string[]>([]);
  const [planOverrides, setPlanOverrides] = useState<Record<string, string>>({}); // rawName.toLowerCase() -> planId
  const [newPlansToCreate, setNewPlansToCreate] = useState<Record<string, { durationMonths: number; price: number }>>({});

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [newPlansCount, setNewPlansCount] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStage('choose');
    setTable([]);
    setHeaders([]);
    setColumnMap({ name: -1, phone: -1, email: -1, plan: -1, expiry: -1, memberCode: -1 });
    setRows([]);
    setChecked([]);
    setUnmatchedPlans([]);
    setPlanOverrides({});
    setNewPlansToCreate({});
    setError('');
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (file.size > 2_000_000) {
      setError('File is too large. Please keep it under 2 MB.');
      return;
    }

    try {
      const parsedTable = parseCsv(await file.text());
      if (parsedTable.length < 2) {
        setError('The uploaded file does not contain member rows.');
        return;
      }

      const detected = detectColumnMapping(parsedTable[0]);
      setTable(parsedTable);
      setHeaders(parsedTable[0]);
      setColumnMap(detected.mapping);

      // If all required fields are recognized, we can proceed to mapping confirmation
      setStage('mapping');
    } catch {
      setError('Could not read the file. Please ensure it is a valid CSV file.');
    }
  };

  const handleProceedFromMapping = () => {
    if (columnMap.name === -1 || columnMap.phone === -1 || columnMap.plan === -1 || columnMap.expiry === -1) {
      setError('Please select matching columns for Name, Phone, Plan, and Expiry Date.');
      return;
    }

    setError('');
    const parsed = tableToRowsWithMapping(table, columnMap);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      setError(`Found ${parsed.rows.length} rows. Please import up to ${MAX_IMPORT_ROWS} at a time.`);
      return;
    }

    setRows(parsed.rows);

    // Check for unmatched plans
    const unmatched = findUnmatchedPlans(parsed.rows, plans);
    if (unmatched.length > 0) {
      setUnmatchedPlans(unmatched);
      // Pre-populate sensible defaults for auto-creation
      const initialNewPlans: Record<string, { durationMonths: number; price: number }> = {};
      unmatched.forEach((p) => {
        const lower = p.toLowerCase();
        let dur = 1;
        let pr = 1000;
        if (lower.includes('year') || lower.includes('annual')) {
          dur = 12;
          pr = 10000;
        } else if (lower.includes('half') || lower.includes('6 month')) {
          dur = 6;
          pr = 5500;
        } else if (lower.includes('quarter') || lower.includes('3 month')) {
          dur = 3;
          pr = 3000;
        }
        initialNewPlans[p] = { durationMonths: dur, price: pr };
      });
      setNewPlansToCreate(initialNewPlans);
      setStage('plans');
    } else {
      runValidation(parsed.rows, {});
      setStage('preview');
    }
  };

  const runValidation = (rawRows: RawImportRow[], overrides: Record<string, string>) => {
    const valid = validateRows(
      rawRows,
      plans,
      new Set(members.map((m) => phoneKey(m.phone))),
      overrides
    );
    setChecked(valid);
  };

  const handleProceedFromPlans = () => {
    // Build temporary plan overrides map
    const overrides: Record<string, string> = { ...planOverrides };
    // For auto-created plans, validateRows will accept them once we pass a virtual ID
    Object.keys(newPlansToCreate).forEach((p) => {
      if (!overrides[p.toLowerCase()]) {
        overrides[p.toLowerCase()] = `virtual-${p.toLowerCase()}`;
      }
    });

    setPlanOverrides(overrides);
    runValidation(rows, overrides);
    setStage('preview');
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neuraforge-members-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = checked.filter((r) => r.ok).length;
  const problems = checked.flatMap((r) => ('error' in r ? [r] : []));

  const handleImport = async () => {
    setBusy(true);
    setError('');

    // Prepare createPlans array
    const createPlansArray: NewPlanToCreate[] = Object.entries(newPlansToCreate).map(([name, conf]) => ({
      name,
      durationMonths: conf.durationMonths,
      price: conf.price,
    }));

    const res = await importMembers(rows, {
      planOverrides,
      createPlans: createPlansArray,
    });

    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }

    onImported(res.members, res.newPlans);
    setImportedCount(res.members.length);
    setNewPlansCount(res.newPlans.length);
    setStage('done');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-2xl">upload_file</span>
              <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">
                {stage === 'choose' && 'Import Members from Other Software'}
                {stage === 'mapping' && 'Match Columns (Column Mapping)'}
                {stage === 'plans' && 'Unrecognized Plans Setup'}
                {stage === 'preview' && 'Review Members Before Importing'}
                {stage === 'done' && 'Import Complete!'}
              </h2>
            </div>
            <p className="text-xs text-outline mt-0.5">
              Easily migrate from Excel, GymMaster, Fitternity, ZenPlanner, or any custom sheet
            </p>
          </div>
          <button
            onClick={close}
            disabled={busy}
            className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-on-surface flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2.5 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* STAGE 1: Choose File */}
          {stage === 'choose' && (
            <div className="space-y-5">
              <div
                onClick={() => fileInput.current?.click()}
                className="border-2 border-dashed border-surface-container-high hover:border-secondary/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-surface-container-low/40 hover:bg-surface-container-low flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Click or drag your CSV file here</p>
                  <p className="text-[11px] text-outline mt-1">
                    Supports exports from Excel, GymMaster, ZenPlanner, Gym-Wale, and custom sheets
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-on-surface">Need a starter template?</p>
                  <p className="text-[11px] text-outline mt-0.5">
                    Download our sample format with columns for Name, Phone, Plan, Expiry, and optional Biometric ID
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Sample Template
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: Interactive Column Mapping */}
          {stage === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary text-xs font-medium">
                We detected <strong>{table.length - 1} rows</strong> and <strong>{headers.length} columns</strong>. Please confirm or match your spreadsheet columns to NeuraForge fields.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Full Name *</label>
                    {columnMap.name >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.name}
                    onChange={(e) => setColumnMap({ ...columnMap, name: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Phone / Mobile *</label>
                    {columnMap.phone >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.phone}
                    onChange={(e) => setColumnMap({ ...columnMap, phone: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Membership Plan *</label>
                    {columnMap.plan >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.plan}
                    onChange={(e) => setColumnMap({ ...columnMap, plan: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expiry Date */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Expiry / End Date *</label>
                    {columnMap.expiry >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.expiry}
                    onChange={(e) => setColumnMap({ ...columnMap, expiry: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Member ID / Biometric ID (Optional) */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Member ID / Biometric Code (Optional)</label>
                    {columnMap.memberCode >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.memberCode}
                    onChange={(e) => setColumnMap({ ...columnMap, memberCode: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- Auto-generate MEM-xxx --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email (Optional) */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-on-surface">Email (Optional)</label>
                    {columnMap.email >= 0 && <span className="text-[10px] text-tertiary font-bold">Matched</span>}
                  </div>
                  <select
                    value={columnMap.email}
                    onChange={(e) => setColumnMap({ ...columnMap, email: Number(e.target.value) })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value={-1}>-- None / Skip --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Unmatched Plans Resolution */}
          {stage === 'plans' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs">
                Found <strong>{unmatchedPlans.length} plan name(s)</strong> in your file that do not match existing plans in NeuraForge. Choose how to handle each plan:
              </div>

              <div className="space-y-3">
                {unmatchedPlans.map((planText) => {
                  const isExistingMap = Boolean(planOverrides[planText.toLowerCase()]);
                  return (
                    <div
                      key={planText}
                      className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-on-surface">"{planText}"</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-outline uppercase">
                          New Plan
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-outline mb-1">
                            Action
                          </label>
                          <select
                            value={isExistingMap ? 'map' : 'create'}
                            onChange={(e) => {
                              if (e.target.value === 'map') {
                                setPlanOverrides({
                                  ...planOverrides,
                                  [planText.toLowerCase()]: plans[0]?.id || '',
                                });
                                const c = { ...newPlansToCreate };
                                delete c[planText];
                                setNewPlansToCreate(c);
                              } else {
                                const o = { ...planOverrides };
                                delete o[planText.toLowerCase()];
                                setPlanOverrides(o);
                                setNewPlansToCreate({
                                  ...newPlansToCreate,
                                  [planText]: { durationMonths: 1, price: 1000 },
                                });
                              }
                            }}
                            className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none"
                          >
                            <option value="create">✨ Auto-create as new plan in NeuraForge</option>
                            <option value="map">🔄 Map to an existing plan</option>
                          </select>
                        </div>

                        {isExistingMap ? (
                          <div>
                            <label className="block text-[11px] font-bold text-outline mb-1">
                              Map to Existing Plan
                            </label>
                            <select
                              value={planOverrides[planText.toLowerCase()]}
                              onChange={(e) =>
                                setPlanOverrides({
                                  ...planOverrides,
                                  [planText.toLowerCase()]: e.target.value,
                                })
                              }
                              className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none"
                            >
                              {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.durationMonths} mo · ₹{p.price.toLocaleString('en-IN')})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-outline mb-1">
                                Duration (Mo)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={newPlansToCreate[planText]?.durationMonths ?? 1}
                                onChange={(e) =>
                                  setNewPlansToCreate({
                                    ...newPlansToCreate,
                                    [planText]: {
                                      ...newPlansToCreate[planText],
                                      durationMonths: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-outline mb-1">
                                Price (₹)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={newPlansToCreate[planText]?.price ?? 1000}
                                onChange={(e) =>
                                  setNewPlansToCreate({
                                    ...newPlansToCreate,
                                    [planText]: {
                                      ...newPlansToCreate[planText],
                                      price: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs text-on-surface focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 4: Preview & Validation */}
          {stage === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-tertiary/10 border border-tertiary/20">
                  <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Ready to Import</span>
                  <span className="font-sora text-xl font-bold text-on-surface mt-1 block">{validCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-error/10 border border-error/20">
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider block">Will be Skipped</span>
                  <span className="font-sora text-xl font-bold text-on-surface mt-1 block">{problems.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/20">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Total Processed</span>
                  <span className="font-sora text-xl font-bold text-on-surface mt-1 block">{checked.length}</span>
                </div>
              </div>

              {problems.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2 max-h-36 overflow-y-auto">
                  <p className="font-bold text-error text-[11px]">Issues Found ({problems.length}):</p>
                  {problems.slice(0, 10).map((p, i) => (
                    <div key={i} className="text-[11px] text-outline flex items-center justify-between">
                      <span>Row {p.line}: {p.error}</span>
                      <span className="text-error font-bold text-[10px]">Skipped</span>
                    </div>
                  ))}
                  {problems.length > 10 && (
                    <p className="text-[10px] text-outline italic">...and {problems.length - 10} more rows.</p>
                  )}
                </div>
              )}

              {/* Sample preview table */}
              <div className="rounded-xl border border-surface-container-high overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-surface-container-low border-b border-surface-container-high text-outline uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Plan</th>
                      <th className="p-2.5">Code / Biometric</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high bg-surface-container-lowest">
                    {checked.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{row.ok ? row.name : `Row ${row.line}`}</td>
                        <td className="p-2.5 font-mono">{row.ok ? row.phone : '-'}</td>
                        <td className="p-2.5">{row.ok ? (plans.find((p) => p.id === row.planId)?.name || 'Custom Plan') : '-'}</td>
                        <td className="p-2.5 font-mono text-outline">{row.ok && row.memberCode ? row.memberCode : 'Auto'}</td>
                        <td className="p-2.5">
                          {row.ok ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary/15 text-tertiary">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error">
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAGE 5: Done */}
          {stage === 'done' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto animate-in zoom-in">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-sora text-lg font-bold text-on-surface">Import Complete!</h3>
              <p className="text-xs text-outline max-w-sm mx-auto">
                Successfully imported <strong>{importedCount} members</strong>
                {newPlansCount > 0 ? ` and created ${newPlansCount} new membership plans.` : '.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-container-high flex items-center justify-between bg-surface-container-low/30">
          {stage === 'mapping' && (
            <>
              <button
                type="button"
                onClick={() => setStage('choose')}
                className="px-4 py-2 rounded-lg text-outline hover:text-on-surface text-xs font-bold transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedFromMapping}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                Next: Review Plans
              </button>
            </>
          )}

          {stage === 'plans' && (
            <>
              <button
                type="button"
                onClick={() => setStage('mapping')}
                className="px-4 py-2 rounded-lg text-outline hover:text-on-surface text-xs font-bold transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedFromPlans}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                Next: Preview Data
              </button>
            </>
          )}

          {stage === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStage('mapping')}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-outline hover:text-on-surface text-xs font-bold transition-colors cursor-pointer"
              >
                Adjust Columns
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={busy || validCount === 0}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busy && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {busy ? 'Importing...' : `Import ${validCount} Members`}
              </button>
            </>
          )}

          {stage === 'done' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={close}
                className="px-6 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
