import client from './client.js';

// All Bijlipay (Skilworth Mars) calls now go through our Spring backend at
// /api/bijlipay/*. Spring forwards each request to qaapp.bijlipay.co.in:8353
// (configurable via BIJLIPAY_BASE_URL env var on the backend).

export const LEAD_SOURCE_IOB = 'LS_INDIAN OVERSEAS BANK';

export const DEVICE_OPTIONS = [
  { label: 'Android POS', model: 'A75 PRO' },
  { label: 'All-in-One POS', model: 'Q161_PRO_SQR' },
];

export const bijlipayApi = {
  // ── Pincode lookup ──
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
  branchLeadStatus: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB, searchTerm = '', page = 0, size = 10 } = {}) =>
    client
      .get('/api/bijlipay/lead-view-tracker', { params: { bankEmpPh, leadSource, searchTerm, page, size } })
      .then((r) => r.data),

  adminLeadStatus: ({ leadSource = LEAD_SOURCE_IOB, searchTerm = '', page = 0, size = 10 } = {}) =>
    client
      .get('/api/bijlipay/lead-view-tracker-admin', { params: { leadSource, searchTerm, page, size } })
      .then((r) => r.data),

  // ── Terminal Status — device-level view ──
  branchTerminalStatus: ({ bankEmpPh, leadSource = LEAD_SOURCE_IOB, searchTerm = '', page = 0, size = 10 } = {}) =>
    client
      .get('/api/bijlipay/lead-device-details', { params: { leadSource, bankEmpPh, searchTerm, page, size } })
      .then((r) => r.data),

  adminTerminalStatus: ({ leadSource = LEAD_SOURCE_IOB, searchTerm = '', page = 0, size = 10 } = {}) =>
    client
      .get('/api/bijlipay/lead-device-details-admin', { params: { leadSource, searchTerm, page, size } })
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

// ══════════════════════════════════════════════════════════════════════
//                       Response normalisation
// ══════════════════════════════════════════════════════════════════════
// Every Bijlipay endpoint wraps its body in {status, message, data: ...}.
// `data` can be:
//   • a Spring Page object        → { content: [...], totalElements, totalPages, ... }
//   • a plain array               → [ {...}, {...} ]   (e.g. pincode details)
//   • a single record             → { ... }            (rare)
// `unwrapEnvelope` returns the inner `data` payload regardless.

function unwrapEnvelope(body) {
  if (body && typeof body === 'object' && 'data' in body &&
      ('status' in body || 'message' in body)) {
    return body.data;
  }
  return body;
}

