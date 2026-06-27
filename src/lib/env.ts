type EnvItem = {
  name: string;
  required: boolean;
  public: boolean;
  configured: boolean;
};

const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL"
] as const;

const requiredServerEnv = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET_PUBLIC",
  "SUPABASE_STORAGE_BUCKET_PRIVATE"
] as const;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) throw new Error(`${name} is required for this deployment path.`);
  return value;
}

export function getPublicSupabaseConfig() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function isSupabaseConfigured() {
  return Boolean(readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getStorageBuckets() {
  return {
    publicBucket: requireEnv("SUPABASE_STORAGE_BUCKET_PUBLIC"),
    privateBucket: requireEnv("SUPABASE_STORAGE_BUCKET_PRIVATE")
  };
}

export function getAppUrl() {
  const explicit = readEnv("NEXT_PUBLIC_APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const productionUrl = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionUrl) return `https://${productionUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const previewUrl = readEnv("VERCEL_URL");
  if (previewUrl) return `https://${previewUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://127.0.0.1:3000";
}

export function getAuthRedirectPath() {
  return readEnv("SUPABASE_AUTH_REDIRECT_PATH") || "/auth/callback";
}

export function getDeploymentReadiness() {
  const items: EnvItem[] = [
    ...requiredPublicEnv.map((name) => ({
      name,
      required: true,
      public: true,
      configured: Boolean(readEnv(name))
    })),
    ...requiredServerEnv.map((name) => ({
      name,
      required: true,
      public: false,
      configured: Boolean(readEnv(name))
    })),
    {
      name: "GOOGLE_CLIENT_ID",
      required: false,
      public: false,
      configured: Boolean(readEnv("GOOGLE_CLIENT_ID"))
    },
    {
      name: "GOOGLE_CLIENT_SECRET",
      required: false,
      public: false,
      configured: Boolean(readEnv("GOOGLE_CLIENT_SECRET"))
    }
  ];

  return {
    items,
    appUrl: getAppUrl(),
    supabaseConfigured: isSupabaseConfigured(),
    requiredConfigured: items.filter((item) => item.required).every((item) => item.configured)
  };
}
