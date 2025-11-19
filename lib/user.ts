import { supabase } from './supabase';

export async function deleteUserAccount() {
  const db = supabase as any;
  const { error } = await db.rpc('delete_user_account');
  if (error) {
    throw error;
  }
}
