import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/rules', label: 'Rules', icon: BookOpen },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-navy text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-navy-light">
        <h1 className="text-xl font-bold tracking-tight">Unloch</h1>
        <p className="text-sm text-teal-light mt-1 opacity-80">Clinical Dashboard</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-navy-light text-teal-light border-r-2 border-teal'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-navy-light">
        <div className="text-sm font-medium">{user?.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 mt-3 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
