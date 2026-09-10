import { type ReactNode } from 'react';
import { Home, ClipboardList, Package, FileText, User, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';

interface NavItem {
  label: string;
  icon: typeof Home;
  screen: Screen;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home, screen: 'dashboard' },
  { label: 'Inspections', icon: ClipboardList, screen: 'inspections' },
  { label: 'Products', icon: Package, screen: 'product-history' },
  { label: 'Reports', icon: FileText, screen: 'report' },
  { label: 'Profile', icon: User, screen: 'profile' },
];

interface ShellProps {
  children: ReactNode;
  title?: string;
  backScreen?: Screen;
  rightAction?: ReactNode;
  hideNav?: boolean;
}

export default function MobileShell({ children, title, backScreen, rightAction, hideNav }: ShellProps) {
  const { navigate, screen, startNewInspection } = useApp();

  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 pt-safe-top sticky top-0 z-20">
        <div className="flex items-center h-14">
          {backScreen ? (
            <button
              onClick={() => navigate(backScreen)}
              className="mr-2 p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 mr-3">
              <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center">
                <span className="text-white text-[10px] font-display font-bold">N</span>
              </div>
              <span className="font-display font-bold text-blue-700 text-sm tracking-tight">NOMETRA</span>
            </div>
          )}
          {title && (
            <h1 className="font-display font-semibold text-slate-900 text-base flex-1 truncate">
              {title}
            </h1>
          )}
          <div className="ml-auto flex items-center gap-2">
            {rightAction}
            {!backScreen && (
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
                <span className="text-white text-xs font-display font-bold">RK</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      {!hideNav && (
        <nav className="bg-white border-t border-slate-200 safe-bottom z-20">
          <div className="flex items-center">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = screen === item.screen;
              if (item.screen === 'product-history') {
                return (
                  <div key={item.screen} className="flex-1 flex justify-center py-2">
                    <button
                      onClick={() => startNewInspection()}
                      className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center shadow-lg -mt-5"
                      aria-label="New Inspection"
                    >
                      <Plus size={22} className="text-white" />
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={item.screen}
                  onClick={() => navigate(item.screen)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors"
                  aria-label={item.label}
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-blue-700' : 'text-slate-400'}
                  />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
