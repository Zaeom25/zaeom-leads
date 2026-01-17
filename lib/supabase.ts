/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.DEV) {
        console.warn('⚠️ Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env.local');
    }
}

// Função para limpar chaves de qualquer caractere invisível ou quebra de linha
const scrub = (val: string | undefined) => (val || '').replace(/\s/g, '');

const scrubbedUrl = scrub(supabaseUrl);
const scrubbedKey = scrub(supabaseAnonKey);

if (import.meta.env.DEV) {
    console.log('📡 Supabase Init:', {
        url: scrubbedUrl,
        keyTail: scrubbedKey.slice(-5)
    });
}

export const supabase = createClient(
    scrubbedUrl || 'https://missing-url.supabase.co',
    scrubbedKey || 'missing-key'
);
