import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="text-right text-xs text-gray-500 px-6 py-3 bg-white border-t">
        © 2026 All Rights Reserved · Bijlipay
      </footer>
    </div>
  );
}
