import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;

    const confirmation = prompt(`Это действие необратимо и удалит все ваши данные.\n\nДля подтверждения введите ваш e-mail: ${user.email}`);
    
    if (confirmation !== user.email) {
      alert("Ввод не совпадает. Удаление отменено.");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      
      alert('Ваш аккаунт и все данные были успешно удалены.');
      await signOut();
      navigate('/login', { replace: true });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(`Не удалось удалить аккаунт: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto" style={{background:'#0a0a0b'}}>
      <h1 className="text-3xl font-bold">Профиль</h1>
      <div className="p-4 glass card-dark rounded-lg shadow">
        {user && <p>Вы вошли как: <span className="font-semibold">{user.email}</span></p>}
      </div>
      <div className="space-y-2">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 font-semibold text-white bg-zinc-500 rounded-md hover:bg-zinc-600 transition-colors"
        >
          Выйти
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Удаление...' : 'Удалить аккаунт и все данные'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;