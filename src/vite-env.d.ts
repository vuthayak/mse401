/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Base URL of the recommender API, e.g. https://<service>.onrender.com */
  readonly VITE_RECOMMENDER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
