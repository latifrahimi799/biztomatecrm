/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Entra “Application (client) ID” */
  readonly VITE_MICROSOFT_CLIENT_ID?: string;
  /** Entra directory (tenant) ID, or `common` / `organizations` */
  readonly VITE_MICROSOFT_TENANT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
