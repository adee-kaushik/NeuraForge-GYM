import React, { useRef, useState } from 'react';
import { MembershipPlan, MemberRecord, Member } from '../../types';
import { importMembers } from '@/actions/import';
import {
  MAX_IMPORT_ROWS,
  TEMPLATE_CSV,
  parseCsv,
  phoneKey,
  tableToRows,
  validateRows,
  type RawImportRow,
  type ValidatedRow,
} from '../../lib/import';

interface ImportMembersModalProps {
  isOpen: boolean;
  plans: MembershipPlan[];
  members: Member[];
  onClose: () => void;
  onImported: (members: MemberRecord[]) => void;
}

type Stage = 'choose' | 'preview' | 'done';

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({ isOpen, plans, members, onClose, onImported }) => {
  const [stage, setStage] = useState<Stage>('choose');
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [checked, setChecked] = useState<ValidatedRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStage('choose');
    setRows([]);
    setChecked([]);
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

    if (file.size > 1_000_000) {
      setError('The file is too large. Keep it under 1 MB.');
      return;
    }

    const parsed = tableToRows(parseCsv(await file.text()));
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      setError(`This file has ${parsed.rows.length} rows. Import up to ${MAX_IMPORT_ROWS} at a time.`);
      return;
    }

    setRows(parsed.rows);
    setChecked(validateRows(parsed.rows, plans, new Set(members.map((m) => phoneKey(m.phone)))));
    setStage('preview');
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = checked.filter((r) => r.ok).length;
  const problems = checked.flatMap((r) => ('error' in r ? [r] : []));

  const handleImport = async () => {
    setBusy(true);
    setError('');
    const res = await importMembers(rows);
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    onImported(res.members);
    setImportedCount(res.members.length);
    setStage('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-surface-container-low border border-secondary/40 rounded-xl p-6 space-y-4 text-xs text-on-surface max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
          <h3 className="font-sora text-sm font-semibold">Import members</h3>
          <button onClick={close} className="text-outline hover:text-on-surface cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {stage === 'choose' && (
          <>
            <p className="text-outline">
              Upload a CSV file of your existing members (in Excel: File, Save As, CSV). Columns needed:{' '}
              <strong className="text-on-surface">name, phone, plan, expiry date</strong>. Email is optional.
            </p>
            <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3 space-y-1">
              <p>
                <span className="text-outline">Your plans: </span>
                {plans.map((p) => p.name).join(', ')}
              </p>
              <p>
                <span className="text-outline">Expiry date format: </span>DD/MM/YYYY, for example 25/11/2026
              </p>
            </div>
            <button onClick={downloadTemplate} className="text-secondary font-bold hover:underline cursor-pointer">
              Download template
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-xs file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-container file:font-bold file:cursor-pointer"
            />
            {error && <p className="text-error font-semibold">{error}</p>}
          </>
        )}

        {stage === 'preview' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-lg bg-tertiary/10 border border-tertiary/30">
                <div className="font-sora text-lg font-bold text-tertiary">{validCount}</div>
                <div className="text-outline">ready to import</div>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-error/10 border border-error/30">
                <div className="font-sora text-lg font-bold text-error">{problems.length}</div>
                <div className="text-outline">will be skipped</div>
              </div>
            </div>

            {problems.length > 0 && (
              <div className="space-y-1">
                <p className="text-outline font-bold uppercase tracking-wider">Rows with problems</p>
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {problems.slice(0, 20).map((p) => (
                    <li key={p.line} className="text-on-surface-variant">
                      <span className="font-mono text-error">Line {p.line}:</span> {p.error}
                    </li>
                  ))}
                </ul>
                {problems.length > 20 && <p className="text-outline">and {problems.length - 20} more</p>}
              </div>
            )}

            {error && <p className="text-error font-semibold">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={reset} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant cursor-pointer">
                Choose another file
              </button>
              <button
                onClick={handleImport}
                disabled={busy || validCount === 0}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Importing...' : `Import ${validCount} members`}
              </button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <>
            <p className="text-sm">
              <strong className="text-tertiary">{importedCount} members</strong> imported. You can find them in the list now.
            </p>
            <div className="flex justify-end">
              <button onClick={close} className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold cursor-pointer">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
