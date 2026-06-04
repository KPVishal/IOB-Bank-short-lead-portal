import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { branchesApi } from '../../api/branches.js';
import { leadsApi } from '../../api/leads.js';
import { bijlipayApi, LEAD_SOURCE_IOB } from '../../api/bijlipay.js';
import Autocomplete from '../../components/Autocomplete.jsx';

export default function LeadBulkUpload() {
  const { user, isAdmin } = useAuth();
  const [branch, setBranch] = useState(null);
  const [soleIdInput, setSoleIdInput] = useState('');
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  // Branch User: auto-load own branch
  useEffect(() => {
    if (isAdmin) return;
    if (!user?.soleId) return;
    setLoadingBranch(true);
    branchesApi
      .list({ q: user.soleId, size: 5 })
      .then((res) => {
        const match = (res.content || []).find(
          (b) => b.soleId?.toLowerCase() === user.soleId.toLowerCase()
        );
        if (match) {
          setBranch(match);
          setSoleIdInput(match.soleId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBranch(false));
  }, [isAdmin, user]);

  const fetchBranches = useCallback(async (query) => {
    const res = await branchesApi.list({ q: query, status: 'ACTIVE', size: 20 });
    return res.content || [];
  }, []);

  const onPickBranch = (val) => {
    setSoleIdInput(typeof val === 'string' ? val : val?.soleId || '');
    setBranch(val && typeof val === 'object' ? val : null);
    setParsed(null);
    setResults(null);
  };

  const onDownloadTemplate = async () => {
    try {
      const blob = await leadsApi.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads-template.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch {
      setErr('Could not download template');
    }
  };

  const onPick = (f) => {
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) { setErr('Please upload an .xlsx or .xls file'); return; }
    setErr('');
    setFile(f);
    setParsed(null);
    setResults(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const onParse = async () => {
    if (!file || !branch) return;
    setParseBusy(true);
    setErr('');
    setParsed(null);
    setResults(null);
    try {
      const res = await leadsApi.parseBulk(file, branch.soleId);
      setParsed(res);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not parse file');
    } finally {
      setParseBusy(false);
    }
  };

  const buildPayloadForRow = (row, regionDetails) => ({
    merchant_name: row.merchantName,
    contact_name: row.contactName,
    region: regionDetails?.region || '',
    bank_region: branch.bankRegion || '',
    bank_city: branch.city || '',
    bank_pincode: Number(branch.pincode),
    branch_name: '',
    contact_number: row.contactNumber,
    alternate_contactnumber: row.alternateNumber || '',
    email_id: row.email,
    merchant_address: row.address,
    pincode: Number(row.pincode),
    state: regionDetails?.state || '',
    city: regionDetails?.city || '',
    bank: LEAD_SOURCE_IOB,
    device_type: row.deviceModel,
    branch_code: branch.soleId,
    deviceCount: row.deviceCount || 1,
    bankemp_phn: user?.mobile || '',
  });

  const onSubmitAll = async () => {
    if (!parsed) return;
    const validRows = parsed.rows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setSubmitBusy(true);
    setErr('');
    const succeeded = [];
    const failed = [];
    setProgress({ done: 0, total: validRows.length });
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        let details = null;
        try {
          details = await bijlipayApi.fetchPincodeDetails(row.pincode);
        } catch {
          // proceed with empty region/state/city
        }
        const payload = buildPayloadForRow(row, details);
        const resp = await bijlipayApi.submitLead(payload);
        succeeded.push({ row, response: resp });
      } catch (e) {
        failed.push({
          row,
          error: e.response?.data?.message || e.response?.data?.error || e.message || 'Unknown error',
        });
      } finally {
        setProgress({ done: i + 1, total: validRows.length });
      }
    }
    setResults({ succeeded, failed });
    setSubmitBusy(false);
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResults(null);
    setProgress(null);
    setErr('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const canSubmit = parsed && parsed.validCount > 0 && !submitBusy && !results;
  const sectionLocked = !branch;

  return (
    <div className="space-y-4">
      {/* Step 1: Branch */}
      <Section title="Step 1 — Branch">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Field label={`Sole ID${isAdmin ? ' *' : ''}`}>
              {isAdmin ? (
                <Autocomplete
                  value={soleIdInput}
                  onChange={onPickBranch}
                  fetchOptions={fetchBranches}
                  getLabel={(b) => (typeof b === 'string' ? b : `${b.soleId} — ${b.branchName}`)}
                  getSecondary={(b) => (typeof b === 'string' ? '' : `${b.city}, ${b.state}`)}
                  placeholder="Pick a Sole ID to upload leads for…"
                />
              ) : (
                <input
                  value={branch?.soleId || (loadingBranch ? 'Loading…' : '—')}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
                />
              )}
            </Field>
          </div>
          {branch && (
            <div className="px-3 py-2 bg-bp-pink border border-bp-lavender rounded text-xs space-y-0.5">
              <div className="font-semibold text-bp-purple">{branch.branchName}</div>
              <div>{branch.city}, {branch.state} · {branch.pincode}</div>
              <div>Bank Region: {branch.bankRegion || '—'}</div>
            </div>
          )}
        </div>
      </Section>

      {/* Step 2: Template + upload */}
      <Section title="Step 2 — Download template & upload">
        <div className={`mb-4 p-4 bg-bp-pink border border-bp-lavender rounded flex items-center justify-between gap-3 ${sectionLocked ? 'opacity-60' : ''}`}>
          <div className="text-sm text-gray-700">
            <div className="font-semibold mb-1 text-bp-purple">Template columns</div>
            <div className="text-xs">
              Merchant Name, Contact Name, Contact Number, Alternate Number, Email, Merchant Address,
              Pincode, Device Type (Android POS / All-in-One POS), Device Count.
            </div>
          </div>
          <button
            type="button"
            disabled={sectionLocked}
            onClick={onDownloadTemplate}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded whitespace-nowrap hover:bg-white disabled:opacity-50"
          >
            ⬇ Download Template
          </button>
        </div>

        <div
          onDragOver={(e) => { if (sectionLocked) return; e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { if (sectionLocked) return; onDrop(e); }}
          onClick={() => { if (sectionLocked) return; inputRef.current?.click(); }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            sectionLocked ? 'cursor-not-allowed border-gray-200 text-gray-400' :
              drag ? 'cursor-pointer border-bp-purple bg-bp-lavender' :
              'cursor-pointer border-gray-300 hover:border-bp-purple'
          }`}
        >
          <div className="text-4xl mb-2">📥</div>
          <div className="text-sm font-semibold text-gray-700">
            {sectionLocked ? 'Pick a branch first' : file ? file.name : 'Drop your .xlsx here, or click to browse'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Max ~10 MB · .xlsx or .xls'}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>

        {err && <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

        <div className="mt-4 flex justify-end gap-2">
          {(parsed || file) && (
            <button
              type="button"
              onClick={reset}
              disabled={submitBusy}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-60"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onParse}
            disabled={!file || !branch || parseBusy}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60"
          >
            {parseBusy ? 'Parsing…' : 'Parse File'}
          </button>
        </div>
      </Section>

      {/* Step 3: Review parsed */}
      {parsed && (
        <Section title="Step 3 — Review & submit">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Total rows" value={parsed.totalRows} tone="gray" />
            <Stat label="Valid" value={parsed.validCount} tone="green" />
            <Stat label="Invalid" value={parsed.invalidCount} tone="red" />
          </div>

          {progress && (
            <div className="mb-4">
              <div className="text-xs text-gray-600 mb-1">
                Submitting to Bijlipay: {progress.done} / {progress.total}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-bp-purple transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-700 uppercase tracking-action">
                <tr>
                  <th className="text-left px-3 py-2">Row</th>
                  <th className="text-left px-3 py-2">Merchant</th>
                  <th className="text-left px-3 py-2">Contact</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Pincode</th>
                  <th className="text-left px-3 py-2">Device</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => {
                  const submitResult = results && (
                    results.succeeded.find((s) => s.row.rowNumber === r.rowNumber) ? 'submitted' :
                    results.failed.find((f) => f.row.rowNumber === r.rowNumber) ? 'failed' : null
                  );
                  return (
                    <tr key={r.rowNumber} className={`border-t ${r.valid ? '' : 'bg-red-50'}`}>
                      <td className="px-3 py-2 font-semibold">{r.rowNumber}</td>
                      <td className="px-3 py-2">{r.merchantName || '—'}</td>
                      <td className="px-3 py-2">{r.contactName || '—'}</td>
                      <td className="px-3 py-2">{r.contactNumber || '—'}</td>
                      <td className="px-3 py-2">{r.pincode || '—'}</td>
                      <td className="px-3 py-2">{r.deviceLabel || '—'} ({r.deviceModel || '—'})</td>
                      <td className="px-3 py-2">
                        {submitResult === 'submitted' && (
                          <span className="text-green-700 font-semibold">Submitted</span>
                        )}
                        {submitResult === 'failed' && (
                          <span className="text-red-700 font-semibold" title={results.failed.find((f) => f.row.rowNumber === r.rowNumber)?.error}>
                            Failed
                          </span>
                        )}
                        {!submitResult && r.valid && <span className="text-gray-500">Ready</span>}
                        {!submitResult && !r.valid && (
                          <ul className="text-red-700 list-disc list-inside">
                            {r.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!results && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={submitBusy}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSubmitAll}
                disabled={!canSubmit}
                className="px-5 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60"
              >
                {submitBusy ? `Submitting (${progress?.done || 0}/${progress?.total || 0})…`
                  : `Submit ${parsed.validCount} Valid Row${parsed.validCount === 1 ? '' : 's'}`}
              </button>
            </div>
          )}

          {results && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Submitted to Bijlipay" value={results.succeeded.length} tone="green" />
              <Stat label="Submission failed" value={results.failed.length} tone="red" />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white border rounded-lg p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-action text-bp-purple mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded border p-3 ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-action">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
