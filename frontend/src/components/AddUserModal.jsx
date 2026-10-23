import React, { useState, useEffect, useContext } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';

const AddUserModal = ({ isOpen, onClose, onAdd, roles = ['admin', 'md', 'manager', 'incharge', 'user'], users = [], editingUser }) => {

  const { departments = [] } = useContext(AppContext);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    mailid: '',
    empCode: '',
    mobile: '',
    department: '',
    role: '',
    departmentRole: '',
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
      const existingRole = editingUser.role || editingUser.departmentRole || '';
      setFormData({
        username: editingUser.name || '',
        mailid: editingUser.mailid || '',
        empCode: editingUser.empCode || '',
        mobile: editingUser.mobile || '',
        department: editingUser.department || '',
        role: existingRole,
        departmentRole: existingRole,
        password: editingUser.password || '',
        status: editingUser.status || 'Active'
      });
    } else {
      setFormData({
        username: '',
        mailid: '',
        empCode: '',
        mobile: '',
        department: '',
        role: '',
        departmentRole: '',
        password: '',
        status: 'Active'
      });
    }
  }, [editingUser, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'department') {
      const isManagingDirectory = (value || '').trim().toLowerCase() === 'managing directory';
      setFormData(prev => ({
        ...prev,
        department: value,
        ...(prev.role === 'MD' && !isManagingDirectory ? { role: '', departmentRole: '' } : {})
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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

    if (!formData.department) {
      setErrorMsg('Please select a department.');
      return;
    }
    if (!formData.role) {
      setErrorMsg('Please select a role.');
      return;
    }

    if (onAdd) {
      onAdd({
        ...formData,
        role: formData.role,
        departmentRole: formData.role
      });
    }
    setFormData({
      username: '',
      mailid: '',
      empCode: '',
      mobile: '',
      department: '',
      role: '',
      departmentRole: '',
      password: '',
      status: 'Active'
    });
    onClose();
  };

  // Role options: MD is only available in Managing Directory.
  const roleOptions = React.useMemo(() => {
    const isManagingDirectory = (formData.department || '').trim().toLowerCase() === 'managing directory';
    const isEditingSystemAdmin = editingUser && editingUser.role?.toLowerCase() === 'admin';

    if (isManagingDirectory) {
      return [{ value: 'MD', label: 'MD' }];
    }

    const opts = [];
    if (isEditingSystemAdmin) {
      opts.push({ value: 'Admin', label: 'Admin' });
    }
    opts.push({ value: 'Head', label: 'Head' });
    opts.push({ value: 'User', label: 'User' });
    return opts;
  }, [formData.department, editingUser]);

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  // Keep Managing Directory at the end of the department options.
  const departmentOptions = React.useMemo(() => {
    const regularDepartments = [];
    let managingDirectoryOption = null;

    (departments || []).forEach(d => {
      if (d && d.value) {
        const item = { value: d.value, label: d.label || d.value };
        if (d.value.trim().toLowerCase() === 'managing directory') {
          managingDirectoryOption = item;
        } else if (!regularDepartments.some(x => x.value.toLowerCase() === d.value.toLowerCase())) {
          regularDepartments.push(item);
        }
      }
    });

    if (!managingDirectoryOption) {
      managingDirectoryOption = { value: 'Managing Directory', label: 'Managing Directory' };
    }

    return [...regularDepartments, managingDirectoryOption];
  }, [departments]);

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
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-700 shadow-sm"
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
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-700 shadow-sm"
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
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-700 shadow-sm"
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
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-700 shadow-sm"
                  placeholder="Enter mobile number"
                />
              </div>
              {/* Row 3: Department + Role */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Department <span className="text-red-500">*</span></label>
                <CustomSelect
                  name="department"
                  options={departmentOptions}
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Select department"
                  required={true}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Role <span className="text-red-500">*</span></label>
                <CustomSelect
                  name="role"
                  options={roleOptions}
                  value={formData.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, role: val, departmentRole: val }));
                  }}
                  placeholder="Select role"
                  required={true}
                />
              </div>
              {/* Row 4: Status */}
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
                    className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-700 shadow-sm"
                    placeholder="Enter password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-brand-500 transition-colors focus:outline-none"
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

