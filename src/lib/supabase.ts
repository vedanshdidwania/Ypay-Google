/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const cleanValue = (val: string | undefined) => {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned.trim();
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://ppktptuvpipotvjhsmho.supabase.co";
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa3RwdHV2cGlwb3R2amhzbWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI2ODksImV4cCI6MjA5MDIwODY4OX0.uSY66DcMzISbsqnVL6CWk-Ml70PJRTZZ0AgUU4QhzCw";

const supabaseUrl = cleanValue(rawUrl);
const supabaseAnonKey = cleanValue(rawAnonKey);

// Export a flag to check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Initialize the client only if keys are present, otherwise use a proxy that warns
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    })
  : new Proxy({} as any, {
      get: (_, prop) => {
        if (prop === 'auth') {
          return new Proxy({} as any, {
            get: (_, authProp) => {
              if (authProp === 'onAuthStateChange') {
                return () => ({ data: { subscription: { unsubscribe: () => {} } } });
              }
              if (authProp === 'getSession') {
                return async () => ({ data: { session: null } });
              }
              return () => {
                console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
                return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
              };
            }
          });
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
                order: () => Promise.resolve({ data: [], error: null }),
              }),
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          });
        }
        return () => {
          console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
          return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
        };
      }
    });
