import { useEffect, useRef, useState } from 'react';
import { branchesApi } from '../../api/branches.js';
import Modal from '../../components/Modal.jsx';

export default function BulkUploadModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
      setErr('');
      setDrag(false);
      setBusy(false);
    }
  }, [open]);

  const onDownloadTemplate = async () => {
    try {
      const blob = await branchesApi.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'branches-template.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e) {
      setErr('Could not download template');
    }
  };

  const onPick = (f) => {
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) { setErr('Please upload an .xlsx or .xls file'); return; }
    setErr('');
    setFile(f);
    setResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const onImport = async () => {
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const r = await branchesApi.bulkImport(file);
      setResult(r);
      if (r.importedCount > 0) onImported?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Bulk import failed');
    } finally {
      setBusy(false);
    }
  };

  const onClose2 = () => {
    if (busy) return;
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose2}
      title="Bulk Upload Branches"
      size="lg"
      footer={
        result ? (
          <button
            onClick={() => { setFile(null); setResult(null); inputRef.current && (inputRef.current.value = ''); }}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep"
          >
            Upload Another File
          </button>
        ) : (
          <>
            <button onClick={onClose2} disabled={busy} className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-60">Cancel</button>
            <button
              onClick={onImport}
              disabled={!file || busy}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60"
            >
              {busy ? 'Importing…' : `Import ${file ? file.name : 'File'}`}
            </button>
          </>
        )
      }
    >
      {err && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      {!result && (
        <>
          <div className="mb-4 p-4 bg-bp-pink border border-bp-lavender rounded flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              <div className="font-semibold mb-1 text-bp-purple">Step 1 — Download the template</div>
              <div className="text-xs">Columns: Sole ID, Branch Name, City, State, Pincode, Bank Region, Status. See Instructions sheet for rules.</div>
            </div>
            <button
              onClick={onDownloadTemplate}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded whitespace-nowrap hover:bg-white"
            >
              ⬇ Download Template
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              drag ? 'border-bp-purple bg-bp-lavender' : 'border-gray-300 hover:border-bp-purple'
            }`}
          >
            <div className="text-4xl mb-2">📥</div>
            <div className="text-sm font-semibold text-gray-700">
              {file ? file.name : 'Drop your .xlsx here, or click to browse'}
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
        </>
      )}

      {result && <ResultView result={result} />}
    </Modal>
  );
}

function ResultView({ result }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total rows" value={result.totalRows} tone="gray" />
        <Stat label="Imported" value={result.importedCount} tone="green" />
        <Stat label="Failed" value={result.failedCount} tone="red" />
      </div>

      {result.failed?.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-red-700 mb-2">Failed rows</div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-red-50 text-red-700 uppercase tracking-action">
                <tr>
                  <th className="text-left px-3 py-2">Row</th>
                  <th className="text-left px-3 py-2">Sole ID</th>
                  <th className="text-left px-3 py-2">Branch Name</th>
                  <th className="text-left px-3 py-2">City</th>
                  <th className="text-left px-3 py-2">State</th>
                  <th className="text-left px-3 py-2">Pincode</th>
                  <th className="text-left px-3 py-2">Bank Region</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {result.failed.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="px-3 py-2 font-semibold">{row.rowNumber}</td>
                    {['Sole ID', 'Branch Name', 'City', 'State', 'Pincode', 'Bank Region', 'Status'].map((col) => {
                      const isMissing = row.missingFields?.includes(col);
                      return (
                        <td
                          key={col}
                          className={`px-3 py-2 ${isMissing ? 'bg-red-100 text-red-700 font-semibold' : ''}`}
                          title={isMissing ? 'Missing required value' : ''}
                        >
                          {row.data?.[col] || (isMissing ? '— missing —' : '')}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-red-700">
                      <ul className="list-disc list-inside space-y-0.5">
                        {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.imported?.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-green-700 mb-2">Imported branches</div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-green-50 text-green-700 uppercase tracking-action">
                <tr>
                  <th className="text-left px-3 py-2">Sole ID</th>
                  <th className="text-left px-3 py-2">Branch Name</th>
                  <th className="text-left px-3 py-2">City</th>
                  <th className="text-left px-3 py-2">State</th>
                  <th className="text-left px-3 py-2">Pincode</th>
                  <th className="text-left px-3 py-2">Bank Region</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.imported.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2 font-semibold text-bp-purple">{b.soleId}</td>
                    <td className="px-3 py-2">{b.branchName}</td>
                    <td className="px-3 py-2">{b.city}</td>
                    <td className="px-3 py-2">{b.state}</td>
                    <td className="px-3 py-2">{b.pincode}</td>
                    <td className="px-3 py-2">{b.bankRegion || '—'}</td>
                    <td className="px-3 py-2">{b.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
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
