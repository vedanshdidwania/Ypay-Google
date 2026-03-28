/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Force correct Supabase configuration for the current project
const supabaseUrl = "https://ppktptuvpipotvjhsmho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa3RwdHV2cGlwb3R2amhzbWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI2ODksImV4cCI6MjA5MDIwODY4OX0.uSY66DcMzISbsqnVL6CWk-Ml70PJRTZZ0AgUU4QhzCw";

// Export a flag to check if Supabase is configured
export const isSupabaseConfigured = true;

// Initialize the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
