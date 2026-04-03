import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Failed to verify token:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    // FastAPI requires form data for OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    localStorage.setItem('token', res.data.access_token);

    // Fetch full profile
    const profileRes = await api.get('/auth/me');
    setUser(profileRes.data);
  };

  const loginWithGoogle = async (credential) => {
    // credential is the Google ID token (JWT) returned by GoogleOAuth
    const res = await api.post('/auth/google', { credential });

    const accessToken = res.data.access_token;
    localStorage.setItem('token', accessToken);

    // Fetch full profile from /auth/me using explicit header to avoid any
    // race condition with the localStorage-based interceptor.
    const profileRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setUser(profileRes.data);
  };

  const register = async (username, email, password) => {
    await api.post('/auth/register', {
      username,
      email,
      password,
    });
    // Auto login after register
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
