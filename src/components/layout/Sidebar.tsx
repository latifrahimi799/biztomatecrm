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
  X,
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

type SidebarProps = {
  open: boolean;
  isDesktop: boolean;
  onClose: () => void;
};

export function Sidebar({ open, isDesktop, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  // Desktop collapsed: remove from layout flow entirely
  if (isDesktop && !open) {
    return null;
  }

  return (
    <aside
      id="app-sidebar"
      className={cn(
        'flex h-full w-60 flex-col border-r border-brand/15 bg-white/95 shadow-[4px_0_24px_rgba(10,132,255,0.08)] backdrop-blur-xl',
        isDesktop
          ? 'relative z-20 shrink-0'
          : cn(
              'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out',
              open ? 'translate-x-0' : '-translate-x-full pointer-events-none',
            ),
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-brand/10 bg-gradient-to-r from-brand/10 via-white to-brand-secondary/10 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-secondary text-sm font-bold text-white shadow-md shadow-brand/30">
            B
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-gray-900">
              Biztomate
            </div>
            <div className="text-xs font-medium text-brand">CRM</div>
          </div>
        </div>
        {!isDesktop ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-brand/10 hover:text-brand"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              if (!isDesktop) onClose();
            }}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-brand to-brand-secondary text-white shadow-md shadow-brand/25'
                  : 'text-gray-600 hover:bg-brand/10 hover:text-brand',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-brand/10 p-3">
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-error"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
