import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  bijlipayApi,
  normalizeListing,
  normalizeTerminalRow,
  terminalStatusLabel,
  terminalStatusTone,
} from '../../api/bijlipay.js';

const PAGE_SIZE = 10;

export default function TerminalStatusTab() {
  const { user, isAdmin } = useAuth();
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
      const data = isAdmin
        ? await bijlipayApi.adminTerminalStatus({ page, size: PAGE_SIZE })
        : await bijlipayApi.branchTerminalStatus({ bankEmpPh: user?.mobile, page, size: PAGE_SIZE });
      const { items, totalElements, totalPages } = normalizeListing(data);
      setRows(items.map(normalizeTerminalRow));
      setMeta({ total: totalElements, totalPages });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not load terminal status');
      setRows([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, page]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = q.trim()
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.trim().toLowerCase()))
    : rows;

  return (
    <div>
      <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          {isAdmin
            ? <>All terminals under <b>LS_INDIAN OVERSEAS BANK</b></>
            : <>Your terminals (filtered by phone <b>{user?.mobile || '—'}</b>)</>}
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter on page…"
            className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-bp-purple"
          />
          <button
            onClick={reload}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded hover:bg-bp-lavender"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {err && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500 text-sm">Loading terminals…</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-2">💳</div>
            <div className="text-base font-semibold text-gray-700 mb-1">No terminals found</div>
            <div className="text-sm text-gray-500">Once a lead progresses to TID generation, the terminal will appear here.</div>
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
                    <th className="text-left px-3 py-3">App No.</th>
                    <th className="text-left px-3 py-3">Lead ID</th>
                    <th className="text-left px-3 py-3">Lead Name</th>
                    <th className="text-left px-3 py-3">Phone</th>
                    <th className="text-left px-3 py-3">Bank Region</th>
                    <th className="text-left px-3 py-3">Device</th>
                    <th className="text-left px-3 py-3">City</th>
                    <th className="text-left px-3 py-3">State</th>
                    <th className="text-left px-3 py-3">Pincode</th>
                    <th className="text-left px-3 py-3">Created</th>
                    <th className="text-left px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || r.tid || i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-bp-purple">{r.tid || '—'}</td>
                      <td className="px-3 py-2">{r.mid || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.applicationNumber || '—'}</td>
                      <td className="px-3 py-2">{r.leadId || '—'}</td>
                      <td className="px-3 py-2">{r.leadName || '—'}</td>
                      <td className="px-3 py-2">{r.contactNumber || '—'}</td>
                      <td className="px-3 py-2">{r.bankRegion || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.deviceName || '—'}</td>
                      <td className="px-3 py-2">{r.terminalCity || r.leadCity || '—'}</td>
                      <td className="px-3 py-2">{r.terminalState || r.leadState || '—'}</td>
                      <td className="px-3 py-2">{r.terminalPincode || r.leadPincode || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.createdAt || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${terminalStatusTone(r.statusCode)}`}>
                          {terminalStatusLabel(r.statusCode)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50 text-xs text-gray-600">
              <div>Showing <b>{filtered.length}</b> of <b>{meta.total}</b> records</div>
              <div className="flex gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
                >‹ Prev</button>
                <span className="px-3 py-1">Page {page + 1} / {meta.totalPages || 1}</span>
                <button
                  disabled={page + 1 >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
                >Next ›</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
