import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History } from 'lucide-react';
import { cn } from '../utils/cn';

export function Sidebar() {
  const links = [
    { name: 'Overview', to: '/dashboard', end: true, icon: LayoutDashboard },
    { name: 'New Case', to: '/dashboard/new', icon: PlusCircle },
    { name: 'History', to: '/dashboard/history', icon: History },
  ];

  return (
    <aside className="w-64 bg-trustBlue-900 min-h-screen hidden md:flex flex-col text-white">
      <div className="h-16 flex items-center px-6 border-b border-trustBlue-800">
        <div className="font-bold text-xl tracking-wide flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-trustBlue-900 font-extrabold">
            D
          </div>
          DermaRisk
        </div>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors',
                isActive
                  ? 'bg-trustBlue-800 text-white'
                  : 'text-trustBlue-100 hover:bg-trustBlue-800/50 hover:text-white'
              )
            }
          >
            <link.icon className="h-5 w-5" />
            {link.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-trustBlue-800">
        <p className="text-xs text-trustBlue-300 text-center">
          DermaRisk Clinical System v1.0
        </p>
      </div>
    </aside>
  );
}
