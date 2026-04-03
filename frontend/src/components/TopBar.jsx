import { useAuth } from '../context/AuthContext';
import { UserCircle, LogOut } from 'lucide-react';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-10 sticky top-0">
      <div className="font-semibold text-slate-800 md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-trustBlue-900 text-white flex items-center justify-center font-extrabold text-sm">
          D
        </div>
        DermaRisk
      </div>
      
      <div className="flex-1"></div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 border-r border-slate-200 pr-4">
          <UserCircle className="h-6 w-6 text-slate-400" />
          <span className="font-medium">Dr. {user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 hover:text-trustBlue-900 flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </header>
  );
}
