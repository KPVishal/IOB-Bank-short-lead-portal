import { useCallback, useEffect, useState } from 'react';
import { branchesApi } from '../../api/branches.js';
import { referenceApi } from '../../api/reference.js';
import Autocomplete from '../../components/Autocomplete.jsx';
import CreateBranchModal from './CreateBranchModal.jsx';
import BulkUploadModal from './BulkUploadModal.jsx';

const PAGE_SIZE = 20;

export default function BranchesPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [q, setQ] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [states, setStates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    referenceApi.states().then(setStates).catch(() => {});
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setErr('');
    const params = { page, size: PAGE_SIZE };
    if (q.trim()) params.q = q.trim();
    if (cityFilter.trim()) params.city = cityFilter.trim();
    if (stateFilter.trim()) params.state = stateFilter.trim();
    if (statusFilter) params.status = statusFilter;
    branchesApi
      .list(params)
      .then(setData)
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load branches'))
      .finally(() => setLoading(false));
  }, [page, q, cityFilter, stateFilter, statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  const onSearch = (e) => {
    e?.preventDefault();
    setPage(0);
    reload();
  };

  const onClear = () => {
    setQ('');
    setCityFilter('');
    setStateFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const fetchCities = useCallback(
    (query) =>
      referenceApi.cities({ q: query, state: stateFilter || undefined, limit: 30 }).catch(() => []),
    [stateFilter]
  );

  const hasFilters = q || cityFilter || stateFilter || statusFilter;
  const totalCount = data.totalElements ?? 0;
  const showEmpty = !loading && totalCount === 0 && !hasFilters;
  const showNoMatch = !loading && totalCount === 0 && hasFilters;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-bp-purple">Branch Management</h1>
          <p className="text-sm text-gray-500">Manage IOB branches and Sole IDs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded hover:bg-bp-lavender"
          >
            ⤴ Bulk Upload
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep"
          >
            + Create New Branch
          </button>
        </div>
      </div>

      <form onSubmit={onSearch} className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">Search (Sole ID / Branch name)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. 0023 or Chennai"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">State</label>
          <Autocomplete
            value={stateFilter}
            onChange={setStateFilter}
            options={states}
            placeholder="All states"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-action text-gray-600 mb-1">City</label>
          <Autocomplete
            value={cityFilter}
            onChange={setCityFilter}
            fetchOptions={fetchCities}
            getLabel={(c) => c.name || c}
            getSecondary={(c) => c.state}
            placeholder="All cities"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-bp-purple text-white text-sm font-semibold uppercase tracking-action rounded hover:bg-bp-deep">
            🔍 Search
          </button>
          <button type="button" onClick={onClear} className="px-3 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50" title="Clear filters">✕</button>
        </div>
        <div className="md:col-span-5 flex gap-3 items-center">
          <span className="text-[11px] font-semibold uppercase tracking-action text-gray-500">Status:</span>
          {['', 'ACTIVE', 'INACTIVE'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`px-3 py-1 text-xs rounded-full border ${
                statusFilter === s
                  ? 'bg-bp-purple text-white border-bp-purple'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-bp-purple'
              }`}
            >
              {s === '' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </form>

      {err && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500 text-sm">Loading branches…</div>}

        {showEmpty && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-2">🏛️</div>
            <div className="text-base font-semibold text-gray-700 mb-1">No branch added</div>
            <div className="text-sm text-gray-500 mb-4">Start by adding your first branch — single entry or bulk upload.</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm font-semibold uppercase tracking-action bg-bp-purple text-white rounded hover:bg-bp-deep">
                + Create New Branch
              </button>
              <button onClick={() => setShowBulk(true)} className="px-4 py-2 text-sm font-semibold uppercase tracking-action border-2 border-bp-purple text-bp-purple rounded hover:bg-bp-lavender">
                ⤴ Bulk Upload
              </button>
            </div>
          </div>
        )}

        {showNoMatch && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-2">🔎</div>
            <div className="text-base font-semibold text-gray-700 mb-1">No branches match your filters</div>
            <button onClick={onClear} className="mt-2 text-sm text-bp-purple hover:underline">Clear filters</button>
          </div>
        )}

        {!loading && data.content && data.content.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-action text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Sole ID</th>
                    <th className="text-left px-4 py-3">Branch Name</th>
                    <th className="text-left px-4 py-3">City</th>
                    <th className="text-left px-4 py-3">State</th>
                    <th className="text-left px-4 py-3">Pincode</th>
                    <th className="text-left px-4 py-3">Bank Region</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-bp-purple">{b.soleId}</td>
                      <td className="px-4 py-3">{b.branchName}</td>
                      <td className="px-4 py-3">{b.city}</td>
                      <td className="px-4 py-3">{b.state}</td>
                      <td className="px-4 py-3">{b.pincode}</td>
                      <td className="px-4 py-3 text-gray-700">{b.bankRegion || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {b.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50 text-xs text-gray-600">
              <div>
                Showing <b>{data.content.length}</b> of <b>{data.totalElements}</b> branches
              </div>
              <div className="flex gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
                >‹ Prev</button>
                <span className="px-3 py-1">Page {page + 1} / {data.totalPages || 1}</span>
                <button
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
                >Next ›</button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateBranchModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        states={states}
        onCreated={() => { setShowCreate(false); setPage(0); reload(); }}
      />
      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onImported={() => { setPage(0); reload(); }}
      />
    </div>
  );
}
