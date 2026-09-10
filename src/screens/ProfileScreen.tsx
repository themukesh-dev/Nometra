import { LogOut, Shield, Bell, HelpCircle, ChevronRight } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

export default function ProfileScreen() {
  const { logout } = useApp();

  const MENU_ITEMS = [
    { icon: Bell, label: 'Notifications', sub: 'Inspection alerts and updates' },
    { icon: Shield, label: 'Security', sub: 'Password, session management' },
    { icon: HelpCircle, label: 'Help & Support', sub: 'Guidelines, contact support' },
  ];

  return (
    <MobileShell title="Profile">
      <div className="px-4 pb-6 pt-4">
        {/* Profile card */}
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-xl">RK</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 text-lg">Rajesh Kumar</h3>
            <p className="text-sm text-slate-500">Legal Metrology Officer</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">ID: LM-OFF-0042</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'This month', value: '18' },
            { label: 'Compliant', value: '14' },
            { label: 'Violations', value: '4' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl py-3 text-center">
              <p className="font-display font-bold text-xl text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Jurisdiction */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Jurisdiction</p>
          <p className="font-medium text-slate-900 text-sm">District Gautam Buddh Nagar, Uttar Pradesh</p>
          <p className="text-xs text-slate-400 mt-0.5">Authorized under Legal Metrology Act, 2009</p>
        </div>

        {/* Menu */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${
                  i < MENU_ITEMS.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <Icon size={18} className="text-slate-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </button>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="w-full h-12 border border-red-200 bg-red-50 text-red-700 font-display font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>

        <p className="text-center text-[10px] text-slate-300 mt-4 font-mono">
          Nometra v2026.1 · Ministry of Consumer Affairs
        </p>
      </div>
    </MobileShell>
  );
}
