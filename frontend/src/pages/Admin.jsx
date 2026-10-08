import React, { useState, useContext, useEffect } from 'react';
import { Users, UserCheck, ShieldCheck, Search, Command, Plus, FileText, Briefcase, Package, BarChart } from 'lucide-react';
import StatCard from '../components/StatCard';
import UserTable from '../components/UserTable';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import AddUserModal from '../components/AddUserModal';
import ManageRolesModal from '../components/ManageRolesModal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { AppContext } from '../context/AppContext';

import api from '../utils/api';

const Admin = () => {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = useState(false);
  const { users, setUsers, roles, setRoles } = useContext(AppContext);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterRoles, setSelectedFilterRoles] = useState([]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mailid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.mobile && user.mobile.includes(searchQuery));
      
    const matchesRole = selectedFilterRoles.length === 0 || selectedFilterRoles.includes(user.role);
    
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    const aIsAdmin = a.role?.toLowerCase() === 'admin';
    const bIsAdmin = b.role?.toLowerCase() === 'admin';
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return 0;
  });

  useEffect(() => {
    if (isAddUserModalOpen || isManageRolesModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddUserModalOpen, isManageRolesModalOpen]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch(e) { console.error(e); }
  };

  const stats = [
    { title: 'Total User', value: users.length.toString(), icon: <Users size={24} /> },
    { title: 'Active User', value: users.filter(u => u.status === 'Active').length.toString(), icon: <UserCheck size={24} /> },
    { title: 'Total Role', value: roles.length.toString(), icon: <ShieldCheck size={24} /> }
  ];


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Admin Dashboard
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
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => setIsManageRolesModalOpen(true)}>
            <Plus size={18} />
            New Role
          </Button>
        </div>
      </div>

      {/* User Table Content */}
      <div className="pt-4 mt-2">
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Users</h2>
            <div className="flex items-center gap-3">
              <MultiSelectDropdown 
                label="Roles"
                options={roles.map(r => ({ value: r.name, label: r.name.charAt(0).toUpperCase() + r.name.slice(1) }))}
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
              const res = await api.put(`/users/${editingUser.id}`, { name: data.username, mailid: data.mailid, empCode: data.empCode, mobile: data.mobile, role: data.role, reportingRole: data.reportingRole, reportingTo: data.reportingTo, status: data.status, password: data.password, department: 'N/A' });
              setUsers(users.map(u => u.id === editingUser.id ? res.data : u));
            } catch (e) { console.error(e); }
          } else {
            try {
              const res = await api.post('/users', { name: data.username, mailid: data.mailid, empCode: data.empCode, mobile: data.mobile, role: data.role, reportingRole: data.reportingRole, reportingTo: data.reportingTo, status: data.status, password: data.password || 'password123', department: 'N/A' });
              setUsers([...users, res.data]);
            } catch (e) { console.error(e); }
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
    </div>
  );
};

export default Admin;
