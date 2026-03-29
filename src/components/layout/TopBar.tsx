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
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex max-w-md flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search contacts, companies, deals…"
            value={query}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Global search"
          />
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium text-gray-900">{userName}</div>
        <div className="text-xs text-muted">{userEmail}</div>
      </div>
    </header>
  );
}
