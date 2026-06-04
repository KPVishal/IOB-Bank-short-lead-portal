import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../config/navigation.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  const items = NAV_ITEMS.filter((it) => it.roles.includes(user.role));

  return (
    <aside className="w-64 bg-gradient-to-b from-bp-purple to-bp-deep text-white flex-shrink-0 sticky top-16 self-start" style={{ height: 'calc(100vh - 64px)' }}>
      <nav className="py-4">
        {items.map((it) => (
          <NavLink
            key={it.id}
            to={it.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm uppercase tracking-action transition-colors border-l-4 ${
                isActive
                  ? 'bg-white/15 border-white'
                  : 'border-transparent hover:bg-white/10'
              }`
            }
          >
            <span className="text-base">{it.icon}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 px-5 py-4 text-[10px] text-white/60 uppercase tracking-action border-t border-white/10">
        Role: {user.role === 'ADMIN' ? 'Administrator' : 'Branch Manager'}
        {user.soleId && <div className="mt-1 normal-case tracking-normal text-white/80">Sole ID: {user.soleId}</div>}
      </div>
    </aside>
  );
}
