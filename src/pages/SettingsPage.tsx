import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  getMicrosoftRedirectUri,
  isFixedMicrosoftRedirectConfigured,
  isMicrosoftOAuthConfigured,
} from '../lib/microsoft/config';
import { sendMailViaGraph } from '../lib/microsoft/sendMail';
import { startMicrosoftLogin } from '../lib/microsoft/startLogin';
import {
  buildCrmBackupPayload,
  tryParseCrmBackup,
  useCrmStore,
} from '../store/crmStore';
import { useAuthStore } from '../store/authStore';
import { useMicrosoftAuthStore } from '../store/microsoftAuthStore';
import { TeamAdminSection } from '../components/TeamAdminSection';
import { Badge } from '../components/ui/Badge';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resetDemoData = useCrmStore((s) => s.resetDemoData);
  const importCrmBackup = useCrmStore((s) => s.importCrmBackup);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const remoteSyncStatus = useCrmStore((s) => s.remoteSyncStatus);
  const remoteSyncError = useCrmStore((s) => s.remoteSyncError);
  const contactCount = useCrmStore((s) => s.contacts.length);
  const leadCount = useCrmStore((s) => s.leads.length);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const msConnected = useMicrosoftAuthStore((s) => Boolean(s.refreshToken || s.accessToken));
  const clearMicrosoft = useMicrosoftAuthStore((s) => s.clear);
  const [msTestTo, setMsTestTo] = useState('');
  const [msTestSubject, setMsTestSubject] = useState('Biztomate CRM test');
  const [msTestBody, setMsTestBody] = useState('<p>This is a test email from Biztomate CRM.</p>');
  const [msSendState, setMsSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msSendError, setMsSendError] = useState<string | null>(null);
  const [showMicrosoftConnectedToast, setShowMicrosoftConnectedToast] = useState(false);

  useEffect(() => {
    if (searchParams.get('microsoft') !== 'connected') return;
    setShowMicrosoftConnectedToast(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardTitle>Workspace profile</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-medium text-gray-900">{userName}</span> ({userEmail}
          ){' '}
          {role ? (
            <Badge tone={isSuperAdmin ? 'default' : 'secondary'} className="ml-1 align-middle">
              {isSuperAdmin ? 'Super Admin' : role}
            </Badge>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-muted">
          Supabase CRM sync:{' '}
          {remoteSyncStatus === 'loading' && 'loading workspace…'}
          {remoteSyncStatus === 'ready' && (
            <span className="text-gray-800">
              ready ({contactCount} contacts, {leadCount} leads + deals, accounts, campaigns, …)
            </span>
          )}
          {remoteSyncStatus === 'error' && (
            <span className="text-error">{remoteSyncError ?? 'failed'}</span>
          )}
          {remoteSyncStatus === 'idle' && 'idle'}
        </p>
        <div className="mt-4 rounded-lg bg-brand-muted/40 p-4 text-sm">
          <p className="font-medium text-brand">Biztomate brand</p>
          <p className="mt-1 text-muted">
            Primary <span className="font-mono text-gray-800">#007AFF</span>, secondary{' '}
            <span className="font-mono text-gray-800">#5856D6</span> — aligned with the Biztomate
            Scanner app.
          </p>
        </div>
      </Card>

      <TeamAdminSection />

      <Card>
        <CardTitle>Microsoft 365 — send email</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Connect your work or personal Microsoft account so the app can request permission to send
          email as you (Microsoft Graph). Register this exact SPA redirect URI in Entra:{' '}
          <span className="break-all font-mono text-xs text-gray-800">
            {typeof window !== 'undefined' ? getMicrosoftRedirectUri() : '…'}
          </span>
        </p>
        {isFixedMicrosoftRedirectConfigured() && (
          <p className="mt-2 text-xs text-muted">
            Fixed redirect is enabled: starting login from a Vercel <em>preview</em> URL still sends
            you to your production host to finish sign-in; the Microsoft token is stored for that
            production origin.
          </p>
        )}
        {!isMicrosoftOAuthConfigured() ? (
          <p className="mt-3 text-sm text-amber-800">
            Add <span className="font-mono">VITE_MICROSOFT_CLIENT_ID</span> and{' '}
            <span className="font-mono">VITE_MICROSOFT_TENANT_ID</span> to your environment and
            redeploy (Vercel) or restart the dev server.
          </p>
        ) : msConnected ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-green-800">Microsoft account connected.</p>
            <div className="rounded-lg border border-[var(--color-border)]/80 bg-gray-50/80 p-4">
              <p className="text-sm font-medium text-gray-900">Send a test email</p>
              <p className="mt-1 text-xs text-muted">
                Mail is sent from your Microsoft mailbox via Graph (same place you connect above).
              </p>
              <label className="mt-3 block text-xs font-medium text-gray-700">To</label>
              <Input
                type="email"
                className="mt-1"
                placeholder="you@example.com"
                value={msTestTo}
                onChange={(e) => setMsTestTo(e.target.value)}
                autoComplete="email"
              />
              <label className="mt-3 block text-xs font-medium text-gray-700">Subject</label>
              <Input
                className="mt-1"
                value={msTestSubject}
                onChange={(e) => setMsTestSubject(e.target.value)}
              />
              <label className="mt-3 block text-xs font-medium text-gray-700">HTML body</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                rows={4}
                value={msTestBody}
                onChange={(e) => setMsTestBody(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={msSendState === 'sending' || !msTestTo.trim()}
                  onClick={async () => {
                    setMsSendState('sending');
                    setMsSendError(null);
                    try {
                      await sendMailViaGraph({
                        to: msTestTo.trim(),
                        subject: msTestSubject.trim() || 'Test',
                        html: msTestBody || '<p>(empty)</p>',
                      });
                      setMsSendState('sent');
                    } catch (e) {
                      setMsSendState('error');
                      setMsSendError(e instanceof Error ? e.message : 'Send failed');
                    }
                  }}
                >
                  {msSendState === 'sending' ? 'Sending…' : 'Send test email'}
                </Button>
                {msSendState === 'sent' && (
                  <span className="text-sm text-green-800">Sent. Check the recipient inbox.</span>
                )}
                {msSendState === 'error' && msSendError && (
                  <span className="max-w-xl break-words text-sm text-red-700">{msSendError}</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (confirm('Disconnect Microsoft? You will need to sign in again to send mail.')) {
                  clearMicrosoft();
                }
              }}
            >
              Disconnect Microsoft
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => {
                startMicrosoftLogin().catch((e) =>
                  alert(e instanceof Error ? e.message : 'Could not start sign-in.'),
                );
              }}
            >
              Connect Microsoft account
            </Button>
          </div>
        )}
        {showMicrosoftConnectedToast && (
          <p className="mt-3 text-sm text-green-800" role="status">
            Microsoft sign-in completed. Use &quot;Send a test email&quot; below to verify mail.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Where your data lives</CardTitle>
        <p className="mt-2 text-sm text-muted">
          After sign-in, the full CRM workspace is loaded from{' '}
          <strong className="font-medium text-gray-800">Supabase Postgres</strong> (Leads, Contacts,
          Accounts, Deals, Campaigns, Products, Quotes, Activities, Email templates). Creates and
          edits write back to those tables. Apply SQL under
          <span className="font-mono text-xs"> supabase/migrations</span> (especially
          <span className="font-mono text-xs"> 20260804130000_full_crm_authenticated_access.sql</span>
          ) so authenticated users have RLS access.
        </p>
      </Card>

      <Card>
        <CardTitle>Backup & restore</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Download a JSON backup from the environment where your latest data is (for example
          localhost), then import it on Vercel or another browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => {
              const payload = buildCrmBackupPayload(useCrmStore.getState());
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `biztomate-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download backup (JSON)
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => backupInputRef.current?.click()}
          >
            Import backup…
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const raw = JSON.parse(reader.result as string) as unknown;
                  const backup = tryParseCrmBackup(raw);
                  if (!backup) {
                    alert('That file is not a valid Biztomate CRM backup.');
                    return;
                  }
                  if (
                    !confirm(
                      'Replace all CRM data in this browser with the backup? This cannot be undone.',
                    )
                  ) {
                    return;
                  }
                  importCrmBackup(backup);
                } catch {
                  alert('Could not read that file.');
                }
              };
              reader.readAsText(file);
            }}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Clear CRM data</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Removes persisted CRM records in this browser and restores the initial workspace (empty in
          production, or demo dataset in local dev when demo mode is on). Microsoft connection and
          login session are kept.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          type="button"
          onClick={() => {
            if (
              confirm(
                'Clear all CRM data in this browser and restore the initial workspace? This cannot be undone.',
              )
            ) {
              resetDemoData();
            }
          }}
        >
          Clear CRM data
        </Button>
      </Card>

      <Card>
        <CardTitle>Integrations (roadmap)</CardTitle>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted">
          <li>Email sync (Gmail / Microsoft 365)</li>
          <li>Calendar meetings → activities</li>
          <li>Zapier / webhooks for Biztomate Scanner signups</li>
          <li>Stripe or Play Billing for quote-to-cash</li>
        </ul>
      </Card>
    </div>
  );
}
