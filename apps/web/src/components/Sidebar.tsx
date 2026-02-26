import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/tickets/new', label: 'New Ticket' },
  { to: '/users', label: 'Users', adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.roles.includes('admin') ?? false;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="font-semibold text-slate-800">OpsDesk</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2">
        <div className="mb-2 truncate px-3 py-1 text-xs text-slate-500">
          {user?.email}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
