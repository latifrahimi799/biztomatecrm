import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contacts',
  '/companies': 'Companies',
  '/deals': 'Deals & pipeline',
  '/leads': 'Leads',
  '/templates': 'Email templates',
  '/campaigns': 'Campaigns',
  '/activities': 'Activities',
  '/products': 'Products',
  '/quotes': 'Quotes',
  '/reports': 'Reports & analytics',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = titles[base] ?? 'Biztomate CRM';

  return (
    <div className="relative z-10 flex h-screen bg-surface/95">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
