import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import type { TeamMember, TeamRole } from '../types/crm';
import { useAuthStore } from '../store/authStore';
import { useCrmStore } from '../store/crmStore';
import {
  createTeamUser,
  listTeamMembers,
  updateTeamMemberRole,
} from '../lib/supabase/users';

const ROLES: TeamRole[] = ['super_admin', 'admin', 'sales', 'marketing', 'support'];

const ROLE_LABEL: Record<TeamRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  sales: 'Sales',
  marketing: 'Marketing',
  support: 'Support',
};

export function TeamAdminSection() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const myRole = useAuthStore((s) => s.role);
  const myTeamMemberId = useAuthStore((s) => s.teamMemberId);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales' as TeamRole,
  });

  async function reload() {
    const result = await listTeamMembers();
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setMembers(result);
    useCrmStore.setState({ team: result });
  }

  useEffect(() => {
    void reload();
  }, []);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardTitle>Team & access</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Your role: <Badge tone="secondary">{myRole ? ROLE_LABEL[myRole] : '—'}</Badge>
        </p>
        <p className="mt-2 text-sm text-muted">
          You only see CRM records assigned to you (owner). Super Admin can see all records and
          manage users.
        </p>
        <ul className="mt-4 divide-y divide-brand/10">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium text-gray-900">
                  {m.name}
                  {m.id === myTeamMemberId ? (
                    <span className="ml-2 text-xs text-brand">(you)</span>
                  ) : null}
                </div>
                <div className="text-sm text-muted">{m.email}</div>
              </div>
              <Badge tone={m.role === 'super_admin' ? 'default' : 'secondary'}>
                {ROLE_LABEL[m.role] ?? m.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await createTeamUser(form);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
    setForm({ name: '', email: '', password: '', role: 'sales' });
    await reload();
  }

  async function onRoleChange(id: string, role: TeamRole) {
    setBusy(true);
    setError(null);
    const err = await updateTeamMemberRole(id, role);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await reload();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Users & roles (Super Admin)</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Super Admin sees every contact, lead, activity, and deal. Other roles only see their
            own (owner) records.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Add user
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-brand/10">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium text-gray-900">
                {m.name}
                {m.id === myTeamMemberId ? (
                  <span className="ml-2 text-xs text-brand">(you)</span>
                ) : null}
              </div>
              <div className="text-sm text-muted">{m.email}</div>
            </div>
            <Select
              className="min-w-[10rem]"
              value={m.role}
              disabled={busy || m.id === myTeamMemberId}
              onChange={(e) => void onRoleChange(m.id, e.target.value as TeamRole)}
              title={
                m.id === myTeamMemberId
                  ? 'You cannot change your own super admin role here'
                  : undefined
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>

      <Modal open={open} onClose={() => setOpen(false)} title="Add team user">
        <form onSubmit={onCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Full name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Temporary password
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as TeamRole }))
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted">
            Creates a Supabase Auth login and a CRM seat. Share the email/password with the user.
            They will only see records they own after sign-in.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
