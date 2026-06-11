import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { branchesApi } from '../api/branches.js';
import { usersApi } from '../api/users.js';
import {
  bijlipayApi,
  ACTIVE_STATUS_CODES,
  INACTIVE_STATUS_CODES,
  LEAD_STATUS_LABELS,
  MARS_STATUS_LABELS,
  normalizeListing,
  normalizeLeadRow,
  normalizeTerminalRow,
  leadStatusLabel,
  leadStatusTone,
  terminalStatusLabel,
} from '../api/bijlipay.js';

const LARGE_PAGE = 500;

// In-progress lead statuses for the Aging Tracker (drop Closed / approved / final).
const IN_PROGRESS_LEAD_CODES = Object.keys(LEAD_STATUS_LABELS)
  .map(Number)
  .filter((c) => ![0, 11, 13, 14].includes(c));

// Stage flow for Terminal Status widget.
const TERMINAL_STAGES = [
  { code: 1, label: 'TID Generated' },
  { code: 4, label: 'SAT Assigned' },
  { code: 5, label: 'Scan Picked' },
  { code: 6, label: 'Implemented' },
];

const AGE_BUCKETS = [
  { id: '0-7',  label: '0–7d',   min: 0,  max: 7   },
  { id: '8-30', label: '8–30d',  min: 8,  max: 30  },
  { id: '31-60',label: '31–60d', min: 31, max: 60  },
  { id: '60+',  label: '60+d',   min: 61, max: Infinity },
];

