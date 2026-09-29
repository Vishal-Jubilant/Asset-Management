import React, { useState, useContext, Suspense } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { AppContext } from '../context/AppContext';
import { Menu } from 'lucide-react';

const MainLayout = ({ role }) => {
  const { currentUser, isInitializing } = useContext(AppContext);
  const user = currentUser;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.includes('/admin');

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {isAdminRoute ? (
          <div className="lg:hidden flex items-center sticky top-0 z-10 bg-slate-100 h-16 px-4">
            <button 
              className="p-2 text-slate-500 hover:text-slate-700"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        ) : (
          <div className="flex items-center sticky top-0 z-10">
            <button 
              className="lg:hidden p-4 text-slate-500 hover:text-slate-700"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex-1">
              <TopNavbar user={user} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="w-full">
            <Suspense fallback={
              <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                <p className="text-slate-500 text-sm font-medium animate-pulse">Loading...</p>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
