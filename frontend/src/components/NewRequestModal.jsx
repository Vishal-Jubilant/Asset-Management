import React, { useState, useContext, useRef, useEffect } from 'react';
import { X, Plus, Package, Paperclip, User, Tag, FileText, AlignLeft } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';

const NewRequestModal = ({ isOpen, onClose, onAdd, editRequest = null }) => {
  const { currentUser, categories, roles, users } = useContext(AppContext);

  const currentUserRole = roles.find(r => r.name?.toLowerCase() === currentUser?.role?.toLowerCase());
  const currentUserLevel = currentUserRole ? currentUserRole.level : Infinity;
  
  // Lower level number = higher authority (e.g., MD=level1, User=level2)
  // So roles that can approve must have a LOWER level number
  let higherRoles = roles.filter(r => r.level < currentUserLevel && r.name?.toLowerCase() !== 'admin');

  if (editRequest && editRequest.commentsHistory && editRequest.commentsHistory.length > 0) {
    const involvedRoles = new Set(editRequest.commentsHistory.map(c => c.role?.toLowerCase()));
    higherRoles = higherRoles.filter(r => involvedRoles.has(r.name?.toLowerCase()));
  }

  const [formData, setFormData] = useState({
    assetType: '',
    otherAssetType: '',
    description: '',
    justification: '',
    selectedReportingRole: '',
    selectedReportingTo: []
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (editRequest) {
        setFormData({
          assetType: categories.some(c => c.value === editRequest.category) ? editRequest.category : 'Other',
          otherAssetType: categories.some(c => c.value === editRequest.category) ? '' : editRequest.category,
          description: editRequest.item || '',
          justification: editRequest.justification || '',
          selectedReportingRole: '',
          selectedReportingTo: []
        });
      } else {
        setFormData({
          assetType: '',
          otherAssetType: '',
          description: '',
          justification: '',
          selectedReportingRole: '',
          selectedReportingTo: []
        });
      }
      setAttachedFiles([]);
      setFileError('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, editRequest, categories]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFileError('');
      const validFiles = [];
      let hasError = false;
      newFiles.forEach(file => {
        if (file.size > 1024 * 1024) {
          hasError = true;
        } else {
          validFiles.push(file);
        }
      });
      if (hasError) setFileError('One or more images exceed the 1MB limit and were skipped.');
      setAttachedFiles(prev => [...prev, ...validFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Auto-capitalize the first letter for text fields
    if ((name === 'description' || name === 'justification' || name === 'otherAssetType') && formattedValue.length > 0) {
      formattedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
    }
    
    setFormData(prev => {
      const newData = { ...prev, [name]: formattedValue };
      if (name === 'selectedReportingRole') {
        newData.selectedReportingTo = [];
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    if (!formData.selectedReportingRole || !formData.selectedReportingTo || formData.selectedReportingTo.length === 0) {
      setValidationError('Please select a Reporting Role and Reporting Person before submitting.');
      return;
    }
    
    const filePromises = attachedFiles.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    });
    
    try {
      const base64Files = await Promise.all(filePromises);
      if (onAdd) onAdd({ ...formData, attachments: base64Files });
      onClose();
    } catch (err) {
      console.error("Error converting files", err);
      alert("Error attaching files.");
    }
  };

  let availablePersons = users.filter(u => u.role === formData.selectedReportingRole);
  if (editRequest && editRequest.commentsHistory && editRequest.commentsHistory.length > 0) {
    const involvedNames = new Set(editRequest.commentsHistory.map(c => c.name?.toLowerCase()));
    availablePersons = availablePersons.filter(u => involvedNames.has(u.name?.toLowerCase()));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.18)] w-full max-w-xl border border-slate-100 flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-100 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-700">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">{editRequest ? 'Edit Request' : 'Create Request'}</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">{editRequest ? 'Resubmit your returned request.' : 'Submit a new request for IT hardware or software.'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200/60 shadow-sm hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 bg-white">
          <form id="new-request-form" onSubmit={handleSubmit} className="bg-slate-50/60 border border-slate-200/75 rounded-2xl p-5 space-y-6">



            {/* User + Category row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-slate-700">
                  Requester
                </label>
                <div className="flex items-center gap-3 px-3.5 h-[46px] bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0 ring-1 ring-brand-100 shadow-sm">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 truncate capitalize">{currentUser?.name || 'User'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-slate-700">
                  Category <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <CustomSelect
                    name="assetType"
                    options={categories}
                    value={formData.assetType}
                    onChange={handleChange}
                    placeholder="Select category..."
                    required={true}
                  />
                </div>
                {formData.assetType === 'Other' && (
                  <input
                    type="text"
                    name="otherAssetType"
                    value={formData.otherAssetType}
                    onChange={handleChange}
                    placeholder="Specify category..."
                    required
                    className="w-full px-3.5 py-2.5 mt-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-[13px] shadow-sm transition-all placeholder:text-slate-400"
                  />
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-slate-700">
                Subject <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                name="description"
                placeholder="e.g., MacBook Pro 16-inch for development"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-3.5 h-[46px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-[13px] shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-slate-700">
                  Description <span className="text-red-500 ml-0.5">*</span>
                </label>
                <span className={`text-[11px] font-medium tabular-nums ${formData.justification.length > 180 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {formData.justification.length}/200
                </span>
              </div>
              <textarea
                rows={3}
                name="justification"
                placeholder="Provide a brief business justification..."
                value={formData.justification}
                onChange={handleChange}
                required
                maxLength={200}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-[13px] resize-none shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-slate-700">
                Attachments <span className="text-slate-400 font-normal ml-1">Optional</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 bg-white rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group shadow-sm"
              >
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200 group-hover:border-blue-200 flex items-center justify-center transition-colors shadow-sm">
                  <Paperclip size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Attach files or screenshots</p>
                  <p className="text-[11px] text-slate-400">Up to 1MB per file</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
              {fileError && <p className="text-xs text-rose-500 font-medium">{fileError}</p>}
              {attachedFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                      <Paperclip size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-[12px] font-medium">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Previous Comments */}
            {editRequest && editRequest.commentsHistory && editRequest.commentsHistory.length > 0 && (
              <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-[13px] font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  Approval Workflow Comments
                </h3>
                <div className="space-y-3">
                  {editRequest.commentsHistory.map((c, i) => {
                    const u = users.find(user => user.name === c.name);
                    const sentToObj = u && editRequest.approverSelections ? editRequest.approverSelections[u.id] : undefined;
                    const sentToStr = sentToObj ? (Array.isArray(sentToObj) ? sentToObj : [sentToObj]).map(name => {
                      const targetUser = users.find(user => user.name === name);
                      if (targetUser) {
                        const roleStr = targetUser.role === 'md' ? 'MD' : (targetUser.role ? targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1).toLowerCase() : '');
                        return `${name} (${roleStr})`;
                      }
                      return name;
                    }).join(', ') : '';

                    return (
                      <div key={i} className={`p-3 rounded-lg border ${c.action === 'return' ? 'bg-amber-50/50 border-amber-100' : c.action === 'reject' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 text-[12px]">{i + 1}. {c.name} <span className="text-slate-500 font-normal ml-1">({c.role})</span></span>
                          <span className="text-slate-400 font-medium text-[10px]">{new Date(c.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <p className="text-slate-700 text-[13px]">{c.comment || "No comment provided."}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className={c.action === 'approve' ? 'text-emerald-600' : c.action === 'reject' ? 'text-rose-600' : 'text-amber-600'}>
                            {c.action === 'approve' ? 'Approved' : c.action === 'reject' ? 'Declined' : c.action === 'return' ? 'Returned' : 'Responded'}
                          </span>
                          {sentToStr && (
                            <span className="text-slate-500 normal-case tracking-normal font-medium text-[11px]">
                              {c.action === 'return' ? 'Returned to: ' : 'Sent to: '}
                              <span className="text-slate-700 font-semibold">{sentToStr}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Approval Flow + Actions - fixed at bottom, OUTSIDE scrollable area */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-100">
          {/* Approval Flow */}
          <div className="px-6 py-4 border-b border-slate-200/75 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
            {(() => {
              const formatLabel = (str) => {
                if (!str) return '';
                if (str.toLowerCase() === 'md') return 'MD';
                return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
              };
              return (
                <>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-slate-700">
                Reporting Role <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <CustomSelect
                  name="selectedReportingRole"
                  options={higherRoles.map(r => ({ value: r.name, label: formatLabel(r.name) }))}
                  value={formData.selectedReportingRole}
                  onChange={handleChange}
                  placeholder="Select reporting role"
                  required={true}
                  menuPlacement="top"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-slate-700">
                Reporting Person <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <CustomSelect
                  name="selectedReportingTo"
                  options={availablePersons.map(u => ({ value: u.name, label: formatLabel(u.name) }))}
                  value={formData.selectedReportingTo}
                  onChange={handleChange}
                  placeholder="Select person(s)"
                  required={true}
                  isMulti={true}
                  menuPlacement="top"
                />
              </div>
            </div>
              </>
            );
          })()}
          </div>

          {validationError && (
            <div className="px-6 pt-3">
              <p className="text-rose-500 text-[13px] font-medium">{validationError}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="px-6 py-4 flex items-center justify-end gap-3">
            <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
               Cancel
            </button>
            <button
               form="new-request-form" 
               type="submit" 
               className="px-5 py-2 text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-600/20 flex items-center gap-2"
            >
               <Plus size={16} className="text-green-100" /> Create Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRequestModal;
