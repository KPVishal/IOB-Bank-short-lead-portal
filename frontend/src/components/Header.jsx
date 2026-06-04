import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const initials = (user.displayName || user.email)
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b sticky top-0 z-20 flex items-center px-6 justify-between">
      <div className="flex items-center gap-3">
        <span className="text-iob-blue font-bold text-lg">IOB</span>
        <span className="text-gray-300">|</span>
        <span className="text-bp-purple font-bold tracking-wide">bijlipay</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-bp-purple text-lg" title="Notifications">🔔</button>
        <div className="relative" ref={ref}>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100"
            onClick={() => setOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-bp-purple text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <span className="text-sm font-semibold uppercase tracking-action">
              {user.displayName || user.email.split('@')[0]}
            </span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border z-30">
              <div className="p-4 border-b">
                <div className="font-semibold text-sm">{user.displayName || '—'}</div>
                <div className="text-xs text-gray-500 break-all">{user.email}</div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] bg-bp-lavender text-bp-purple font-semibold uppercase tracking-action">
                  {user.role === 'ADMIN' ? 'Administrator' : 'Branch Manager'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-red-600 font-medium"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
