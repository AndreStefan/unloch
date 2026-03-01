import { NavLink } from 'react-router-dom';
import { MessageCircle, SmilePlus, ClipboardList, Shield, Settings } from 'lucide-react';

const navItems = [
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/mood', icon: SmilePlus, label: 'Mood' },
  { to: '/homework', icon: ClipboardList, label: 'Tasks' },
  { to: '/transparency', icon: Shield, label: 'My Data' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-cream-dark z-40"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
                isActive
                  ? 'text-sage-dark font-semibold'
                  : 'text-warm-gray hover:text-navy'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-semibold text-sage-dark' : 'font-medium text-warm-gray'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
