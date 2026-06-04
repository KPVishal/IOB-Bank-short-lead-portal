import { useCallback, useEffect, useState } from 'react';
import { branchesApi } from '../../api/branches.js';
import { usersApi } from '../../api/users.js';
import Autocomplete from '../../components/Autocomplete.jsx';
import Modal from '../../components/Modal.jsx';

const EMPTY = { branch: null, userName: '', email: '', mobile: '' };

export default function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [soleIdInput, setSoleIdInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setForm(EMPTY); setSoleIdInput(''); setErr(''); }
  }, [open]);

  const fetchBranches = useCallback(async (query) => {
    const res = await branchesApi.list({ q: query, status: 'ACTIVE', size: 20 });
    return res.content || [];
  }, []);

  const onPickBranch = (val) => {
    setSoleIdInput(typeof val === 'string' ? val : val?.soleId || '');
    if (val && typeof val === 'object') {
      setForm((f) => ({ ...f, branch: val }));
    } else {
      setForm((f) => ({ ...f, branch: null }));
    }
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.branch) return 'Pick a valid Sole ID from the suggestions';
    if (!form.userName.trim()) return 'User Name is required';
    if (!form.email.trim()) return 'User Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'User Email is not a valid email';
    if (!/^\d{10}$/.test(form.mobile.trim())) return 'User Number must be exactly 10 digits';
    return null;
  };

  const onSave = async (e) => {
    e?.preventDefault();
    setErr('');
    const v = validate();
    if (v) { setErr(v); return; }
    setBusy(true);
    try {
      await usersApi.create({
        soleId: form.branch.soleId,
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        role: 'BRANCH_MANAGER',
      });
      onCreated?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New User"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">Cancel</button>
          <button onClick={onSave} disabled={busy}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60">
            {busy ? 'Creating…' : 'Create & Send Email'}
          </button>
        </>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

        <Field label="Sole ID *">
          <Autocomplete
            value={soleIdInput}
            onChange={onPickBranch}
            fetchOptions={fetchBranches}
            getLabel={(b) => (typeof b === 'string' ? b : `${b.soleId} — ${b.branchName}`)}
            getSecondary={(b) => (typeof b === 'string' ? '' : `${b.city}, ${b.state}`)}
            placeholder="Start typing a Sole ID…"
          />
        </Field>

        {form.branch && (
          <div className="px-4 py-3 bg-bp-pink border border-bp-lavender rounded text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-action text-bp-purple mb-2">Selected branch</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <Info label="Sole ID"     value={form.branch.soleId} />
              <Info label="Branch Name" value={form.branch.branchName} />
              <Info label="City"        value={form.branch.city} />
              <Info label="State"       value={form.branch.state} />
              <Info label="Pincode"     value={form.branch.pincode} />
              <Info label="Status"      value={form.branch.status === 'ACTIVE' ? 'Active' : 'Inactive'} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="User Name *">
            <input value={form.userName} onChange={(e) => update('userName', e.target.value)} maxLength={150}
              placeholder="e.g. Ravi Kumar"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="User Email *">
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} maxLength={150}
              placeholder="ravi.kumar@iob.in"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="User Number *">
            <input value={form.mobile}
              onChange={(e) => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Role">
            <input value="Branch Manager" disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
          </Field>
        </div>

        <div className="text-xs text-gray-500 border-t pt-3">
          A welcome email will be sent with login URL and a temporary password (<code>Welcome@123</code>).
          The user will be required to change their password on first login.
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
function Info({ label, value }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-action text-gray-500">{label}</span>
      <div className="font-medium text-gray-800">{value || '—'}</div>
    </div>
  );
}
