/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly VITE_ENABLE_BLOG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
