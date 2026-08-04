import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const sessionEmail = useAuthStore((s) => s.userEmail);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-muted/95 via-white/95 to-violet-50/60 p-4">
        <p className="text-sm text-muted">Checking session…</p>
      </div>
    );
  }

  if (sessionEmail) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const message = await login(email, password);
      if (message) {
        setError(message);
        return;
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-muted/95 via-white/95 to-violet-50/60 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            B
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Biztomate CRM</h1>
            <p className="text-sm text-muted">Sign in to your workspace</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </div>
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          {!isSupabaseConfigured ? (
            <p className="text-sm text-error" role="alert">
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting || !isSupabaseConfigured}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-xs text-muted">
            Use the email and password created in Supabase Auth.
          </p>
        </form>
      </Card>
    </div>
  );
}
