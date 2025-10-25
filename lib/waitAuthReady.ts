import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const waitAuthReady = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }

  return new Promise((resolve) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      subscription.unsubscribe();
      resolve(session ?? null);
    });
  });
};
