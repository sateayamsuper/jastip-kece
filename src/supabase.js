import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function loadCloudState(userId) {
  const { data, error } = await supabase
    .from('user_app_state')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCloudState(userId, data) {
  const { error } = await supabase.from('user_app_state').upsert({
    user_id: userId,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
