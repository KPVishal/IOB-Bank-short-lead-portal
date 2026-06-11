import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState('CREDENTIALS');
  const [changeToken, setChangeToken] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  const handleStepResponse = (res) => {
    if (res.step === 'CHANGE_PASSWORD') {
      setChangeToken(res.changeToken);
      setStep('CHANGE_PASSWORD');
      setNewPw('');
      setConfirmPw('');
      setInfo('First-time login: please set a new password to continue.');
    } else if (res.step === 'DONE') {
      login(res.token, res.user);
      navigate(redirectTo, { replace: true });
    }
  };

  const submitCredentials = async (e) => {
    e.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      handleStepResponse(await authApi.login(email.trim(), password));
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const submitChangePassword = async (e) => {
    e.preventDefault();
    setErr('');
    if (newPw.length < 8) { setErr('Password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      handleStepResponse(await authApi.changePassword(changeToken, newPw, confirmPw));
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not change password');
    } finally { setBusy(false); }
  };

  const goBackToCredentials = () => {
    setStep('CREDENTIALS');
    setChangeToken(null);
    setNewPw(''); setConfirmPw('');
    setErr(''); setInfo('');
  };

  const titleMap = {
    CREDENTIALS: 'Welcome back',
    CHANGE_PASSWORD: 'Set a new password',
  };
  const subtitleMap = {
    CREDENTIALS: 'Sign in to continue',
    CHANGE_PASSWORD: 'Required on first login',
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-bp-purple to-bp-deep text-white p-12 flex-col justify-between">
        <div>
          <div className="text-3xl font-bold mb-2">bijlipay</div>
          <div className="text-bp-lavender">IOB Bank Portal</div>
        </div>
        <div>
          <div className="text-iob-blue bg-white inline-block px-3 py-1 rounded font-bold tracking-wide">IOB</div>
          <p className="mt-4 text-sm text-white/80 max-w-sm">
            Indian Overseas Bank — Merchant onboarding & lifecycle management portal.
          </p>
        </div>
        <div className="text-xs text-white/60">Powered by bijlipay © 2026</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img
              src="/iob-logo-login.png"
              alt="Indian Overseas Bank"
              className="h-20 w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-bp-purple mb-1">{titleMap[step]}</h1>
          <p className="text-sm text-gray-500 mb-8">{subtitleMap[step]}</p>

          {info && <div className="mb-4 px-4 py-2 bg-bp-pink border border-bp-lavender text-bp-purple text-sm rounded">{info}</div>}
          {err && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

          {step === 'CREDENTIALS' && (
            <form onSubmit={submitCredentials} className="space-y-4">
              <Field label="Email">
                <input type="email" required autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
                  placeholder="you@example.com" />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </Field>
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-bp-purple text-white rounded font-semibold tracking-action uppercase hover:bg-bp-deep disabled:opacity-60">
                {busy ? 'Signing in…' : 'Log in'}
              </button>
            </form>
          )}

          {step === 'CHANGE_PASSWORD' && (
            <form onSubmit={submitChangePassword} className="space-y-4">
              <Field label="New password">
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} required minLength={8} value={newPw} autoFocus
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple"
                    placeholder="At least 8 characters" />
                  <button type="button" tabIndex={-1} onClick={() => setShowNewPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? '🙈' : '👁'}
                  </button>
                </div>
              </Field>
              <Field label="Confirm new password">
                <input type={showNewPw ? 'text' : 'password'} required value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple" />
              </Field>
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-bp-purple text-white rounded font-semibold tracking-action uppercase hover:bg-bp-deep disabled:opacity-60">
                {busy ? 'Saving…' : 'Update Password & Continue'}
              </button>
              <button type="button" onClick={goBackToCredentials}
                className="w-full text-sm text-gray-500 hover:text-bp-purple">← Back to login</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-action text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
