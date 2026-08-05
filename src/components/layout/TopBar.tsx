import { Menu, Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { useCrmStore } from '../../store/crmStore';
import { useAuthStore } from '../../store/authStore';

type TopBarProps = {
  title: string;
  sidebarOpen: boolean;
  onMenuClick: () => void;
};

export function TopBar({ title, sidebarOpen, onMenuClick }: TopBarProps) {
  const query = useCrmStore((s) => s.searchQuery);
  const setSearch = useCrmStore((s) => s.setSearchQuery);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-brand/10 bg-white/70 px-3 backdrop-blur-xl sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-white text-brand shadow-sm transition-colors hover:bg-brand/10"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="truncate bg-gradient-to-r from-gray-900 via-brand to-brand-secondary bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="hidden max-w-md flex-1 items-center gap-2 sm:flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/70" />
          <Input
            placeholder="Search leads, contacts, deals…"
            value={query}
            onChange={(e) => setSearch(e.target.value)}
            className="border-brand/20 bg-white/90 pl-9 shadow-sm shadow-brand/5"
            aria-label="Global search"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative w-full max-w-[9rem] sm:hidden">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand/70" />
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setSearch(e.target.value)}
            className="!py-1.5 border-brand/20 bg-white/90 pl-8 text-xs shadow-sm shadow-brand/5"
            aria-label="Global search"
          />
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-xs font-bold text-white shadow-sm shadow-brand/30">
            {(userName ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">{userName}</div>
            <div className="text-xs text-muted">{userEmail}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
