import { useCallback, useEffect, useMemo, useState } from 'react';
import { bijlipayApi } from '../../api/bijlipay.js';
import { normalizeListing } from '../status/LeadStatusTab.jsx';

const PAGE_SIZE = 10;

// MTI → channel label (per HANDOVER reference).
const MTI_LABEL = {
  100: 'UPI',
  200: 'Card',
};

// Common transaction statuses Bijlipay uses. The dropdown is open-ended —
// "All" sends null so the upstream returns every status.
const STATUS_OPTIONS = [
  { value: '',  label: 'All' },
  { value: 1,   label: 'Success' },
  { value: 2,   label: 'Failed' },
  { value: 3,   label: 'Pending' },
  { value: 4,   label: 'Reversed' },
];

export default function TransactionsPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [txnStatus, setTxnStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [q, setQ] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await bijlipayApi.listTransactions({
        page,
        size: PAGE_SIZE,
        fromDate,
        toDate,
        txnStatus: txnStatus === '' ? null : Number(txnStatus),
        txnType: [],
        dateRange: 0,
      });
      const { items, totalElements, totalPages } = normalizeListing(data, page);
      setRows(items.map(expandTxn));
      setMeta({ total: totalElements, totalPages });
    } catch (e) {
      setErr(
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        'Could not load transactions'
      );
      setRows([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, txnStatus]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  const onSearch = (e) => {
    e?.preventDefault();
    setPage(0);
    reload();
  };

  const onClear = () => {
    setTxnStatus('');
    setFromDate('');
    setToDate('');
    setQ('');
    setPage(0);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-bp-purple">Transactions</h1>
        <p className="text-sm text-gray-500">
          POS card / UPI transactions for IOB merchants.
        </p>
      </div>

      <form onSubmit={onSearch} className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">Status</label>
          <select value={txnStatus} onChange={(e) => setTxnStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple bg-white">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">Filter on page</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="TID, MID, merchant…"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-bp-purple text-white text-sm font-semibold uppercase tracking-action rounded hover:bg-bp-deep">
            🔍 Search
          </button>
          <button type="button" onClick={onClear}
            className="px-3 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50" title="Clear filters">✕</button>
        </div>
      </form>

      {err && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500 text-sm">Loading transactions…</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-2">💳</div>
            <div className="text-base font-semibold text-gray-700 mb-1">No transactions found</div>
            <div className="text-sm text-gray-500">Adjust the filters above or pick a different date range.</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-action text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-3 py-3">TID</th>
                    <th className="text-left px-3 py-3">MID</th>
                    <th className="text-left px-3 py-3">Merchant</th>
                    <th className="text-left px-3 py-3">Type</th>
                    <th className="text-left px-3 py-3">Card / UPI</th>
                    <th className="text-right px-3 py-3">Amount</th>
                    <th className="text-left px-3 py-3">Resp Code</th>
                    <th className="text-left px-3 py-3">RRN</th>
                    <th className="text-left px-3 py-3">When</th>
                    <th className="text-left px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || r.tid || i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-bp-purple">{r.tid || '—'}</td>
                      <td className="px-3 py-2">{r.mid || '—'}</td>
                      <td className="px-3 py-2">{r.merchantName || '—'}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {MTI_LABEL[Number(r.mti)] || r.mti || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.cardMasked || r.upiId || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {r.amount != null ? formatAmount(r.amount) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.responseCode || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.rrn || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.txnTime || '—'}</td>
                      <td className="px-3 py-2">
                        <TxnStatusPill code={r.txnStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50 text-xs text-gray-600">
              <div>Showing <b>{filtered.length}</b> of <b>{meta.total}</b> transactions</div>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white">‹ Prev</button>
                <span className="px-3 py-1">Page {page + 1} / {meta.totalPages || 1}</span>
                <button disabled={page + 1 >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white">Next ›</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TxnStatusPill({ code }) {
  const c = Number(code);
  const tone =
    c === 1 ? 'bg-green-100 text-green-700' :
    c === 2 ? 'bg-red-100 text-red-700' :
    c === 3 ? 'bg-amber-100 text-amber-800' :
    c === 4 ? 'bg-gray-100 text-gray-700' :
    'bg-blue-100 text-blue-700';
  const label =
    c === 1 ? 'Success' :
    c === 2 ? 'Failed' :
    c === 3 ? 'Pending' :
    c === 4 ? 'Reversed' :
    code != null ? `Status ${code}` : '—';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}>{label}</span>;
}

function expandTxn(r) {
  const raw = r.raw || {};
  const get = (...keys) => {
    for (const k of keys) {
      if (raw[k] != null && raw[k] !== '') return raw[k];
    }
    return '';
  };
  const cardRaw = get('cardNumber', 'card_number', 'pan', 'maskedCard');
  return {
    ...r,
    tid: r.tid || get('tid', 'TID', 'terminalId', 'terminal_id'),
    mid: r.mid || get('mid', 'MID', 'merchantId', 'merchant_id'),
    merchantName: r.merchantName || get('merchantName', 'merchant_name'),
    mti: get('mti', 'MTI', 'channel', 'transactionType'),
    cardMasked: maskCard(cardRaw),
    upiId: get('upiId', 'upi_id', 'vpa'),
    amount: get('amount', 'txnAmount', 'transactionAmount'),
    responseCode: get('responseCode', 'response_code', 'rc'),
    rrn: get('rrn', 'RRN', 'retrievalReferenceNumber'),
    txnTime: formatDate(get('txnTime', 'transactionTime', 'responseReceivedTime', 'response_received_time', 'createdAt', 'created_at')),
    txnStatus: get('txnStatus', 'transactionStatus', 'status'),
  };
}

function maskCard(num) {
  if (!num) return '';
  const s = String(num).replace(/\s/g, '');
  if (s.length < 10) return s;
  return `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}`;
}

function formatAmount(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  // Bijlipay returns amount in paise (smallest unit).
  return `₹${(v / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
