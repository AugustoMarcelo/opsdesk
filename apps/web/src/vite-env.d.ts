/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_AUTH_MODE: string;
  readonly VITE_OIDC_ISSUER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
