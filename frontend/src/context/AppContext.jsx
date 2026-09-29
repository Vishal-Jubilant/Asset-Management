import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isInitialLoad = React.useRef(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Assuming api.js attaches the token to headers
          const res = await api.get('/auth/me');
          setCurrentUser(res.data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (isInitialLoad.current) {
        fetchInitialData();
        isInitialLoad.current = false;
      }
    } else if (!isInitializing) {
      localStorage.removeItem('token');
      setUsers([]);
      setRequests([]);
      isInitialLoad.current = true;
    }
  }, [currentUser, isInitializing]);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      const latestUser = users.find(u => u.id === currentUser.id);
      if (latestUser && JSON.stringify(latestUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(latestUser);
      }
    }
  }, [users]);

  const fetchInitialData = async () => {
    try {
      const [usersRes, rolesRes, catsRes, reqsRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
        api.get('/categories'),
        api.get('/asset-requests')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setCategories(catsRes.data);
      setRequests(reqsRes.data);
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  };

  const refreshRequests = async () => {
    try {
      const res = await api.get('/asset-requests');
      setRequests(res.data);
    } catch (error) {
      console.error("Failed to refresh requests", error);
    }
  };

  return (
    <AppContext.Provider value={{ 
        users, setUsers, 
        roles, setRoles, 
        currentUser, setCurrentUser, 
        requests, setRequests, refreshRequests,
        categories, setCategories,
        isInitializing
    }}>
      {children}
    </AppContext.Provider>
  );
};

