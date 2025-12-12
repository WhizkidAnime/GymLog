import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfileSettings } from '../hooks/use-profile-settings';

const LoginPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { theme, handleThemeChange } = useProfileSettings();
  const [isSignUp, setIsSignUp] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nicknameRef = React.useRef<HTMLInputElement | null>(null);
  const passwordRef = React.useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (session) {
      navigate('/calendar', { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    const clearFields = () => {
      setNickname('');
      setPassword('');
      setConfirmPassword('');

      if (nicknameRef.current) nicknameRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = '';
    };

    clearFields();
    const id = window.setTimeout(clearFields, 100);
    return () => window.clearTimeout(id);
  }, []);

  const mapSupabaseError = (err: any): string => {
    if (!err || !err.message || typeof err.message !== 'string') {
      return 'Произошла ошибка. Попробуйте ещё раз.';
    }

    const msg = err.message.toLowerCase();

    if (msg.includes('invalid login credentials')) {
      return 'Неверный никнейм или пароль';
    }

    if (msg.includes('user already registered')) {
      return 'Пользователь с таким никнеймом уже существует';
    }

    return err.message;
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError('Введите никнейм');
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        setError('Пароль должен быть не короче 6 символов');
        return;
      }

      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    }

    setLoading(true);

    const identifier = trimmedNickname;
    const email = identifier.includes('@') ? identifier : `${identifier}@gymlog.app`;

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: identifier,
            },
          },
        });
        if (error) throw error;

        if (!data?.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }

        setMessage('Регистрация успешна! Вы вошли в аккаунт.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    const redirectTo = `${window.location.origin}/GymLog/`; // корректная обратная ссылка для GitHub Pages
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Supabase handles the redirect
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4">
      <div
        className="fixed z-10"
        style={{ top: 'calc(16px + var(--sat))', right: 'calc(16px + var(--sar))' }}
      >
        <div className="glass rounded-lg p-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange('auto')}
            className={`btn-glass btn-glass-sm ${theme === 'auto' ? 'btn-glass-primary' : 'btn-glass-secondary'}`}
          >
            Авто
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`btn-glass btn-glass-sm ${theme === 'dark' ? 'btn-glass-primary' : 'btn-glass-secondary'}`}
          >
            Тёмная
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`btn-glass btn-glass-sm ${theme === 'light' ? 'btn-glass-primary' : 'btn-glass-secondary'}`}
          >
            Светлая
          </button>
        </div>
      </div>
      <div className="w-full max-w-sm p-8 space-y-4 glass card-dark rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-white">GymLog</h1>
        <p className="text-center text-gray-400">
          {isSignUp ? 'Создайте аккаунт' : 'Войдите в свой аккаунт'}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="nickname" className="sr-only">Никнейм</label>
            <input
              id="nickname"
              type="text"
              placeholder={isSignUp ? "Логин" : "Ваш логин"}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              name="nickname"
              autoComplete="off"
              className="w-full px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ref={nicknameRef}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              name={isSignUp ? 'new-password' : 'current-password'}
              autoComplete={isSignUp ? 'new-password' : 'off'}
              className="w-full px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ref={passwordRef}
            />
          </div>
          {isSignUp && (
            <div>
              <label htmlFor="confirm-password" className="sr-only">Повторите пароль</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                name="confirm-password"
                autoComplete="off"
                className="w-full px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ref={confirmPasswordRef}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-glass btn-glass-md btn-glass-primary btn-glass-full"
          >
            {loading ? 'Загрузка...' : (isSignUp ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        {message && <p className="text-center text-sm text-green-400">{message}</p>}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <p className="text-sm text-center text-gray-400">
          {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="ml-1 font-semibold text-blue-400 hover:underline"
          >
            {isSignUp ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>

        <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-500">ИЛИ</span>
            <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn-glass btn-glass-md btn-glass-secondary btn-glass-full flex items-center justify-center"
        >
            <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c73 0 135.5 28.2 182.3 74.3l-64.3 62.1C337 113.4 294.3 96 244 96c-85.6 0-154.5 68.9-154.5 160s68.9 160 154.5 160c97.9 0 135-71.2 138.6-106.2H244v-75.3h236.1c2.4 12.6 3.9 26.2 3.9 41z"></path>
            </svg>
            Войти через Google
        </button>

      </div>
    </div>
  );
};

export default LoginPage;