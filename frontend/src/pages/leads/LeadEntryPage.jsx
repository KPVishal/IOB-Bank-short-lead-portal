import { useState } from 'react';
import LeadSingleForm from './LeadSingleForm.jsx';
import LeadBulkUpload from './LeadBulkUpload.jsx';

const TABS = [
  { id: 'single', label: 'Single Entry' },
  { id: 'bulk',   label: 'Bulk Upload' },
];

export default function LeadEntryPage() {
  const [tab, setTab] = useState('single');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-bp-purple">Bank Lead Entry</h1>
        <p className="text-sm text-gray-500">Capture merchant leads and submit them to the Bijlipay onboarding pipeline.</p>
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

      {tab === 'single' && <LeadSingleForm />}
      {tab === 'bulk' && <LeadBulkUpload />}
    </div>
  );
}
