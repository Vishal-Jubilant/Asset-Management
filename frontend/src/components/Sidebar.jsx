import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from './ui/sidebar';
import { 
  LayoutDashboard, FilePlus, List, LogOut, Settings, Users, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="pt-6 lg:pt-8 pb-4 flex items-center justify-between w-full relative">
        <div className="flex items-center min-w-0">
          {/* Permanent 80px Logo Slot - never shifts, rock-solid 40px center */}
          <div className="w-20 flex-shrink-0 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(!isCollapsed);
                if (setIsHovered) setIsHovered(false);
              }}
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

        {/* Desktop Collapse / Expand Toggle Button */}
        {open && (
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              if (setIsHovered) setIsHovered(false);
            }}
            className="hidden md:flex items-center justify-center p-1.5 mr-3 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            title={isCollapsed ? "Pin sidebar open" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 flex flex-col">
        {/* Menu Label (preserved height) */}
        <div className="h-6 flex items-center px-6 mb-3 overflow-hidden">
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
    <AceternitySidebar open={open} setOpen={(val) => setIsCollapsed(!val)} animate={false}>
      <SidebarContent 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        handleMouseEnter={handleMouseEnter}
        handleMouseLeave={handleMouseLeave}
      />
    </AceternitySidebar>
  );
};

export default Sidebar;
