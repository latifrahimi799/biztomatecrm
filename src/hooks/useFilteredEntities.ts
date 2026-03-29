import { useMemo } from 'react';
import { useCrmStore } from '../store/crmStore';

function norm(s: string) {
  return s.toLowerCase().trim();
}

export function useFilteredEntities() {
  const q = useCrmStore((s) => s.searchQuery);
  const contacts = useCrmStore((s) => s.contacts);
  const companies = useCrmStore((s) => s.companies);
  const deals = useCrmStore((s) => s.deals);
  const leads = useCrmStore((s) => s.leads);

  return useMemo(() => {
    const nq = norm(q);
    if (!nq) {
      return { contacts, companies, deals, leads, hasFilter: false };
    }
    return {
      hasFilter: true,
      contacts: contacts.filter(
        (c) =>
          norm(c.firstName).includes(nq) ||
          norm(c.lastName).includes(nq) ||
          norm(c.email).includes(nq) ||
          norm(c.phone ?? '').includes(nq),
      ),
      companies: companies.filter(
        (c) =>
          norm(c.name).includes(nq) ||
          norm(c.industry ?? '').includes(nq) ||
          norm(c.website ?? '').includes(nq),
      ),
      deals: deals.filter((d) => norm(d.name).includes(nq)),
      leads: leads.filter(
        (l) =>
          norm(l.name).includes(nq) ||
          norm(l.email).includes(nq) ||
          norm(l.company ?? '').includes(nq),
      ),
    };
  }, [q, contacts, companies, deals, leads]);
}
