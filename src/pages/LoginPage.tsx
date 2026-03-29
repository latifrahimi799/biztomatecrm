import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const sessionEmail = useAuthStore((s) => s.userEmail);
  const login = useAuthStore((s) => s.login);
  if (sessionEmail) {
    return <Navigate to="/dashboard" replace />;
  }
  const [email, setEmail] = useState('alex@biztomate.com');
  const [name, setName] = useState('Alex Morgan');
  const [password, setPassword] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email.trim() || 'user@biztomate.com', name.trim() || 'Team member');
    navigate('/dashboard', { replace: true });
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
            <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Work email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Demo — any value"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
          <p className="text-center text-xs text-muted">
            Demo build: data stays in this browser (local storage). Connect a backend when you are
            ready.
          </p>
        </form>
      </Card>
    </div>
  );
}
