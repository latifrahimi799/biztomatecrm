import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BackgroundWatermark } from './components/layout/BackgroundWatermark';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { DealsPage } from './pages/DealsPage';
import { DealDetailPage } from './pages/DealDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ProductsPage } from './pages/ProductsPage';
import { QuotesPage } from './pages/QuotesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EmailTemplatesPage } from './pages/EmailTemplatesPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { MicrosoftOAuthCallbackPage } from './pages/MicrosoftOAuthCallbackPage';
import { SupabaseCrmSync } from './components/SupabaseCrmSync';

function Protected({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const email = useAuthStore((s) => s.userEmail);
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }
  if (!email) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <BackgroundWatermark />
      <SupabaseCrmSync />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/microsoft/callback" element={<MicrosoftOAuthCallbackPage />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:id" element={<DealDetailPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/templates" element={<EmailTemplatesPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/quotes" element={<QuotesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}
