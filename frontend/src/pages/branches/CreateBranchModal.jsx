import { useCallback, useEffect, useState } from 'react';
import { branchesApi } from '../../api/branches.js';
import { referenceApi } from '../../api/reference.js';
import Modal from '../../components/Modal.jsx';
import Autocomplete from '../../components/Autocomplete.jsx';

const EMPTY = {
  soleId: '',
  branchName: '',
  city: '',
  state: '',
  pincode: '',
  bankRegion: '',
  status: 'ACTIVE',
};

export default function CreateBranchModal({ open, onClose, states, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setForm(EMPTY); setErr(''); }
  }, [open]);

  const fetchCities = useCallback(
    (query) => referenceApi.cities({ q: query, state: form.state || undefined, limit: 30 }).catch(() => []),
    [form.state]
  );

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.soleId.trim()) return 'Sole ID is required';
    if (!form.branchName.trim()) return 'Branch Name is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.state.trim()) return 'State is required';
    if (!/^\d{6}$/.test(form.pincode.trim())) return 'Pincode must be exactly 6 digits';
    return null;
  };

  const onSave = async (e) => {
    e.preventDefault();
    setErr('');
    const v = validate();
    if (v) { setErr(v); return; }
    setBusy(true);
    try {
      await branchesApi.create({
        soleId: form.soleId.trim(),
        branchName: form.branchName.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        bankRegion: form.bankRegion.trim() || null,
        status: form.status,
      });
      onCreated?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create branch');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Branch"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">Cancel</button>
          <button
            onClick={onSave}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save Branch'}
          </button>
        </>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sole ID *">
            <input
              value={form.soleId}
              onChange={(e) => update('soleId', e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="e.g. 0023"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
            />
          </Field>
          <Field label="Branch Name *">
            <input
              value={form.branchName}
              onChange={(e) => update('branchName', e.target.value)}
              maxLength={150}
              placeholder="e.g. Chennai Main"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
            />
          </Field>
          <Field label="State *">
            <Autocomplete
              value={form.state}
              onChange={(v) => update('state', v)}
              options={states}
              placeholder="Start typing…"
            />
          </Field>
          <Field label="City *">
            <Autocomplete
              value={form.city}
              onChange={(v) => update('city', v)}
              fetchOptions={fetchCities}
              getLabel={(c) => c.name || c}
              getSecondary={(c) => c.state}
              placeholder="Start typing…"
            />
          </Field>
          <Field label="Pincode *">
            <input
              value={form.pincode}
              onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit pincode"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
            />
          </Field>
          <Field label="Bank Region">
            <input
              value={form.bankRegion}
              onChange={(e) => update('bankRegion', e.target.value.toUpperCase().slice(0, 50))}
              maxLength={50}
              placeholder="e.g. ROTN"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple uppercase"
            />
          </Field>
          <Field label="Status *">
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple bg-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>
      </form>
    </Modal>
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
