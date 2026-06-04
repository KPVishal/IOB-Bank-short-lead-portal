import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { branchesApi } from '../../api/branches.js';
import {
  bijlipayApi,
  DEVICE_OPTIONS,
  LEAD_SOURCE_IOB,
} from '../../api/bijlipay.js';
import Autocomplete from '../../components/Autocomplete.jsx';

const EMPTY_MERCHANT = {
  merchantName: '',
  contactName: '',
  contactNumber: '',
  alternateNumber: '',
  email: '',
  address: '',
  pincode: '',
  state: '',
  city: '',
  region: '',
  deviceLabel: DEVICE_OPTIONS[0].label,
  deviceCount: 1,
};

export default function LeadSingleForm() {
  const { user, isAdmin } = useAuth();
  const [branch, setBranch] = useState(null);
  const [soleIdInput, setSoleIdInput] = useState('');
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [form, setForm] = useState(EMPTY_MERCHANT);
  const [submitErr, setSubmitErr] = useState('');
  const [submitOk, setSubmitOk] = useState('');
  const [busy, setBusy] = useState(false);

  // Branch User: auto-load their own branch by sole ID
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
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Pincode autocomplete & region auto-fill
  const fetchPincodes = useCallback(
    (q) => bijlipayApi.searchPincodes(q || '').catch(() => []),
    []
  );

  const onPickPincode = async (val) => {
    const raw = typeof val === 'string' ? val : val?.pincode || '';
    const onlyDigits = raw.replace(/\D/g, '').slice(0, 6);
    update('pincode', onlyDigits);
    if (onlyDigits.length === 6) {
      try {
        const details = await bijlipayApi.fetchPincodeDetails(onlyDigits);
        if (details) {
          setForm((f) => ({
            ...f,
            state: details.state || f.state,
            city: details.city || f.city,
            region: details.region || f.region,
          }));
        }
      } catch {
        // silent — user can still fill manually
      }
    }
  };

  const validate = () => {
    if (!branch) return 'Pick a Sole ID first';
    if (!form.merchantName.trim()) return 'Merchant Name is required';
    if (!form.contactName.trim()) return 'Contact Name is required';
    if (!/^\d{10}$/.test(form.contactNumber.trim())) return 'Contact Number must be 10 digits';
    if (form.alternateNumber.trim() && !/^\d{10}$/.test(form.alternateNumber.trim())) {
      return 'Alternate Number must be 10 digits';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email is not valid';
    if (!form.address.trim()) return 'Address is required';
    if (!/^\d{6}$/.test(form.pincode.trim())) return 'Pincode must be 6 digits';
    if (!form.state.trim()) return 'State is required';
    if (!form.city.trim()) return 'City is required';
    if (!Number(form.deviceCount) || Number(form.deviceCount) < 1) return 'Device Count must be at least 1';
    return null;
  };

  const buildPayload = () => {
    const device = DEVICE_OPTIONS.find((d) => d.label === form.deviceLabel) || DEVICE_OPTIONS[0];
    return {
      merchant_name: form.merchantName.trim(),
      contact_name: form.contactName.trim(),
      region: form.region || '',
      bank_region: branch.bankRegion || '',
      bank_city: branch.city || '',
      bank_pincode: Number(branch.pincode),
      branch_name: '',
      contact_number: form.contactNumber.trim(),
      alternate_contactnumber: form.alternateNumber.trim() || '',
      email_id: form.email.trim(),
      merchant_address: form.address.trim(),
      pincode: Number(form.pincode.trim()),
      state: form.state.trim(),
      city: form.city.trim(),
      bank: LEAD_SOURCE_IOB,
      device_type: device.model,
      branch_code: branch.soleId,
      deviceCount: Number(form.deviceCount) || 1,
      bankemp_phn: user?.mobile || '',
    };
  };

  const onSubmit = async (e) => {
    e?.preventDefault();
    setSubmitErr('');
    setSubmitOk('');
    const v = validate();
    if (v) { setSubmitErr(v); return; }
    setBusy(true);
    try {
      const res = await bijlipayApi.submitLead(buildPayload());
      const leadId = res?.leadId || res?.lead_id || res?.id || res?.data?.leadId || '';
      setSubmitOk(`Lead submitted successfully${leadId ? ` (Lead ID: ${leadId})` : ''}.`);
      setForm(EMPTY_MERCHANT);
    } catch (e) {
      setSubmitErr(
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        'Could not submit lead'
      );
    } finally {
      setBusy(false);
    }
  };

  const canEditSoleId = isAdmin;
  const bankPincodeStr = branch?.pincode || '';
  const bankRegion = branch?.bankRegion || '';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* === Bank Information === */}
      <Section title="Bank Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={`Sole ID${canEditSoleId ? ' *' : ''}`}>
            {canEditSoleId ? (
              <Autocomplete
                value={soleIdInput}
                onChange={onPickBranch}
                fetchOptions={fetchBranches}
                getLabel={(b) => (typeof b === 'string' ? b : `${b.soleId} — ${b.branchName}`)}
                getSecondary={(b) => (typeof b === 'string' ? '' : `${b.city}, ${b.state}`)}
                placeholder="Start typing a Sole ID…"
              />
            ) : (
              <input
                value={branch?.soleId || (loadingBranch ? 'Loading…' : '—')}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
              />
            )}
          </Field>
          <Field label="Branch Name">
            <input value={branch?.branchName || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Bank City">
            <input value={branch?.city || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Bank State">
            <input value={branch?.state || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Bank Pincode">
            <input value={bankPincodeStr || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Bank Region">
            <input value={bankRegion || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Branch Code (= Sole ID)">
            <input value={branch?.soleId || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Bank Employee Phone">
            <input value={user?.mobile || '—'} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
        </div>
        {!isAdmin && !loadingBranch && !branch && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            No active branch is mapped to your Sole ID (<b>{user?.soleId || 'none'}</b>). Please contact an Admin.
          </div>
        )}
        {bankRegion === '' && branch && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            This branch has no <b>Bank Region</b> set. Submitting will send an empty value. Ask an Admin to update the branch.
          </div>
        )}
      </Section>

      {/* === Merchant Information === */}
      <Section title="Merchant Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Merchant Name *">
            <input value={form.merchantName}
              onChange={(e) => update('merchantName', e.target.value)} maxLength={150}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Contact Name *">
            <input value={form.contactName}
              onChange={(e) => update('contactName', e.target.value)} maxLength={150}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Contact Number *">
            <input value={form.contactNumber}
              onChange={(e) => update('contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Alternate Number">
            <input value={form.alternateNumber}
              onChange={(e) => update('alternateNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric" maxLength={10} placeholder="Optional"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email}
              onChange={(e) => update('email', e.target.value)} maxLength={200}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
          <Field label="Merchant Pincode *">
            <Autocomplete
              value={form.pincode}
              onChange={onPickPincode}
              fetchOptions={fetchPincodes}
              minChars={3}
              getLabel={(p) => (typeof p === 'string' ? p : p?.pincode || '')}
              getSecondary={(p) => (typeof p === 'object' ? p?.region || p?.area || p?.city || '' : '')}
              placeholder="Type first 3+ digits…"
            />
          </Field>
          <Field label="State">
            <input value={form.state}
              onChange={(e) => update('state', e.target.value)} maxLength={100}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
              placeholder="Auto-filled from pincode" />
          </Field>
          <Field label="City">
            <input value={form.city}
              onChange={(e) => update('city', e.target.value)} maxLength={100}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
              placeholder="Auto-filled from pincode" />
          </Field>
          <Field label="Region (from Pincode API)">
            <input value={form.region} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
              placeholder="Auto-filled from pincode" />
          </Field>
          <Field label="Merchant Address *">
            <textarea value={form.address}
              onChange={(e) => update('address', e.target.value)} maxLength={500} rows={2}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple resize-none" />
          </Field>
        </div>
      </Section>

      {/* === Device & Lead Source === */}
      <Section title="Device & Lead Source">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Lead Source">
            <input value={LEAD_SOURCE_IOB} disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700" />
          </Field>
          <Field label="Device Type *">
            <select value={form.deviceLabel}
              onChange={(e) => update('deviceLabel', e.target.value)}
              className="w-full px-3 py-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bp-purple">
              {DEVICE_OPTIONS.map((d) => (
                <option key={d.label} value={d.label}>{d.label} ({d.model})</option>
              ))}
            </select>
          </Field>
          <Field label="Device Count *">
            <input type="number" min={1} value={form.deviceCount}
              onChange={(e) => update('deviceCount', Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          </Field>
        </div>
      </Section>

      {submitErr && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {submitErr}
        </div>
      )}
      {submitOk && (
        <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          {submitOk}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button"
          onClick={() => { setForm(EMPTY_MERCHANT); setSubmitErr(''); setSubmitOk(''); }}
          disabled={busy}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-60">
          Reset
        </button>
        <button type="submit"
          disabled={busy || !branch}
          className="px-5 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep disabled:opacity-60">
          {busy ? 'Submitting…' : 'Submit Lead'}
        </button>
      </div>
    </form>
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
