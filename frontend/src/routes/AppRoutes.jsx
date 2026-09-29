import React, { lazy, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

// Layout & Auth (keep these eagerly loaded for fast initial paint)
import Login from '../pages/Login';
import MainLayout from '../components/MainLayout';

// Lazy loaded pages (Code Splitting)
const Dashboard = lazy(() => import('../pages/Dashboard'));
const NewRequest = lazy(() => import('../pages/NewRequest'));
const MyRequests = lazy(() => import('../pages/MyRequests'));
const Admin = lazy(() => import('../pages/user'));
const Settings = lazy(() => import('../pages/Settings'));

const AppRoutes = () => {
  const { currentUser, isInitializing } = useContext(AppContext);
  
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Master App - Single unified workspace, no hierarchy */}
      <Route path="/app" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="new-request" element={<NewRequest />} />
        <Route path="my-requests" element={<MyRequests />} />
        {(isInitializing || currentUser?.role?.toLowerCase() === 'admin') && (
          <>
            <Route path="admin" element={<Admin />} />
            <Route path="settings" element={<Settings />} />
          </>
        )}
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to={currentUser ? "/app" : "/"} replace />} />
    </Routes>
  );
};

export default AppRoutes;
