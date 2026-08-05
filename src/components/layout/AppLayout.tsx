import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const titles: Record<string, string> = {
  '/dashboard': 'Home',
  '/contacts': 'Contacts',
  '/companies': 'Accounts',
  '/deals': 'Deals',
  '/leads': 'Leads',
  '/templates': 'Email Templates',
  '/campaigns': 'Campaigns',
  '/activities': 'Activities',
  '/products': 'Products',
  '/quotes': 'Quotes',
  '/reports': 'Analytics',
  '/settings': 'Setup',
};

const LG = 1024;

function initialSidebarOpen() {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= LG;
}

export function AppLayout() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = titles[base] ?? 'Biztomate CRM';

  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [isDesktop, setIsDesktop] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth >= LG : true),
  );

  useEffect(() => {
    function onResize() {
      const desktop = window.innerWidth >= LG;
      setIsDesktop((was) => {
        // When crossing breakpoint into desktop, open menu; into mobile, close
        if (desktop !== was) {
          setSidebarOpen(desktop);
        }
        return desktop;
      });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close overlay after navigation on small screens
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [pathname, isDesktop]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="relative z-10 flex h-screen bg-transparent">
      {!isDesktop && sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[2px]"
          onClick={closeSidebar}
        />
      ) : null}

      <Sidebar open={sidebarOpen} isDesktop={isDesktop} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          sidebarOpen={sidebarOpen}
          onMenuClick={toggleSidebar}
        />
        <main className="crm-animate-in flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
