import React, { useContext, Suspense, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { AppContext } from '../context/AppContext';

const MainLayout = () => {
  const { currentUser, isInitializing } = useContext(AppContext);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const sidebarWidth = isCollapsed && !isHovered ? 80 : 320;
  const isDashboard = location.pathname === '/app';

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-brand-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 w-full relative">
      <div
        className="hidden md:block flex-shrink-0 transition-[width] duration-300 ease-in-out"
        style={{ width: `${sidebarWidth}px` }}
        aria-hidden="true" 
      />
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isHovered={isHovered}
        setIsHovered={setIsHovered}
      />
      
      <div className={`flex-1 flex flex-col min-w-0 ${isDashboard ? '' : 'transition-all duration-300 ease-in-out'}`}>
        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:px-10 lg:py-5 overflow-y-auto">
          <div className="w-full">
            <Suspense fallback={
              <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-brand-600"></div>
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
