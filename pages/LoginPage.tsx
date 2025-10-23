import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      navigate('/calendar', { replace: true });
    }
  }, [session, navigate]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const email = nickname.includes('@') ? nickname : `${nickname}@gymlog.app`;

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Регистрация успешна! Теперь вы можете войти.');
        setIsSignUp(false); 
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Supabase handles the redirect
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{background:'#0a0a0b'}}>
      <div className="w-full max-w-sm p-8 space-y-4 glass card-dark rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center" style={{color:'#e4e4e7'}}>GymLog</h1>
        <p className="text-center" style={{color:'#a1a1aa'}}>
          {isSignUp ? 'Создайте аккаунт' : 'Войдите в свой аккаунт'}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="sr-only">Никнейм</label>
            <input
              id="nickname"
              type="text"
              placeholder={isSignUp ? "Придумайте никнейм" : "Ваш никнейм"}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{backgroundColor:'#18181b', color:'#0a0a0a', border:'1px solid #3f3f46'}}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{backgroundColor:'#18181b', color:'#0a0a0a', border:'1px solid #3f3f46'}}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Загрузка...' : (isSignUp ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        {message && <p className="text-center text-sm text-green-600">{message}</p>}
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <p className="text-sm text-center text-gray-600">
          {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setError('');
            }}
            className="ml-1 font-semibold text-blue-600 hover:underline"
          >
            {isSignUp ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>

        <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-500">ИЛИ</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
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