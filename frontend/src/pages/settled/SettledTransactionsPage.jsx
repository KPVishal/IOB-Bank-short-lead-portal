import { useCallback, useEffect, useMemo, useState } from 'react';
import { bijlipayApi, normalizeListing } from '../../api/bijlipay.js';

const PAGE_SIZE = 10;

export default function SettledTransactionsPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await bijlipayApi.listSettlements({ page, size: PAGE_SIZE });
      const { items, totalElements, totalPages } = normalizeListing(data);
      setRows(items.map(expandSettlement));
      setMeta({ total: totalElements, totalPages });
    } catch (e) {
      setErr(
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        'Could not load settlements'
      );
      setRows([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { reload(); }, [reload]);

  // KPI totals are sampled from rows currently on screen — full-portfolio
  // numbers would need a dedicated aggregation endpoint at Bijlipay.
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        gross: acc.gross + (Number(r.grossAmount) || 0),
        mdrGst: acc.mdrGst + (Number(r.mdr) || 0) + (Number(r.gst) || 0),
        net: acc.net + (Number(r.netAmount) || 0),
      }),
      { gross: 0, mdrGst: 0, net: 0 }
    );
  }, [rows]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-bp-purple">Settled Transactions</h1>
        <p className="text-sm text-gray-500">Settlement MIS for IOB merchants. Totals shown for this page.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Kpi label="Gross (this page)" value={formatAmount(totals.gross)} tone="gray" />
        <Kpi label="MDR + GST (this page)" value={formatAmount(totals.mdrGst)} tone="amber" />
        <Kpi label="Net (this page)" value={formatAmount(totals.net)} tone="green" />
      </div>

      <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          Bank: <b>IOB</b> · {meta.total != null ? <>{meta.total} total records</> : null}
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter on page…"
            className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-bp-purple" />
          <button onClick={reload}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded hover:bg-bp-lavender">
            ↻ Refresh
          </button>
        </div>
      </div>

      {err && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500 text-sm">Loading settlements…</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-2">💰</div>
            <div className="text-base font-semibold text-gray-700 mb-1">No settlements found</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-action text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-3 py-3">Batch / File</th>
                    <th className="text-left px-3 py-3">TID</th>
                    <th className="text-left px-3 py-3">MID</th>
                    <th className="text-left px-3 py-3">Merchant</th>
                    <th className="text-right px-3 py-3">Gross</th>
                    <th className="text-right px-3 py-3">MDR</th>
                    <th className="text-right px-3 py-3">GST</th>
                    <th className="text-right px-3 py-3">Net</th>
                    <th className="text-left px-3 py-3">Settled At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.batchId || r.tid || i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.batchId || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-bp-purple">{r.tid || '—'}</td>
                      <td className="px-3 py-2">{r.mid || '—'}</td>
                      <td className="px-3 py-2">{r.merchantName || '—'}</td>
                      <td className="px-3 py-2 text-right">{formatAmount(r.grossAmount)}</td>
                      <td className="px-3 py-2 text-right text-amber-700">{formatAmount(r.mdr)}</td>
                      <td className="px-3 py-2 text-right text-amber-700">{formatAmount(r.gst)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">{formatAmount(r.netAmount)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.settledAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50 text-xs text-gray-600">
              <div>Showing <b>{filtered.length}</b> of <b>{meta.total}</b> records</div>
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

function Kpi({ label, value, tone }) {
  const tones = {
    gray:  'bg-gray-50 border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return (
    <div className={`rounded border p-3 ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-action">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function expandSettlement(r) {
  const raw = r.raw || {};
  const get = (...keys) => {
    for (const k of keys) {
      if (raw[k] != null && raw[k] !== '') return raw[k];
    }
    return '';
  };
  return {
    ...r,
    batchId: get('batchId', 'batch_id', 'fileId', 'file_id', 'settlementId', 'settlement_id'),
    tid: r.tid || get('tid', 'TID', 'terminalId', 'terminal_id'),
    mid: r.mid || get('mid', 'MID', 'merchantId', 'merchant_id'),
    merchantName: r.merchantName || get('merchantName', 'merchant_name'),
    grossAmount: get('grossAmount', 'gross_amount', 'amount', 'totalAmount'),
    mdr: get('mdr', 'MDR', 'mdrAmount', 'mdr_amount'),
    gst: get('gst', 'GST', 'gstAmount', 'gst_amount'),
    netAmount: get('netAmount', 'net_amount', 'settlementAmount', 'settled_amount'),
    settledAt: formatDate(get('settledAt', 'settlement_date', 'settlementDate', 'createdAt', 'created_at')),
  };
}

function formatAmount(n) {
  const v = Number(n);
  if (Number.isNaN(v) || !n) return '—';
  // Bijlipay amounts are in paise (smallest unit).
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
