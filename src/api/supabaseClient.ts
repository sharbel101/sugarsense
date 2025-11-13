import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://efajvcljtxlmrqfanepd.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmYWp2Y2xqdHhsbXJxZmFuZXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NzY0NjksImV4cCI6MjA3NjA1MjQ2OX0.cSRrc0QA0r_9paG9TO1NC8odArAQo_MjotblPrewgtI';

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing. Add it to your `.env` so the Supabase client can authenticate.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
