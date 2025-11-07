import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

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
    <div className="p-4 space-y-4 max-w-lg mx-auto pt-safe relative" style={{background:'#0a0a0b'}}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Профиль</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Меню"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-1 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 menu-popover">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleDeleteAccount();
                }}
                disabled={isDeleting}
                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isDeleting ? 'Удаление...' : 'Удалить аккаунт и все данные'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 glass card-dark rounded-lg shadow">
        {user && <p>Вы вошли как: <span className="font-semibold">{user.email}</span></p>}
      </div>
      <div className="space-y-2">
        <button
          onClick={() => navigate('/progress')}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-primary"
        >
          Узнать прогресс
        </button>
        
        <button
          onClick={handleLogout}
          className="btn-glass btn-glass-logout btn-glass-full btn-glass-md"
        >
          Выйти
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;