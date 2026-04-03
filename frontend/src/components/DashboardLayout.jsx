import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Chatbot } from './Chatbot';

export function DashboardLayout() {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-10">
        <TopBar />
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
