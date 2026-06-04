import { useState } from 'react';
import LeadStatusTab from './LeadStatusTab.jsx';
import TerminalStatusTab from './TerminalStatusTab.jsx';

const TABS = [
  { id: 'lead',     label: 'Lead Status' },
  { id: 'terminal', label: 'Terminal Status' },
];

export default function StatusTrackerPage() {
  const [tab, setTab] = useState('lead');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-bp-purple">Status Tracker</h1>
        <p className="text-sm text-gray-500">
          Track lead progress and terminal-device status. Data is pulled live from the Bijlipay pipeline.
        </p>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-action border-b-2 -mb-px ${
                  active
                    ? 'border-bp-purple text-bp-purple'
                    : 'border-transparent text-gray-500 hover:text-bp-purple'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === 'lead'     && <LeadStatusTab />}
      {tab === 'terminal' && <TerminalStatusTab />}
    </div>
  );
}
