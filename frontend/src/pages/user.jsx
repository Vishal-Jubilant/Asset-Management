import React, { useState, useContext, useEffect } from 'react';
import { Users, UserCheck, ShieldCheck, Search, Command, Plus, FileText, Briefcase, Package, BarChart } from 'lucide-react';
import StatCard from '../components/StatCard';
import UserTable from '../components/UserTable';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import AddUserModal from '../components/AddUserModal';
import ManageRolesModal from '../components/ManageRolesModal';
import ConfirmModal from '../components/ConfirmModal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { AppContext } from '../context/AppContext';

import api from '../utils/api';

const Admin = () => {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { users, setUsers, roles, setRoles, refreshRequests } = useContext(AppContext);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterRoles, setSelectedFilterRoles] = useState([]);

  const getUserRank = (u) => {
    if (!u) return 99;
    const role = (u.role || '').toLowerCase().trim();
    const deptRole = (u.departmentRole || '').toLowerCase().trim();
    const empCode = (u.empCode || '').toLowerCase().trim();
    const mail = (u.mailid || '').toLowerCase().trim();
    const name = (u.name || '').toLowerCase().trim();
    if (role === 'admin' || empCode === 'admin' || mail === 'admin@system.local' || name === 'administrator') return 0;
    if (role === 'md' || deptRole === 'md' || empCode === 'md' || mail === 'md@system.local' || name === 'managing director') return 1;
    return 2;
  };

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.mailid && user.mailid.toLowerCase().includes(q)) ||
      (user.empCode && user.empCode.toLowerCase().includes(q)) ||
      (user.department && user.department.toLowerCase().includes(q)) ||
      (user.role && user.role.toLowerCase().includes(q)) ||
      (user.departmentRole && user.departmentRole.toLowerCase().includes(q)) ||
      (user.departmentTitle && user.departmentTitle.toLowerCase().includes(q)) ||
      (user.mobile && user.mobile.includes(searchQuery));
      
    const isMD = getUserRank(user) === 1;
    const isAdmin = getUserRank(user) === 0;

    const matchesRole = selectedFilterRoles.length === 0 || 
      selectedFilterRoles.some(r => {
        const rLower = r.toLowerCase();
        if (rLower === 'md' && isMD) return true;
        if (rLower === 'admin' && isAdmin) return true;
        return (user.role && user.role.toLowerCase() === rLower) ||
               (user.departmentRole && user.departmentRole.toLowerCase() === rLower);
      });
    
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    const rankA = getUserRank(a);
    const rankB = getUserRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.id || 0) - (b.id || 0);
  });

  useEffect(() => {
    if (isAddUserModalOpen || isManageRolesModalOpen || userToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddUserModalOpen, isManageRolesModalOpen, userToDelete]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const rank = getUserRank(targetUser);
    if (rank === 0) {
      alert("Admin account cannot be deleted");
      return;
    }
    setUserToDelete(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      // Refresh requests because backend cascades deletion of requests made by this user
      if (typeof refreshRequests === 'function') refreshRequests();
      setUserToDelete(null);
    } catch(e) { 
      console.error(e); 
      alert(e.response?.data?.detail || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = [
    { title: 'Total User', value: users.length.toString(), icon: <Users size={24} /> },
    { title: 'Active User', value: users.filter(u => u.status === 'Active').length.toString(), icon: <UserCheck size={24} /> },
    { title: 'Total Role', value: roles.length.toString(), icon: <ShieldCheck size={24} /> }
  ];


  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          User Management
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Manage users, roles, and system settings.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Search Bar and Actions */}
      <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center px-5 py-3.5 w-full lg:max-w-2xl hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/50">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 placeholder:text-slate-400 text-base"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" className="flex items-center gap-2" onClick={() => {
            setEditingUser(null);
            setIsAddUserModalOpen(true);
          }}>
            <Plus size={18} />
            Add User
          </Button>
        </div>
      </div>

      {/* User Table Content */}
      <div className="pt-0 mt-0">
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Users</h2>
            <div className="flex items-center gap-3">
              <MultiSelectDropdown 
                label="Roles"
                options={[
                  { value: 'Admin', label: 'Admin' },
                  { value: 'MD', label: 'MD' },
                  { value: 'Head', label: 'Head' },
                  { value: 'User', label: 'User' }
                ]}
                selectedValues={selectedFilterRoles}
                onChange={setSelectedFilterRoles}
              />
            </div>
          </div>
          <UserTable users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser} />
        </div>
      </div>

      {/* Modals */}
      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => {
          setIsAddUserModalOpen(false);
          setEditingUser(null);
        }} 
        roles={roles}
        users={users}
        editingUser={editingUser}
        onAdd={async (data) => {
          if (editingUser) {
            try {
              const res = await api.put(`/users/${editingUser.id}`, { 
                name: data.username, 
                mailid: data.mailid, 
                empCode: data.empCode, 
                mobile: data.mobile, 
                role: data.role || 'User', 
                reportingRole: data.reportingRole, 
                reportingTo: data.reportingTo, 
                status: data.status, 
                password: data.password, 
                department: data.department || '', 
                departmentRole: data.role || data.departmentRole || 'User' 
              });
              setUsers(users.map(u => u.id === editingUser.id ? res.data : u));
            } catch (e) { 
              console.error(e);
              alert(e.response?.data?.detail || "Failed to update user");
            }
          } else {
            try {
              const res = await api.post('/users', { 
                name: data.username, 
                mailid: data.mailid, 
                empCode: data.empCode, 
                mobile: data.mobile, 
                role: data.role || 'User', 
                reportingRole: data.reportingRole, 
                reportingTo: data.reportingTo, 
                status: data.status, 
                password: data.password || 'password123', 
                department: data.department || '', 
                departmentRole: data.role || data.departmentRole || 'User' 
              });
              setUsers([...users, res.data]);
            } catch (e) { 
              console.error(e);
              alert(e.response?.data?.detail || "Failed to create user");
            }
          }
        }}
      />

      <ManageRolesModal
        isOpen={isManageRolesModalOpen}
        onClose={() => setIsManageRolesModalOpen(false)}
        roles={roles}
        onAddRole={async (newRole) => {
          const updatedRoles = [...roles];
          const targetIndex = Math.max(0, Math.min(newRole.level - 1, updatedRoles.length));
          updatedRoles.splice(targetIndex, 0, newRole);
          const releveled = updatedRoles.map((r, idx) => ({ ...r, level: idx + 1 }));
          try {
            await api.post('/roles/batch', releveled);
            setRoles(releveled);
          } catch(e) { console.error(e); }
        }}
        onDeleteRole={async (roleToDelete) => {
          const filteredRoles = roles.filter(r => r.name !== roleToDelete.name);
          const releveled = filteredRoles.map((r, idx) => ({ ...r, level: idx + 1 }));
          try {
            await api.post('/roles/batch', releveled);
            setRoles(releveled);
          } catch(e) { console.error(e); }
        }}
        onEditRole={async (oldRole, newRole) => {
          const filteredRoles = roles.filter(r => r.name !== oldRole.name);
          const targetIndex = Math.max(0, Math.min(newRole.level - 1, filteredRoles.length));
          filteredRoles.splice(targetIndex, 0, newRole);
          const releveled = filteredRoles.map((r, idx) => ({ ...r, level: idx + 1 }));
          try {
            await api.post('/roles/batch', releveled);
            setRoles(releveled);
            setUsers(users.map(u => u.role === oldRole.name ? { ...u, role: newRole.name } : u));
          } catch(e) { console.error(e); }
        }}
        onReorderRole={async (newRoles) => {
          try {
            await api.post('/roles/batch', newRoles);
            setRoles(newRoles);
          } catch(e) { console.error(e); }
        }}
      />

      {/* Delete User Confirmation Card Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => !isDeleting && setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This will permanently remove their access and account."
        user={userToDelete}
        confirmText="Delete User"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

    </div>
  );
};

export default Admin;
