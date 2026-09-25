export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

/** Local-only demo mode: no Supabase configured while developing. */
export const isDemo = !hasSupabase && process.env.NODE_ENV === "development";
