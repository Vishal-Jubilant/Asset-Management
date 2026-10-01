import React, { useState, useEffect } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';

const AddUserModal = ({ isOpen, onClose, onAdd, roles = ['admin', 'md', 'manager', 'incharge', 'user'], users = [], editingUser }) => {

  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    mailid: '',
    empCode: '',
    mobile: '',
    role: '',
    reportingRole: '',
    reportingTo: [],
    password: '',
    status: 'Active'
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    setErrorMsg('');
    if (editingUser) {
      setFormData({
        username: editingUser.name || '',
        mailid: editingUser.mailid || '',
        empCode: editingUser.empCode || '',
        mobile: editingUser.mobile || '',
        role: editingUser.role || '',
        reportingRole: editingUser.reportingRole || '',
        reportingTo: editingUser.reportingTo ? (Array.isArray(editingUser.reportingTo) ? editingUser.reportingTo : [editingUser.reportingTo]) : [],
        password: editingUser.password || '',
        status: editingUser.status || 'Active'
      });
    } else {
      setFormData({
        username: '',
        mailid: '',
        empCode: '',
        mobile: '',
        role: '',
        reportingRole: '',
        reportingTo: [],
        password: '',
        status: 'Active'
      });
    }
  }, [editingUser, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'role') {
      const selectedRoleObj = roles.find(r => r.name === value);
      const immediateHigherRole = selectedRoleObj ? roles.find(r => r.level === selectedRoleObj.level - 1) : null;
      
      setFormData({ 
        ...formData, 
        role: value,
        reportingRole: immediateHigherRole ? immediateHigherRole.name : '',
        reportingTo: []
      });
    } else if (name === 'reportingRole') {
      setFormData({
        ...formData,
        reportingRole: value,
        reportingTo: []
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const isDuplicateEmail = users.some(u => 
      u.mailid.toLowerCase() === formData.mailid.toLowerCase() && 
      (!editingUser || u.id !== editingUser.id)
    );
    
    const isDuplicateEmpCode = users.some(u => 
      u.empCode.toLowerCase() === formData.empCode.toLowerCase() && 
      (!editingUser || u.id !== editingUser.id)
    );

    if (isDuplicateEmpCode && isDuplicateEmail) {
      setErrorMsg('This Emp Code and Email ID already exist.');
      return;
    } else if (isDuplicateEmail) {
      setErrorMsg('This Email ID already exists.');
      return;
    } else if (isDuplicateEmpCode) {
      setErrorMsg('This Emp Code already exists.');
      return;
    }

    if (onAdd) {
      onAdd(formData);
    }
    setFormData({
      username: '',
      mailid: '',
      empCode: '',
      mobile: '',
      role: '',
      reportingRole: '',
      reportingTo: [],
      password: '',
      status: 'Active'
    });
    onClose();
  };

  // Sort roles by level for display
  const sortedRoles = [...roles].sort((a, b) => a.level - b.level);
  const currentRoleObj = sortedRoles.find(r => r.name === formData.role);
  const isTopLevel = currentRoleObj?.level === 1;
  const higherRoles = currentRoleObj ? sortedRoles.filter(r => r.level === currentRoleObj.level - 1) : [];

  const roleOptions = sortedRoles.map(r => {
    let isAllowed = true;
    let tooltip = '';
    
    if (r.level > 1 && (!editingUser || editingUser.role !== r.name)) {
      const higherLevelRole = sortedRoles.find(role => role.level === r.level - 1);
      if (higherLevelRole) {
        const hasHigherLevelUser = users.some(u => u.role === higherLevelRole.name);
        isAllowed = hasHigherLevelUser;
        if (!isAllowed) {
          tooltip = `Please create an L${r.level - 1} (${higherLevelRole.name}) user first.`;
        }
      }
    }

    return {
      value: r.name,
      label: `L${r.level} – ${r.name.charAt(0).toUpperCase() + r.name.slice(1)}`,
      isDisabled: !isAllowed,
      tooltip: tooltip
    };
  });

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const reportingOptions = higherRoles.map(role => ({
    value: role.name,
    label: `L${role.level} – ${role.name.charAt(0).toUpperCase() + role.name.slice(1)}`
  }));

  const availablePersons = users.filter(u => u.role === formData.reportingRole);
  const personOptions = availablePersons.map(u => ({
    value: u.name,
    label: u.name
  }));

  const isEditingSystemAdmin = editingUser && editingUser.role?.toUpperCase() === 'ADMIN';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.18)] w-full max-w-lg flex flex-col overflow-hidden border border-slate-200 animate-slide-up" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-100 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {editingUser ? 'Update the details for this user.' : 'Fill in the details to create a new user account.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="overflow-y-auto flex-1 p-6 bg-white">
          <form id="add-user-form" onSubmit={handleSubmit} className="bg-slate-50/60 border border-slate-200/75 rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Username <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email ID <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="mailid"
                  required
                  value={formData.mailid}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Emp Code <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="empCode"
                  required
                  value={formData.empCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  placeholder="Enter emp code"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mobile <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input 
                  type="tel" 
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  placeholder="Enter mobile number"
                />
              </div>
              {!isEditingSystemAdmin && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Role <span className="text-red-500">*</span></label>
                  <CustomSelect
                    name="role"
                    options={roleOptions}
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="Select a role"
                    required={true}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status <span className="text-red-500">*</span></label>
                <CustomSelect
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleChange}
                  placeholder="Select status"
                  required={true}
                />
              </div>
              {!isEditingSystemAdmin && (
                <>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-medium text-slate-700">
                      Reporting Role {!isTopLevel && <span className="text-red-500">*</span>}
                    </label>
                    <CustomSelect
                      name="reportingRole"
                      options={isTopLevel ? [{value: '', label: 'N/A (Top Level)'}] : reportingOptions}
                      value={formData.reportingRole}
                      onChange={handleChange}
                      placeholder="Select reporting role"
                      disabled={isTopLevel || higherRoles.length <= 1}
                      required={!isTopLevel}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-medium text-slate-700">
                      Reporting Person {!isTopLevel && personOptions.length > 0 && <span className="text-red-500">*</span>}
                    </label>
                    <CustomSelect
                      name="reportingTo"
                      options={isTopLevel ? [{value: '', label: 'N/A (Top Level)'}] : personOptions}
                      value={formData.reportingTo}
                      onChange={handleChange}
                      placeholder={formData.reportingRole && personOptions.length === 0 ? "No persons found" : "Select person"}
                      disabled={isTopLevel || !formData.reportingRole || personOptions.length === 0}
                      required={!isTopLevel && personOptions.length > 0}
                      isMulti={!isTopLevel}
                      menuPlacement="top"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Password <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    minLength="6"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                    placeholder="Enter password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-100 px-6 py-4">
          {errorMsg && (
            <div className="text-red-600 text-sm font-medium bg-red-50 p-2.5 rounded-lg border border-red-100 text-center mb-4">
              {errorMsg}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
               Cancel
            </button>
            <button
               form="add-user-form" 
               type="submit" 
               className="px-5 py-2 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
               {editingUser ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;

