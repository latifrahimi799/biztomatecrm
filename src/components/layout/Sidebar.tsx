import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Package,
  Radio,
  Settings,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';

const items = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Radio },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/companies', label: 'Accounts', icon: Building2 },
  { to: '/deals', label: 'Deals', icon: Target },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/activities', label: 'Activities', icon: ClipboardList },
  { to: '/templates', label: 'Email templates', icon: LayoutTemplate },
  { to: '/reports', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Setup', icon: Settings },
] as const;

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[var(--color-border)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          B
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Biztomate</div>
          <div className="text-xs text-muted">CRM</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-muted text-brand'
                  : 'text-gray-600 hover:bg-surface hover:text-gray-900',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-error"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
