import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../theme/ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/tickets/new', label: 'New Ticket' },
  { to: '/users', label: 'Users', adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, notifications, markAllAsRead, markOneAsRead } =
    useNotifications();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const [notificationOpen, setNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    void navigate('/login');
  };

  const isTicketsActive =
    location.pathname === '/tickets' ||
    (location.pathname.startsWith('/tickets/') &&
      !location.pathname.startsWith('/tickets/new'));
  const isNewTicketActive = location.pathname === '/tickets/new';

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          OpsDesk
        </span>
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setNotificationOpen((o) => !o)}
            className="relative flex rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'Notifications'
            }
            aria-label="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notificationOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 flex max-h-[70vh] w-64 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="shrink-0 border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'No unread notifications'}
              </div>
              {notifications.length > 0 ? (
                <>
                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          void markOneAsRead(n.id);
                          setNotificationOpen(false);
                          void navigate(`/tickets/${n.ticketId}`);
                        }}
                        className="flex min-w-0 w-full flex-col gap-0.5 overflow-hidden px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <span className="font-medium">
                          {n.type === 'message'
                            ? 'New message'
                            : 'Status changed'}
                        </span>
                        <span className="break-words text-xs text-slate-500 dark:text-slate-400">
                          Ticket ·{' '}
                          {new Date(n.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void markAllAsRead();
                      setNotificationOpen(false);
                    }}
                    className="w-full shrink-0 border-t border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    Mark all as read
                  </button>
                </>
              ) : (
                unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void markAllAsRead();
                      setNotificationOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Mark all as read
                  </button>
                )
              )}
            </div>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            aria-label={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
          >
            {theme === 'dark' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive =
            item.to === '/tickets'
              ? isTicketsActive
              : item.to === '/tickets/new'
                ? isNewTicketActive
                : undefined;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/tickets/new'}
              className={({ isActive: navActive }) => {
                const active = isActive !== undefined ? isActive : navActive;
                return `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`;
              }}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2 dark:border-slate-700">
        <div className="mb-2 truncate px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
          {user?.email}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
