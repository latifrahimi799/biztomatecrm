import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { useCrmStore } from '../../store/crmStore';
import { useAuthStore } from '../../store/authStore';

export function TopBar({ title }: { title: string }) {
  const query = useCrmStore((s) => s.searchQuery);
  const setSearch = useCrmStore((s) => s.setSearchQuery);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-brand/10 bg-white/70 px-6 backdrop-blur-xl">
      <h1 className="bg-gradient-to-r from-gray-900 via-brand to-brand-secondary bg-clip-text text-lg font-bold tracking-tight text-transparent">
        {title}
      </h1>
      <div className="flex max-w-md flex-1 items-center gap-2">
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
      <div className="hidden items-center gap-3 sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-xs font-bold text-white shadow-sm shadow-brand/30">
          {(userName ?? '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">{userName}</div>
          <div className="text-xs text-muted">{userEmail}</div>
        </div>
      </div>
    </header>
  );
}
