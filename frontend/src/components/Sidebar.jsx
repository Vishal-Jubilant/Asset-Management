import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { 
  LayoutDashboard, FilePlus, List, LogOut, Package, 
  Clock, CheckCircle, RotateCcw, XCircle, FileText, 
  Bell, Settings, ChevronLeft, ChevronRight, Users 
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useContext(AppContext);
  const user = currentUser;

  const mainLinks = [
    { name: 'Dashboard', path: '/app', icon: <LayoutDashboard size={20} /> },
    { name: 'New Request', path: '/app/new-request', icon: <FilePlus size={20} /> },
    { name: 'My Requests', path: '/app/my-requests', icon: <List size={20} /> }
  ];

  if (user?.role?.toLowerCase() === 'admin') {
    mainLinks.push({ name: 'Users', path: '/app/admin', icon: <Users size={20} /> });
    mainLinks.push({ name: 'Settings', path: '/app/settings', icon: <Settings size={20} /> });
  }
  
  const sidebarClasses = `
    bg-white text-slate-500 flex flex-col h-screen fixed top-0 left-0 z-30 transition-all duration-300
    ${isCollapsed ? 'w-20' : 'w-64'}
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  return (
    <div className={sidebarClasses}>
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-6 pt-4">
        <div className="flex items-center overflow-hidden">
          <Package className="text-brand-800 flex-shrink-0" size={32} />
          {!isCollapsed && (
            <div className="ml-3 flex flex-col whitespace-nowrap">
              <span className="text-slate-900 font-extrabold text-xl leading-tight tracking-wide">Donezo</span>
            </div>
          )}
        </div>
        
        {/* Desktop Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      {/* Scrollable Navigation Area */}
      <div className="flex-1 py-8 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 flex flex-col">
        
        {/* Navigation List */}
        <div className="space-y-2 px-3">
          {!isCollapsed && (
            <div className="px-3 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              MENU
            </div>
          )}
          {mainLinks.map((link) => (
            link.path === '#' ? (
              <button
                key={link.name}
                className="w-full flex items-center px-4 py-3 rounded-lg transition-all group font-semibold hover:bg-slate-50 hover:text-slate-800 text-slate-500"
                title={isCollapsed ? link.name : undefined}
              >
                <span className="flex-shrink-0">{link.icon}</span>
                {!isCollapsed && <span className="ml-4 whitespace-nowrap">{link.name}</span>}
              </button>
            ) : (
              <NavLink
                key={link.name}
                to={link.path}
                end
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-all group font-semibold ${
                    isActive
                      ? 'text-brand-800 bg-brand-50/50'
                      : 'hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
                title={isCollapsed ? link.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 w-1.5 h-8 bg-brand-800 rounded-r-full" />}
                    <span className="flex-shrink-0">{link.icon}</span>
                    {!isCollapsed && <span className="ml-4 whitespace-nowrap">{link.name}</span>}

                  </>
                )}
              </NavLink>
            )
          ))}
        </div>
      </div>

      {/* Fixed Bottom Logout */}
      <div className="p-4 border-t border-slate-100">
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'px-4 py-3'} bg-slate-50/50 rounded-xl border border-slate-100/60 mb-3`}>
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden ml-3">
              <span className="text-sm font-bold text-slate-800 leading-tight truncate">{user?.name || 'User'}</span>
              <span className="text-[10px] text-slate-500 leading-tight font-semibold mt-0.5 truncate uppercase tracking-wider">{user?.role || 'Role'}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsMobileOpen(false);
            if (setCurrentUser) setCurrentUser(null);
            navigate('/');
          }}
          className="w-full flex items-center px-4 py-3 rounded-lg transition-all group font-semibold text-red-600 hover:bg-red-50"
          title={isCollapsed ? 'Logout' : undefined}
        >
          <span className="flex-shrink-0"><LogOut size={20} /></span>
          {!isCollapsed && <span className="ml-4 whitespace-nowrap">Logout</span>}
        </button>
      </div>

    </div>
  );
};

export default Sidebar;
