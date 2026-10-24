"use client";
import React, { useState, createContext, useContext } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const { open } = useSidebar();
  return (
    <aside
      data-open={open ? "true" : "false"}
      className={cn(
        "desktop-sidebar h-screen fixed left-0 top-0 hidden md:flex md:flex-col justify-between bg-white border-r border-slate-200/80 shrink-0 z-30 shadow-sm overflow-hidden transition-[width,box-shadow] duration-300 ease-in-out",
        open ? "w-80 shadow-md" : "w-20",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </aside>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div
      className={cn(
        "h-20 px-6 flex flex-row md:hidden items-center justify-between bg-white border-b border-slate-200 w-full z-20 sticky top-0"
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Ardent Capital Logo" width="36" height="36" decoding="async" className="w-9 h-9 object-contain" />
        <span className="text-slate-900 font-extrabold text-[22px] tracking-wide">Ardent Capital</span>
      </div>
      <div className="flex justify-end z-20">
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <IconMenu2 className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900 z-[90]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed top-0 left-0 h-full w-80 bg-white p-6 z-[100] flex flex-col justify-between shadow-2xl border-r border-slate-200",
                className
              )}
            >
              <div
                className="absolute right-4 top-4 z-50 p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <IconX className="w-5 h-5" />
              </div>
              <SidebarContext.Provider value={{ open: true, setOpen: setMobileOpen, animate: false }}>
                {children}
              </SidebarContext.Provider>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  ...props
}) => {
  const { open, setOpen } = useSidebar();
  const label = link.label || link.name;

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (link.onClick) link.onClick(e);
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const content = (isActive) => (
    <>
      {isActive && (
        <div className="absolute left-0 w-1.5 h-8 bg-brand-800 rounded-r-full" />
      )}
      
      {/* Permanent, rock-solid 80px fixed anchor for the icon - NEVER moves */}
      <span
        className={cn(
          "w-20 h-12 flex-shrink-0 flex items-center justify-center transition-colors duration-200",
          isActive ? "text-brand-800" : ""
        )}
      >
        {link.icon}
      </span>

      {/* Slide & fade label container - positioned to the right of the icon, completely 0-width when collapsed so icons never shift or glitch */}
      <div
        className={cn(
          "overflow-hidden flex items-center min-w-0 transition-all duration-200",
          open
            ? "flex-1 pr-4 pl-1 opacity-100 translate-x-0"
            : "w-0 flex-none pr-0 opacity-0 -translate-x-3 pointer-events-none"
        )}
      >
        <span className="whitespace-nowrap text-[17.5px] font-semibold tracking-wide truncate">
          {label}
        </span>
      </div>
    </>
  );

  const baseClasses = (isActive) =>
    cn(
      "w-full h-[50px] flex items-center transition-colors group/sidebar relative overflow-hidden",
      isActive
        ? "text-brand-800 bg-brand-50/50"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      className
    );

  // If React Router navigation is intended
  if (link.to || link.path) {
    const toPath = link.to || link.path;
    return (
      <NavLink
        to={toPath}
        end
        onClick={handleClick}
        className={({ isActive }) => baseClasses(isActive)}
        title={!open ? label : undefined}
        {...props}
      >
        {({ isActive }) => content(isActive)}
      </NavLink>
    );
  }

  // If a clickable action / button is intended
  if (onClick || link.onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full h-12 flex items-center transition-colors group/sidebar relative overflow-hidden text-left text-slate-500 hover:bg-slate-50 hover:text-slate-800",
          className
        )}
        title={!open ? label : undefined}
        {...props}
      >
        {content(false)}
      </button>
    );
  }

  // Fallback anchor
  return (
    <a
      href={link.href || "#"}
      onClick={handleClick}
      className={cn(
        "w-full h-12 flex items-center transition-colors group/sidebar relative overflow-hidden text-slate-500 hover:bg-slate-50 hover:text-slate-800",
        className
      )}
      title={!open ? label : undefined}
      {...props}
    >
      {content(false)}
    </a>
  );
};
