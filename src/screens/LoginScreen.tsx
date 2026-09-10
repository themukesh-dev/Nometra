import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { login } = useApp();
  const [inspectorId, setInspectorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { login(); setLoading(false); }, 800);
  };

  const handleDemo = () => {
    setLoading(true);
    setTimeout(() => { login(); setLoading(false); }, 600);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto px-6">
      {/* Top branding */}
      <div className="flex-1 flex flex-col justify-center pt-16 pb-8">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <span className="text-white text-2xl font-display font-bold">N</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-slate-900 tracking-tight">Nometra</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">Legal Metrology Inspection Assistant</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Inspector ID
            </label>
            <input
              type="text"
              value={inspectorId}
              onChange={e => setInspectorId(e.target.value)}
              placeholder="LM-OFF-0042"
              className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 pr-12 rounded-lg border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 bg-blue-700 text-white font-display font-semibold text-base rounded-lg hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-slate-400">or</span>
          </div>
        </div>

        <button
          onClick={handleDemo}
          disabled={loading}
          className="h-12 border border-blue-700 text-blue-700 font-display font-semibold text-base rounded-lg hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          Use Demo Account
        </button>
      </div>

      {/* Footer */}
      <div className="pb-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Shield size={12} />
          <span className="text-xs">Authorized inspection personnel only</span>
        </div>
        <span className="text-[10px] text-slate-300 font-mono">v2026.1 · Ministry of Consumer Affairs</span>
      </div>
    </div>
  );
}
