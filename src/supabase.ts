import { createClient } from '@supabase/supabase-js';

// Hardcoded para garantir funcionamento imediato no ambiente de preview
const supabaseUrl = 'https://wmvvbapospxwcsryvruh.supabase.co';
const supabaseAnonKey = 'sb_publishable_tphjRVsR6rMNghrrYurP8A_zRoSImqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
