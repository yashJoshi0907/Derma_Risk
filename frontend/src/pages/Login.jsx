import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldCheck, Lock, User, Mail, AlertCircle } from 'lucide-react';

export function Login() {
  const { user, login, loginWithGoogle, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          (isLogin ? 'Failed to authenticate. Check credentials.' : 'Registration failed.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Google sign-in failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side Form */}
      <div className="flex bg-white items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-trustBlue-900 text-white rounded-xl flex items-center justify-center font-extrabold text-xl shadow-lg mb-4">
              D
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 border-b-2 border-trustBlue-100 inline-block pb-1">
              {isLogin ? 'Clinician Portal' : 'Register Provider'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isLogin
                ? 'Secure access for verified medical professionals.'
                : 'Create your clinician account.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-softRed-50 text-softRed-500 text-sm flex items-start gap-2 border border-softRed-100">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="flex flex-col items-center gap-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              text={isLogin ? 'signin_with' : 'signup_with'}
              shape="rectangular"
              logo_alignment="left"
              width="320"
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                or continue with credentials
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <div className="relative">
                <Input
                  required
                  type="text"
                  placeholder="e.g. jdoe_md"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-9"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Institutional Email</label>
                <div className="relative">
                  <Input
                    required
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Credentials Keyword (Password)</label>
              <div className="relative">
                <Input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-6 h-11 text-base">
              {isLoading
                ? 'Processing...'
                : isLogin
                ? 'Sign In Securely'
                : 'Complete Registration'}
            </Button>
          </form>

          <div className="text-center text-sm pt-4 border-t border-slate-100 mt-8">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setFormData({ username: '', email: '', password: '' });
              }}
              className="text-trustBlue-600 hover:text-trustBlue-800 font-medium"
            >
              {isLogin ? 'Register a new clinician account ->' : '<- Back to Secure Login'}
            </button>
          </div>
        </div>
      </div>

      {/* Right side Image / Medical graphic */}
      <div className="hidden lg:flex bg-trustBlue-900 relative overflow-hidden flex-col items-center justify-center p-12 text-white text-center">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-trustBlue-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animation-blob"></div>
        <div className="absolute top-20 right-20 w-60 h-60 bg-trustBlue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animation-blob animation-delay-2000"></div>

        <ShieldCheck className="w-24 h-24 mb-6 text-trustBlue-300 relative z-10" />
        <h2 className="text-4xl font-extrabold tracking-tight relative z-10">Data Integrity &amp; Privacy</h2>
        <p className="mt-4 text-lg text-trustBlue-200 max-w-md relative z-10">
          DermaRisk employs state-of-the-art encryption combined with explainable AI to ensure that
          clinical insights are both actionable and transparent.
        </p>
      </div>
    </div>
  );
}
