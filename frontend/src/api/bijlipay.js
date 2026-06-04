import axios from 'axios';

const BIJLIPAY_BASE =
  import.meta.env.VITE_BIJLIPAY_API_BASE || 'http://qaapp.bijlipay.co.in:8353';

export const LEAD_SOURCE_IOB = 'LS_INDIAN OVERSEAS BANK';

export const DEVICE_OPTIONS = [
  { label: 'Android POS', model: 'A75PRO' },
  { label: 'All-in-One POS', model: 'Q161_PRO_SQR' },
];

const bijlipay = axios.create({
  baseURL: BIJLIPAY_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const bijlipayApi = {
  searchPincodes: (searchTerm) =>
    bijlipay
      .get('/api/fetchPinCodeList', { params: { searchTerm } })
      .then((r) => normalizePincodeList(r.data)),

  fetchPincodeDetails: (pincode) =>
    bijlipay
      .get(`/api/fetchBpRegionDetailsBasedOnPincode/${pincode}`)
      .then((r) => normalizePincodeDetails(r.data)),

  submitLead: (payload) =>
    bijlipay.post('/api/directBank-short-lead/1', payload).then((r) => r.data),

  leadTrackerBranch: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB }) =>
    bijlipay
      .get('/api/lead-view-tracker', { params: { bankEmpPh, leadSource } })
      .then((r) => r.data),

  leadDeviceDetailsAdmin: ({ leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    bijlipay
      .get('/api/lead-device-details-admin', { params: { leadSource, page, size } })
      .then((r) => r.data),

  terminalStatusBranch: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    bijlipay
      .get('/api/lead-device-details', { params: { leadSource, bankEmpPh, page, size } })
      .then((r) => r.data),

  terminalStatusAdmin: ({ leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    bijlipay
      .get('/api/lead-view-tracker-admin', { params: { leadSource, page, size } })
      .then((r) => r.data),
};

function normalizePincodeList(data) {
  const arr = Array.isArray(data) ? data : data?.data || data?.content || [];
  return arr
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { pincode: String(item) };
      }
      const pin = item.pincode ?? item.pinCode ?? item.pin_code ?? item.pin;
      return { pincode: String(pin ?? ''), ...item };
    })
    .filter((p) => p.pincode);
}

function normalizePincodeDetails(data) {
  const d = Array.isArray(data) ? data[0] : data?.data || data;
  if (!d || typeof d !== 'object') return null;
  return {
    state: d.state ?? d.stateName ?? d.bp_state ?? '',
    city: d.city ?? d.cityName ?? d.bp_city ?? '',
    region: d.region ?? d.regionGroup ?? d.region_group ?? d.bp_region_group ?? '',
    bankRegion: d.bank_region ?? d.bankRegion ?? d.bp_region ?? '',
    raw: d,
  };
}

export const MARS_STATUS_LABELS = {
  1: 'TID Generated',
  2: 'Inactive',
  3: 'Terminated',
  4: 'SAT Assigned',
  5: 'Scan Picked',
  6: 'Implemented',
  7: 'Implemented (SAT Pending)',
  8: 'Verification Failed',
  13: 'SAT Cancelled',
  14: 'Pre-Cancelled',
};

export const ACTIVE_STATUS_CODES = new Set([1, 4, 5, 6, 7, 8, 13, 14]);
export const INACTIVE_STATUS_CODES = new Set([2, 3]);

export function statusLabel(code) {
  if (code == null) return '—';
  return MARS_STATUS_LABELS[Number(code)] || `Status ${code}`;
}

export function isActiveTerminal(code) {
  return ACTIVE_STATUS_CODES.has(Number(code));
}
