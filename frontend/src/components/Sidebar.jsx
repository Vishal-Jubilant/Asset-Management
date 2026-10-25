import React, { createContext, useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { LayoutDashboard, FilePlus, List, LogOut, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SidebarContext = createContext(null);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a Sidebar provider');
  }
  return context;
};

const SidebarBody = ({ children, className = '', ...props }) => {
  const { open } = useSidebar();

  return (
    <aside
      {...props}
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out',
        className
      )}
      style={{ width: open ? '320px' : '80px' }}
    >
      {children}
    </aside>
  );
};

const SidebarLink = ({ link, onClick, className = '' }) => {
  const { open } = useSidebar();
  const content = (
    <>
      <span className="flex h-10 w-20 flex-shrink-0 items-center justify-center">{link.icon}</span>
      <span className={cn('truncate whitespace-nowrap transition-opacity', open ? 'opacity-100' : 'opacity-0')}>{link.label}</span>
    </>
  );

  if (onClick || !link.path) {
    return <button type="button" onClick={onClick} className={cn('flex h-12 w-full items-center text-left', className)}>{content}</button>;
  }

  return (
    <NavLink
      to={link.path}
      end={link.path === '/app'}
      className={({ isActive }) => cn(
        'flex h-12 w-full items-center',
        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
        className
      )}
    >
      {content}
    </NavLink>
  );
};

const SidebarContent = ({ isCollapsed, setIsCollapsed, isHovered, setIsHovered, handleMouseEnter, handleMouseLeave }) => {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useContext(AppContext);
  const user = currentUser;

  const links = [
    { label: 'Dashboard', path: '/app', icon: <LayoutDashboard size={21} /> },
    { label: 'New Request', path: '/app/new-request', icon: <FilePlus size={21} /> },
    { label: 'My Requests', path: '/app/my-requests', icon: <List size={21} /> },
  ];

  if (user?.role?.toLowerCase() === 'admin') {
    links.push({ label: 'Users', path: '/app/admin', icon: <Users size={21} /> });
    links.push({ label: 'Settings', path: '/app/settings', icon: <Settings size={21} /> });
  }

  return (
    <SidebarBody
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with Fixed 80px Logo Anchor & Toggle Button */}
      <div className="pt-5 pb-3 flex items-center justify-between w-full relative min-h-[76px]">
        <div className="flex items-center min-w-0">
          {/* Permanent 80px Logo Slot - never shifts, rock-solid 40px center */}
          <div className="w-20 flex-shrink-0 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsHovered(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:bg-slate-100 hover:scale-105"
              title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
            >
              <img src="/logo.png" alt="Ardent Capital Logo" width="36" height="36" decoding="async" className="w-9 h-9 flex-shrink-0 object-contain" />
            </button>
          </div>

          {/* Sliding Brand Name Container */}
          <div className={cn(
            "overflow-hidden flex items-center min-w-0 transition-all duration-200",
            open ? "flex-1 pr-2 opacity-100 translate-x-0" : "w-0 flex-none pr-0 opacity-0 -translate-x-3 pointer-events-none"
          )}>
            <span className="text-slate-900 font-extrabold text-[22px] leading-tight tracking-wide whitespace-nowrap truncate">
              Ardent Capital
            </span>
          </div>
        </div>

      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 flex flex-col">
        {/* Menu Label (preserved height) */}
        <div className="h-6 flex items-center px-6 mb-2 overflow-hidden">
          <span
            className={cn(
              "text-xs font-bold text-slate-400 uppercase tracking-widest select-none transition-all duration-200",
              open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
            )}
          >
            MENU
          </span>
        </div>

        {/* Links List with spacing */}
        <div className="space-y-2.5 w-full">
          {links.map((link, idx) => (
            <SidebarLink key={idx} link={link} />
          ))}
        </div>
      </div>

      {/* Fixed Bottom Profile & Logout */}
      <div className="border-t border-slate-100 mt-auto flex flex-col gap-1 pb-4 pt-2">
        {/* User Card with Fixed 80px Avatar Slot */}
        <div className="w-full flex items-center h-14 overflow-hidden">
          {/* Permanent 80px Avatar Slot - rock-solid 40px center, perfectly aligned with menu icons */}
          <div className="w-20 h-14 flex-shrink-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>

          {/* Sliding User Details */}
          <div className={cn(
            "overflow-hidden flex-1 flex flex-col pr-3 transition-all duration-200 min-w-0",
            open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none w-0 flex-none pr-0"
          )}>
            <span className="text-sm font-bold text-slate-800 leading-tight truncate capitalize">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight font-semibold mt-0.5 truncate uppercase tracking-wider">
              {user?.role || 'Role'}
            </span>
          </div>
        </div>

        {/* Logout Link */}
        <SidebarLink
          link={{
            label: "Logout",
            name: "Logout",
            icon: <LogOut size={20} className="text-red-500" />,
          }}
          onClick={() => {
            if (setCurrentUser) setCurrentUser(null);
            navigate('/');
          }}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
        />
      </div>
    </SidebarBody>
  );
};

const Sidebar = ({ isCollapsed, setIsCollapsed, isHovered: isHoveredProp, setIsHovered: setIsHoveredProp }) => {
  const [localHovered, setLocalHovered] = useState(false);
  const isHovered = isHoveredProp !== undefined ? isHoveredProp : localHovered;
  const setIsHovered = setIsHoveredProp || setLocalHovered;

  // Expanded if not collapsed OR currently hovered when collapsed
  const open = !isCollapsed || isHovered;

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setIsHovered(false);
    }
  };

  return (
    <SidebarContext.Provider value={{ open }}>
      <SidebarContent 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        handleMouseEnter={handleMouseEnter}
        handleMouseLeave={handleMouseLeave}
      />
    </SidebarContext.Provider>
  );
};

export default Sidebar;
