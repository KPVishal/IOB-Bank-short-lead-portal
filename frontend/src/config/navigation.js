export const NAV_ITEMS = [
  { id: 'dashboard',      path: '/dashboard',      label: 'Dashboard',            icon: '🏠', roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { id: 'lead-entry',     path: '/lead-entry',     label: 'Bank Lead Entry',      icon: '📝', roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { id: 'status-tracker', path: '/status-tracker', label: 'Status Tracker',       icon: '🔎', roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { id: 'merchants',      path: '/merchants',      label: 'Merchant Details',     icon: '🏬', roles: ['ADMIN'] },
  { id: 'transactions',   path: '/transactions',   label: 'Transactions',         icon: '💳', roles: ['ADMIN'] },
  { id: 'settled',        path: '/settled',        label: 'Settled Transactions', icon: '💰', roles: ['ADMIN'] },
  { id: 'users',          path: '/users',          label: 'User Management',      icon: '👥', roles: ['ADMIN'] },
  { id: 'branches',       path: '/branches',       label: 'Branch Management',    icon: '🏛️', roles: ['ADMIN'] },
];
