// ── Supabase client ──────────────────────────────────────────
// Replace these two values with your own from Supabase → Settings → API Keys
const SUPABASE_URL  = 'https://onkroztixbwtfywdrewp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ua3JvenRpeGJ3dGZ5d2RyZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDI4MTEsImV4cCI6MjA5MjM3ODgxMX0.cqhZCVYgdMwzUrZmV_RezmizVaIwNWheZzjDUOn6C7M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
