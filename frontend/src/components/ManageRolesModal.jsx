import React, { useState } from 'react';
import { X, Trash2, Plus, Edit2, Check, GripVertical, ShieldCheck } from 'lucide-react';
import Button from './Button';

// Level color map
const LEVEL_COLORS = {
  1: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
  2: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  3: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  4: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  5: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
};

const getLevelColor = (level) => LEVEL_COLORS[level] || 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20';

const ManageRolesModal = ({ isOpen, onClose, roles, onAddRole, onDeleteRole, onEditRole, onReorderRole }) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  if (!isOpen) return null;

  const maxExistingLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level || 1)) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmedName = newRoleName.trim().toLowerCase();
    const level = parseInt(newRoleLevel) || (maxExistingLevel + 1);
    if (!trimmedName) return;
    if (roles.some(r => r.name === trimmedName)) return;
    onAddRole({ name: trimmedName, level });
    setNewRoleName('');
    setNewRoleLevel('');
  };

  const handleSaveEdit = (index) => {
    const trimmedName = editName.trim().toLowerCase();
    const level = parseInt(editLevel);
    if (!trimmedName || !level) { setEditingIndex(null); return; }
    const old = roles[index];
    if (trimmedName !== old.name || level !== old.level) {
      if (onEditRole) onEditRole(old, { name: trimmedName, level });
    }
    setEditingIndex(null);
  };

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    const newRoles = [...roles];
    const dragged = newRoles[draggedItemIndex];
    newRoles.splice(draggedItemIndex, 1);
    newRoles.splice(dropIndex, 0, dragged);
    
    // Auto-reassign levels based on the new visual order
    const releveledRoles = newRoles.map((role, idx) => ({ ...role, level: idx + 1 }));
    
    if (onReorderRole) onReorderRole(releveledRoles);
    setDraggedItemIndex(null);
  };

  const handleDragEnd = () => setDraggedItemIndex(null);

  // Available levels (1–10), excluding already taken ones (except the one being edited)
  const takenLevels = roles.map(r => r.level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden animate-slide-up border border-slate-200/60">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={22} className="text-brand-500" />
              Manage Roles
            </h2>
            <p className="text-sm text-slate-500 mt-1">Add, edit, or reorder system roles.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-2">
          {/* Add New Role Form */}
          <form onSubmit={handleAdd} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter new role name..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 text-sm"
              />
              <select
                value={newRoleLevel}
                onChange={(e) => setNewRoleLevel(e.target.value)}
                className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700 text-sm font-semibold"
              >
                <option value="">Level</option>
                {Array.from({ length: maxExistingLevel + 1 }, (_, i) => i + 1).map(lvl => (
                  <option key={lvl} value={lvl}>L{lvl}</option>
                ))}
              </select>
              <Button type="submit" variant="primary" className="flex-shrink-0 px-4">
                <Plus size={18} className="mr-1" /> Add
              </Button>
            </div>
            {newRoleName && newRoleLevel && takenLevels.includes(parseInt(newRoleLevel)) && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                ℹ️ L{newRoleLevel} already exists. Existing roles will be shifted down automatically.
              </p>
            )}
          </form>

          {/* Roles List */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Roles</h3>
            
            {roles.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500">No roles defined. Add one above.</p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-2 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {roles.map((role, index) => (
                  <div
                    key={`${role.name}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 bg-white border rounded-xl transition-all cursor-grab active:cursor-grabbing group ${
                      draggedItemIndex === index
                        ? 'opacity-50 border-brand-300 shadow-md ring-2 ring-brand-500/20'
                        : 'border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md'
                    }`}
                  >
                    <GripVertical size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />

                    {editingIndex === index ? (
                      // --- Edit Mode ---
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-20 px-2 py-1.5 bg-white border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold text-slate-700"
                        >
                          {Array.from({ length: maxExistingLevel + 1 }, (_, i) => i + 1).map(lvl => (
                            <option key={lvl} value={lvl}>L{lvl}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEdit(index)} className="text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg transition-colors" title="Save">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingIndex(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Cancel">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      // --- Display Mode ---
                      <>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md min-w-[36px] text-center ${getLevelColor(role.level)}`}>
                          L{role.level}
                        </span>
                        <span className="flex-1 font-semibold text-slate-700 capitalize text-[14px]">{role.name}</span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingIndex(index); setEditName(role.name); setEditLevel(role.level); }}
                            className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteRole(role)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};

export default ManageRolesModal;