function normalizePincodeList(body) {
  const inner = unwrapEnvelope(body);
  const arr = Array.isArray(inner) ? inner : (Array.isArray(inner?.content) ? inner.content : []);
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

function normalizePincodeDetails(body) {
  let d = unwrapEnvelope(body);
  // Bijlipay returns pincode details as an array; take the first match.
  if (Array.isArray(d)) d = d[0];
  if (!d || typeof d !== 'object') return null;
  return {
    state: d.state ?? d.stateName ?? d.bp_state ?? '',
    city: d.city ?? d.cityName ?? d.bp_city ?? '',
    region: d.region ?? d.regionGroup ?? d.region_group ?? d.bp_region_group ?? '',
    bankRegion: d.bank_region ?? d.bankRegion ?? d.bp_region ?? '',
    raw: d,
  };
}

/**
 * Generic page-style listing normaliser. Unwraps Bijlipay's envelope and
 * returns raw rows + page metadata. Each consumer decides how to map rows
 * for its specific screen (see `normalizeLeadRow`, `normalizeTerminalRow`).
 */
export function normalizeListing(body) {
  if (!body) return { items: [], totalElements: 0, totalPages: 1 };
  const inner = unwrapEnvelope(body);

  let list = [];
  let totalElements = 0;
  let totalPages = 1;

  if (Array.isArray(inner)) {
    list = inner;
    totalElements = inner.length;
    totalPages = 1;
  } else if (Array.isArray(inner?.content)) {
    list = inner.content;
    totalElements = Number(inner.totalElements ?? list.length);
    totalPages = Number(inner.totalPages ?? 1);
  } else if (Array.isArray(inner?.items)) {
    list = inner.items;
    totalElements = Number(inner.total ?? list.length);
    totalPages = Number(inner.totalPages ?? 1);
  }
  return { items: list, totalElements, totalPages };
}

/** Lead Status row (response from lead-view-tracker[-admin]). */
export function normalizeLeadRow(r) {
  if (!r || typeof r !== 'object') return {};
  const get = (...keys) => {
    for (const k of keys) {
      if (r[k] != null && r[k] !== '') return r[k];
    }
    return '';
  };
  const assigned = r.assigned_to || r.assignedTo || null;
  return {
    id: r.id,
    leadId: get('leadId', 'lead_id', 'leadNumber'),
    leadName: get('leadName', 'lead_name', 'merchantName', 'merchant_name'),
    contactNumber: get('contactNumber', 'contact_number', 'phone'),
    email: get('email', 'email_id'),
    address: get('address', 'lead_address', 'leadAddress', 'merchant_address'),
    pincode: get('pincode', 'pin_code'),
    city: get('city'),
    state: get('state', 'state_name', 'stateName'),
    bankRegion: get('bankRegion', 'bank_region'),
    deviceCount: get('deviceCount', 'device_count'),
    // device model — Bijlipay returns either a nested device.deviceName OR a
    // flat deviceModel field (the latter is a future schema addition).
    deviceModel:
      (r.device && (r.device.deviceName || r.device.device_name)) ||
      get('deviceModel', 'device_model') || '',
    // Sole ID — currently always null/empty; Bijlipay will populate later.
    soleId: get('sole_id', 'soleId', 'sold_id'),
    assignedToName: assigned?.name || '',
    assignedToEmail: assigned?.email || '',
    assignedToContact: assigned?.contactNumber || assigned?.contact_number || '',
    createdAt: formatDate(get('createdAt', 'created_at', 'createdDate', 'created_date')),
    updatedAt: formatDate(get('updatedAt', 'updated_at', 'updatedDate', 'updated_date')),
    // Raw createdAt for client-side sorting (ISO string preserves chrono order).
    createdAtRaw: get('createdAt', 'created_at', 'createdDate', 'created_date'),
    statusCode: get('status', 'lead_status', 'leadStatus'),
    raw: r,
  };
}

/**
 * Terminal Status row (response from lead-device-details[-admin]). Each
 * row has lead info nested under `leadInformation` — we flatten the bits
 * we need so the table render code stays simple.
 */
export function normalizeTerminalRow(r) {
  if (!r || typeof r !== 'object') return {};
  const li = r.leadInformation || {};
  const get = (...keys) => {
    for (const k of keys) {
      if (r[k] != null && r[k] !== '') return r[k];
    }
    return '';
  };
  const getLi = (...keys) => {
    for (const k of keys) {
      if (li[k] != null && li[k] !== '') return li[k];
    }
    return '';
  };
  const liAssigned = li.assignedTo || li.assigned_to || null;
  const statusCode = Number(get('deviceStatus', 'device_status'));
  const updatedAt = get('updatedAt', 'updated_at');
  return {
    id: r.id,
    tid: get('tid', 'TID', 'terminalId', 'terminal_id'),
    mid: get('mid', 'MID', 'merchantId', 'merchant_id'),
    applicationNumber: get('applicationNumber', 'application_number'),
    leadId: getLi('leadId', 'lead_id', 'leadNumber'),
    leadName: getLi('leadName', 'lead_name', 'merchantName', 'merchant_name'),
    contactName: getLi('contactName', 'contact_name'),
    contactNumber: getLi('contactNumber', 'contact_number'),
    email: getLi('email', 'email_id'),
    bankRegion: getLi('bankRegion', 'bank_region'),
    deviceName: (li.device && (li.device.deviceName || li.device.device_name)) || '',
    deviceCount: getLi('deviceCount', 'device_count'),
    // Sole ID — Bijlipay placeholder; blank until populated.
    soleId: getLi('soleId', 'sole_id', 'sold_id'),
    // SO (assigned to) details from the nested leadInformation.
    soName: liAssigned?.name || '',
    soEmail: liAssigned?.email || '',
    soMobile: liAssigned?.contactNumber || liAssigned?.contact_number || '',
    // Lat / Long from the lead's geo coords.
    latitude: getLi('latitude', 'lat'),
    longitude: getLi('longitude', 'lng', 'lon'),
    // Lead pincode / city / state (where the merchant is)
    leadPincode: getLi('pincode'),
    leadCity: getLi('city'),
    leadState: getLi('state', 'state_name', 'stateName'),
    // Terminal install address (can differ from lead location)
    terminalPincode: get('pincode'),
    terminalCity: get('city'),
    terminalState: get('state', 'state_name', 'stateName'),
    terminalAddress: get('deviceAddress', 'device_address', 'address'),
    createdAt: formatDate(get('createdAt', 'created_at')),
    // Raw createdAt for client-side sorting.
    createdAtRaw: get('createdAt', 'created_at'),
    updatedAt: formatDate(updatedAt),
    // Installed Date = updatedAt iff deviceStatus === 6 (Implemented), else blank.
    installedAt: statusCode === 6 ? formatDate(updatedAt) : '',
    statusCode,
    leadStatusCode: getLi('leadStatus', 'lead_status'),
    raw: r,
  };
}

function formatDate(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.replace('T', ' ').slice(0, 19);
  if (typeof v === 'number') {
    const d = new Date(v);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }
  return String(v);
}

// ══════════════════════════════════════════════════════════════════════
//                         Status code labels
// ══════════════════════════════════════════════════════════════════════
// Two completely separate code spaces. Same numeric value can mean
// different things — pick the right map per context:
//   • Lead Status tab        → LEAD_STATUS_LABELS    (lead pipeline)
//   • Terminal Status tab    → MARS_STATUS_LABELS    (device pipeline)
//   • Merchant Details       → MARS_STATUS_LABELS    (filtered to {5,6,7,8} / {2,3})

export const LEAD_STATUS_LABELS = {
  0:   'Closed',
  1:   'Short Lead',
  2:   'WIP Lead',
  3:   'RSM Pending',
  4:   'RSM Rejected',
  5:   'NH Pending',
  6:   'NH Rejected',
  7:   'Submitted to SAT',
  8:   'Data Entry Pending',
  9:   'Submitted to MARS',
  10:  'MARS Rejected',
  11:  'MARS Approved',
  12:  'Implement Pending',
  13:  'Implement Approved',
  14:  'All Devices Implemented',
  50:  'Short Lead from Bank',
  101: 'MARS Referral Back',
  102: 'MARS Referral Back — Data Entry Pending',
  103: 'Base TID Pending',
  104: 'MARS Sub TID Pending',
};

export const MARS_STATUS_LABELS = {
  1:  'TID Generated',
  2:  'Inactive',
  3:  'Terminated',
  4:  'SAT Assigned',
  5:  'Scan Picked',
  6:  'Implemented',
  7:  'Implemented (SAT Pending)',
  8:  'Verification Failed',
  9:  'Installation Scheduled',
  10: 'Terminal Deployed — Docs Pending',
  11: 'Cancelled by SO',
  13: 'SAT Cancelled',
  14: 'Pre-Cancelled',
};

// Merchant Details classification per the IOB spec:
//   Active   = {5, 6, 7, 8}
//   Inactive = {2, 3}
// Codes 1, 4, 9, 10, 11, 13, 14 are HIDDEN from Merchant Details entirely.
export const ACTIVE_STATUS_CODES   = new Set([5, 6, 7, 8]);
export const INACTIVE_STATUS_CODES = new Set([2, 3]);

export function leadStatusLabel(code) {
  if (code == null || code === '') return '—';
  return LEAD_STATUS_LABELS[Number(code)] || `Status ${code}`;
}

export function terminalStatusLabel(code) {
  if (code == null || code === '') return '—';
  return MARS_STATUS_LABELS[Number(code)] || `Status ${code}`;
}

// Backwards-compat alias — older code imported this as `statusLabel`.
export const statusLabel = terminalStatusLabel;

export function leadStatusTone(code) {
  const c = Number(code);
  if ([11, 13, 14].includes(c))                return 'bg-green-100 text-green-700';
  if ([0, 4, 6, 10].includes(c))               return 'bg-red-100 text-red-700';
  if ([101].includes(c))                       return 'bg-orange-100 text-orange-700';
  if ([3, 5, 8, 12, 102, 103, 104].includes(c))return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-700'; // 1, 2, 7, 9, 50, others
}

export function terminalStatusTone(code) {
  const c = Number(code);
  if ([2, 3].includes(c))         return 'bg-red-100 text-red-700';
  if ([11, 13, 14].includes(c))   return 'bg-amber-100 text-amber-800';
  if ([6, 7].includes(c))         return 'bg-green-100 text-green-700';
  if ([8].includes(c))            return 'bg-orange-100 text-orange-700';
  return 'bg-blue-100 text-blue-700'; // 1, 4, 5, 9, 10
}

export function isActiveTerminal(code) {
  return ACTIVE_STATUS_CODES.has(Number(code));
}