function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function bucketOf(days) {
  for (const b of AGE_BUCKETS) {
    if (days >= b.min && days <= b.max) return b.id;
  }
  return null;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');

    const load = async () => {
      const out = {};
      try {
        if (isAdmin) {
          const [branchesAll, branchesActive, usersAll] = await Promise.all([
            branchesApi.list({ size: 1 }),
            branchesApi.list({ size: 1, status: 'ACTIVE' }),
            usersApi.list({ size: 1 }),
          ]);
          out.totalBranches  = branchesAll.totalElements  ?? 0;
          out.activeBranches = branchesActive.totalElements ?? 0;
          out.totalUsers     = usersAll.totalElements     ?? 0;

          const [leads, terminals] = await Promise.allSettled([
            bijlipayApi.adminLeadStatus({ page: 0, size: LARGE_PAGE }),
            bijlipayApi.adminTerminalStatus({ page: 0, size: LARGE_PAGE }),
          ]);
          processLeadsResult(leads, out);
          processTerminalsResult(terminals, out);
        } else {
          if (!user?.mobile) {
            out.leadsError = 'No mobile on profile to query leads';
          } else {
            const [leads, terminals] = await Promise.allSettled([
              bijlipayApi.branchLeadStatus({ bankEmpPh: user.mobile, page: 0, size: LARGE_PAGE }),
              bijlipayApi.branchTerminalStatus({ bankEmpPh: user.mobile, page: 0, size: LARGE_PAGE }),
            ]);
            processLeadsResult(leads, out);
            processTerminalsResult(terminals, out);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.message || e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) {
          setStats(out);
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isAdmin, user]);

  const leadStatusCounts = useMemo(() => {
    const counts = {};
    (stats?.leadRows || []).forEach((r) => {
      const c = String(r.statusCode ?? '');
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [stats]);

  const leadAgingMatrix = useMemo(() => {
    // For each in-progress code, count per age bucket.
    const matrix = {};
    IN_PROGRESS_LEAD_CODES.forEach((code) => {
      matrix[code] = { '0-7': 0, '8-30': 0, '31-60': 0, '60+': 0, total: 0 };
    });
    (stats?.leadRows || []).forEach((r) => {
      const code = Number(r.statusCode);
      if (!IN_PROGRESS_LEAD_CODES.includes(code)) return;
      const d = daysSince(r.createdAtRaw);
      if (d == null) return;
      const b = bucketOf(d);
      if (!b) return;
      matrix[code][b]++;
      matrix[code].total++;
    });
    return matrix;
  }, [stats]);

  const terminalStageCounts = useMemo(() => {
    const counts = { 1: 0, 4: 0, 5: 0, 6: 0 };
    (stats?.terminalRows || []).forEach((r) => {
      const c = Number(r.statusCode);
      if (counts[c] != null) counts[c]++;
    });
    return counts;
  }, [stats]);

  const adminKpis = [
    { label: 'Total Branches',  value: stats?.totalBranches,  loading },
    { label: 'Active Branches', value: stats?.activeBranches, loading },
    { label: 'Total Users',     value: stats?.totalUsers,     loading },
    { label: 'Total Leads',     value: stats?.totalLeads,     loading, error: stats?.leadsError },
    { label: 'Total Terminals', value: stats?.totalTerminals, loading, error: stats?.terminalsError },
    { label: 'Active Terminals',   value: stats?.activeTerminals,   loading },
    { label: 'Inactive Terminals', value: stats?.inactiveTerminals, loading },
  ];
  const branchKpis = [
    { label: 'My Leads',           value: stats?.totalLeads,        loading, error: stats?.leadsError },
    { label: 'My Terminals',       value: stats?.totalTerminals,    loading, error: stats?.terminalsError },
    { label: 'Active Terminals',   value: stats?.activeTerminals,   loading },
    { label: 'Inactive Terminals', value: stats?.inactiveTerminals, loading },
  ];
  const kpis = isAdmin ? adminKpis : branchKpis;

  const hasLeadData = (stats?.leadRows || []).length > 0;
  const hasTerminalData = (stats?.terminalRows || []).length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-bp-purple">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Welcome, {user.displayName || user.email}.
        {!isAdmin && ` Sole ID ${user.soleId || '—'}.`}
      </p>

      {err && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className={`grid gap-4 ${isAdmin ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 md:grid-cols-4'}`}>
        {kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      {/* === Lead Status Tracker === */}
      <div className="mt-8">
        <SectionHeader title="Lead Status Tracker" subtitle="Count of leads per pipeline status." />
        <div className="bg-white border rounded-lg p-5">
          {loading && <div className="text-sm text-gray-500">Loading…</div>}
          {!loading && !hasLeadData && (
            <div className="text-sm text-gray-500">No leads to summarise.</div>
          )}
          {!loading && hasLeadData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {Object.keys(LEAD_STATUS_LABELS)
                .map(Number)
                .filter((code) => (leadStatusCounts[String(code)] || 0) > 0)
                .sort((a, b) => (leadStatusCounts[String(b)] || 0) - (leadStatusCounts[String(a)] || 0))
                .map((code) => (
                  <div key={code} className="flex items-center justify-between border-b border-gray-100 py-1.5">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full ${leadStatusTone(code).split(' ')[0]}`} />
                      {leadStatusLabel(code)}
                    </span>
                    <span className="text-sm font-semibold text-bp-purple">{leadStatusCounts[String(code)]}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* === Terminal Status Stages === */}
      <div className="mt-8">
        <SectionHeader title="Terminal Status — Stages" subtitle="Pipeline flow from TID generation to implementation." />
        <div className="bg-white border rounded-lg p-5">
          {loading && <div className="text-sm text-gray-500">Loading…</div>}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TERMINAL_STAGES.map((stage, i) => (
                <div key={stage.code} className="relative">
                  <div className="bg-bp-pink border border-bp-lavender rounded-lg p-4 text-center">
                    <div className="text-[11px] uppercase tracking-action text-bp-purple mb-2">Stage {i + 1}</div>
                    <div className="text-3xl font-bold text-bp-purple">{terminalStageCounts[stage.code]}</div>
                    <div className="text-xs text-gray-700 mt-2">{stage.label}</div>
                  </div>
                  {i < TERMINAL_STAGES.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-1.5 -translate-y-1/2 text-bp-purple text-lg">›</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!loading && !hasTerminalData && (
            <div className="mt-3 text-xs text-gray-500">No terminals yet — counts will populate as leads progress.</div>
          )}
        </div>
      </div>

      {/* === Lead Aging Tracker === */}
      <div className="mt-8 mb-4">
        <SectionHeader title="Lead Aging Tracker" subtitle="Days since lead created, bucketed per in-progress status." />
        <div className="bg-white border rounded-lg overflow-hidden">
          {loading && <div className="p-5 text-sm text-gray-500">Loading…</div>}
          {!loading && !hasLeadData && (
            <div className="p-5 text-sm text-gray-500">No leads to age.</div>
          )}
          {!loading && hasLeadData && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-action text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Status</th>
                    {AGE_BUCKETS.map((b) => (
                      <th key={b.id} className="text-right px-4 py-3">{b.label}</th>
                    ))}
                    <th className="text-right px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {IN_PROGRESS_LEAD_CODES
                    .filter((code) => leadAgingMatrix[code]?.total > 0)
                    .sort((a, b) => leadAgingMatrix[b].total - leadAgingMatrix[a].total)
                    .map((code) => {
                      const row = leadAgingMatrix[code];
                      return (
                        <tr key={code} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${leadStatusTone(code)}`}>
                              {leadStatusLabel(code)}
                            </span>
                          </td>
                          {AGE_BUCKETS.map((b) => (
                            <td key={b.id} className="px-4 py-2 text-right">
                              {row[b.id] > 0 ? (
                                <span className={b.id === '60+' && row[b.id] > 0 ? 'text-red-700 font-semibold' : ''}>{row[b.id]}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-semibold text-bp-purple">{row.total}</td>
                        </tr>
                      );
                    })}
                  {IN_PROGRESS_LEAD_CODES.every((code) => (leadAgingMatrix[code]?.total || 0) === 0) && (
                    <tr>
                      <td colSpan={AGE_BUCKETS.length + 2} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No in-progress leads.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function processLeadsResult(promiseResult, out) {
  if (promiseResult.status === 'fulfilled') {
    const norm = normalizeListing(promiseResult.value);
    out.totalLeads = norm.totalElements;
    out.leadRows = norm.items.map(normalizeLeadRow);
  } else {
    out.leadsError = promiseResult.reason?.message || 'Could not reach Bijlipay';
    out.leadRows = [];
  }
}

function processTerminalsResult(promiseResult, out) {
  if (promiseResult.status === 'fulfilled') {
    const norm = normalizeListing(promiseResult.value);
    out.totalTerminals = norm.totalElements;
    const rows = norm.items.map(normalizeTerminalRow);
    out.terminalRows = rows;
    let active = 0, inactive = 0;
    rows.forEach((r) => {
      const c = Number(r.statusCode);
      if (ACTIVE_STATUS_CODES.has(c)) active++;
      else if (INACTIVE_STATUS_CODES.has(c)) inactive++;
    });
    out.activeTerminals   = active;
    out.inactiveTerminals = inactive;
  } else {
    out.terminalsError = promiseResult.reason?.message || 'Could not reach Bijlipay';
    out.terminalRows = [];
  }
}

function Kpi({ label, value, loading, error, hint }) {
  return (
    <div className="bg-white rounded-lg p-4 border shadow-sm">
      <div className="text-[11px] uppercase tracking-action text-gray-500 mb-2">{label}</div>
      <div className="text-2xl font-bold text-bp-purple">
        {loading ? '…' : error ? <span className="text-red-600 text-sm font-medium">err</span> :
          value == null ? '—' : value.toLocaleString()}
      </div>
      {hint && !loading && !error && <div className="text-[10px] text-gray-400 mt-1">{hint}</div>}
      {error && <div className="text-[10px] text-red-600 mt-1" title={error}>{(error || '').slice(0, 30)}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-action text-bp-purple">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
