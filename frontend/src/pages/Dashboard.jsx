import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { branchesApi } from '../api/branches.js';
import { usersApi } from '../api/users.js';
import {
  bijlipayApi,
  ACTIVE_STATUS_CODES,
  INACTIVE_STATUS_CODES,
} from '../api/bijlipay.js';
import { normalizeListing } from './status/LeadStatusTab.jsx';

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
          out.totalBranches = branchesAll.totalElements ?? 0;
          out.activeBranches = branchesActive.totalElements ?? 0;
          out.totalUsers = usersAll.totalElements ?? 0;

          const [leads, terminals] = await Promise.allSettled([
            bijlipayApi.leadDeviceDetailsAdmin({ page: 0, size: 1 }),
            bijlipayApi.terminalStatusAdmin({ page: 0, size: 100 }),
          ]);
          if (leads.status === 'fulfilled') {
            const norm = normalizeListing(leads.value, 0);
            out.totalLeads = norm.totalElements;
          } else {
            out.leadsError = leads.reason?.message || 'Could not reach Bijlipay';
          }
          if (terminals.status === 'fulfilled') {
            const norm = normalizeListing(terminals.value, 0);
            out.totalTerminals = norm.totalElements;
            let active = 0, inactive = 0;
            norm.items.forEach((r) => {
              const c = Number(r.statusCode);
              if (ACTIVE_STATUS_CODES.has(c)) active++;
              else if (INACTIVE_STATUS_CODES.has(c)) inactive++;
            });
            out.activeTerminalsSample = active;
            out.inactiveTerminalsSample = inactive;
            out.terminalSampleSize = norm.items.length;
          } else {
            out.terminalsError = terminals.reason?.message || 'Could not reach Bijlipay';
          }
        } else {
          // Branch user — only their data
          if (!user?.mobile) {
            out.leadsError = 'No mobile on profile to query leads';
          } else {
            const [leads, terminals] = await Promise.allSettled([
              bijlipayApi.leadTrackerBranch({ bankEmpPh: user.mobile }),
              bijlipayApi.terminalStatusBranch({ bankEmpPh: user.mobile, page: 0, size: 100 }),
            ]);
            if (leads.status === 'fulfilled') {
              const norm = normalizeListing(leads.value, 0);
              out.totalLeads = norm.totalElements;
            } else {
              out.leadsError = leads.reason?.message || 'Could not reach Bijlipay';
            }
            if (terminals.status === 'fulfilled') {
              const norm = normalizeListing(terminals.value, 0);
              out.totalTerminals = norm.totalElements;
              let active = 0, inactive = 0;
              norm.items.forEach((r) => {
                const c = Number(r.statusCode);
                if (ACTIVE_STATUS_CODES.has(c)) active++;
                else if (INACTIVE_STATUS_CODES.has(c)) inactive++;
              });
              out.activeTerminalsSample = active;
              out.inactiveTerminalsSample = inactive;
              out.terminalSampleSize = norm.items.length;
            } else {
              out.terminalsError = terminals.reason?.message || 'Could not reach Bijlipay';
            }
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

  const adminKpis = [
    { label: 'Total Branches',  value: stats?.totalBranches,  loading },
    { label: 'Active Branches', value: stats?.activeBranches, loading },
    { label: 'Total Users',     value: stats?.totalUsers,     loading },
    { label: 'Total Leads',     value: stats?.totalLeads,     loading, error: stats?.leadsError },
    { label: 'Total Terminals', value: stats?.totalTerminals, loading, error: stats?.terminalsError },
    { label: 'Active (sample)',   value: stats?.activeTerminalsSample,   loading, hint: stats?.terminalSampleSize != null ? `from ${stats.terminalSampleSize} latest` : '' },
    { label: 'Inactive (sample)', value: stats?.inactiveTerminalsSample, loading, hint: stats?.terminalSampleSize != null ? `from ${stats.terminalSampleSize} latest` : '' },
  ];

  const branchKpis = [
    { label: 'My Leads',     value: stats?.totalLeads,     loading, error: stats?.leadsError },
    { label: 'My Terminals', value: stats?.totalTerminals, loading, error: stats?.terminalsError },
    { label: 'Active (sample)',   value: stats?.activeTerminalsSample,   loading, hint: stats?.terminalSampleSize != null ? `from ${stats.terminalSampleSize} latest` : '' },
    { label: 'Inactive (sample)', value: stats?.inactiveTerminalsSample, loading, hint: stats?.terminalSampleSize != null ? `from ${stats.terminalSampleSize} latest` : '' },
  ];

  const kpis = isAdmin ? adminKpis : branchKpis;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-bp-purple">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Welcome, {user.displayName || user.email}.{' '}
        {isAdmin ? 'Admin view — full portal access.' : `Branch view — scoped to Sole ID ${user.soleId || '—'}.`}
      </p>

      {err && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className={`grid gap-4 ${isAdmin ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 md:grid-cols-4'}`}>
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Terminal Status — Stages">
          Visual stage cards (TID → SAT Assigned → Scan Picked → Implemented) will plug in here, sourcing the same terminal-status data shown in Status Tracker.
        </Section>
        <Section title="Lead Aging Tracker">
          Per-status aging buckets will appear once the Bijlipay lead response includes a createdAt timestamp for client-side bucketing.
        </Section>
      </div>

      <div className="mt-8 p-4 bg-bp-pink border border-bp-lavender rounded text-sm text-gray-600">
        KPI cards now pull live counts from the Branch table, User table, and Bijlipay QA APIs.
        Active/Inactive breakdowns are sampled from the latest 100 terminal records — full breakdowns will require a server-side aggregation endpoint.
      </div>
    </div>
  );
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

function Section({ title, children, wide }) {
  return (
    <div className={`bg-white rounded-lg border p-5 shadow-sm ${wide ? 'lg:col-span-2' : ''}`}>
      <h2 className="text-sm font-semibold uppercase tracking-action text-bp-purple mb-3">{title}</h2>
      <div className="text-sm text-gray-500 border border-dashed rounded p-6 text-center">{children}</div>
    </div>
  );
}
