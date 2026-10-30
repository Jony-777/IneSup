declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_SECRET_KEY?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    INE_API_SECTIONS_URL?: string;
    INE_API_KEY?: string;
  }
}
