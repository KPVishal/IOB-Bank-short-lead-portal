import client from './client.js';

// All Bijlipay (Skilworth Mars) calls now go through our Spring backend at
// /api/bijlipay/*. Spring forwards each request to qaapp.bijlipay.co.in:8353
// (configurable via BIJLIPAY_BASE_URL env var on the backend).
//
// Why proxy instead of calling Bijlipay direct from the browser?
//   - Bijlipay QA is IP-whitelisted. With the proxy, only one IP — the AWS
//     EC2 box's public IP — needs to be allow-listed. Every user laptop
//     hitting the portal benefits automatically.
//   - Same-origin requests skip CORS entirely (Bijlipay's CORS headers don't
//     matter when we're not crossing origins).
//   - The portal's JWT auth already covers /api/*, so anonymous callers
//     can't proxy through us to abuse Bijlipay.
//
// To re-enable direct browser → Bijlipay calls (not recommended), point
// `client` at qaapp directly and drop the /bijlipay/ path segment.

export const LEAD_SOURCE_IOB = 'LS_INDIAN OVERSEAS BANK';

export const DEVICE_OPTIONS = [
  { label: 'Android POS', model: 'A75PRO' },
  { label: 'All-in-One POS', model: 'Q161_PRO_SQR' },
];

export const bijlipayApi = {
  // ── Pincode lookup (kept for future use; currently disabled in the UI) ──
  searchPincodes: (searchTerm) =>
    client
      .get('/api/bijlipay/fetchPinCodeList', { params: { searchTerm } })
      .then((r) => normalizePincodeList(r.data)),

  fetchPincodeDetails: (pincode) =>
    client
      .get(`/api/bijlipay/fetchBpRegionDetailsBasedOnPincode/${pincode}`)
      .then((r) => normalizePincodeDetails(r.data)),

  // ── Lead submission ──
  submitLead: (payload) =>
    client.post('/api/bijlipay/directBank-short-lead/1', payload).then((r) => r.data),

  // ── Lead Status — pipeline view ──
  branchLeadStatus: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB }) =>
    client
      .get('/api/bijlipay/lead-view-tracker', { params: { bankEmpPh, leadSource } })
      .then((r) => r.data),

  adminLeadStatus: ({ leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    client
      .get('/api/bijlipay/lead-view-tracker-admin', { params: { leadSource, page, size } })
      .then((r) => r.data),

  // ── Terminal Status — device-level view ──
  branchTerminalStatus: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    client
      .get('/api/bijlipay/lead-device-details', { params: { leadSource, bankEmpPh, page, size } })
      .then((r) => r.data),

  adminTerminalStatus: ({ leadSource = LEAD_SOURCE_IOB, page = 0, size = 10 }) =>
    client
      .get('/api/bijlipay/lead-device-details-admin', { params: { leadSource, page, size } })
      .then((r) => r.data),

  // ── Transactions (Admin) ──
  // Backend forwards as a POST with both query params and a JSON body.
  listTransactions: ({
    id = 4,
    page = 0,
    size = 10,
    sort = 'response_received_time,DESC',
    fromDate = '',
    toDate = '',
    txnStatus = null,
    txnType = [],
    dateRange = 0,
  } = {}) =>
    client
      .post(
        `/api/bijlipay/get-pos-transaction-pageable/${id}`,
        { txnStatus, txnType, dateRange },
        { params: { sort, page, size, fromDate, toDate } }
      )
      .then((r) => r.data),

  // ── Settled Transactions / Settlement MIS (Admin) ──
  listSettlements: ({ bankName = 'IOB', page = 0, size = 10 } = {}) =>
    client
      .get('/api/bijlipay/getSettlementMIS', { params: { bankName, page, size } })
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

// Merchant Details classification per the IOB spec:
//   Active   = {5, 6, 7, 8}
//   Inactive = {2, 3}
// Any lead with a code outside both sets (1, 4, 13, 14) is HIDDEN from the
// Merchant Details page entirely.
export const ACTIVE_STATUS_CODES = new Set([5, 6, 7, 8]);
export const INACTIVE_STATUS_CODES = new Set([2, 3]);

export function statusLabel(code) {
  if (code == null) return '—';
  return MARS_STATUS_LABELS[Number(code)] || `Status ${code}`;
}

export function isActiveTerminal(code) {
  return ACTIVE_STATUS_CODES.has(Number(code));
}
