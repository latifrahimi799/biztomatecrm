/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Entra “Application (client) ID” */
  readonly VITE_MICROSOFT_CLIENT_ID?: string;
  /** Entra directory (tenant) ID, or `common` / `organizations` */
  readonly VITE_MICROSOFT_TENANT_ID?: string;
  /** Set `true` to load Northwind-style demo data (overrides dev default). Set `false` to force empty CRM in dev. */
  readonly VITE_DEMO_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
