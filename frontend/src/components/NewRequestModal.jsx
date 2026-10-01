import React, { useState, useContext, useRef, useEffect } from 'react';
import { X, Plus, Package, Paperclip, User, Tag, FileText, AlignLeft } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';

const NewRequestModal = ({ isOpen, onClose, onAdd }) => {
  const { currentUser, categories } = useContext(AppContext);

  const isMultiReporting = Array.isArray(currentUser?.reportingTo) && currentUser.reportingTo.length > 1;
  const hasReportingTo = currentUser?.reportingTo && (!Array.isArray(currentUser.reportingTo) || currentUser.reportingTo.length > 0);
  
  const defaultReportingTo = isMultiReporting 
    ? currentUser.reportingTo 
    : (hasReportingTo ? (Array.isArray(currentUser.reportingTo) ? currentUser.reportingTo[0] : currentUser.reportingTo) : '');

  const [formData, setFormData] = useState({
    assetType: '',
    otherAssetType: '',
    description: '',
    justification: '',
    selectedReportingTo: defaultReportingTo
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // reset form when opening
      setFormData(prev => ({
        assetType: prev.assetType,
        otherAssetType: prev.otherAssetType,
        description: prev.description,
        justification: prev.justification,
        selectedReportingTo: defaultReportingTo
      }));
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [defaultReportingTo]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData({
        assetType: '',
        otherAssetType: '',
        description: '',
        justification: '',
        selectedReportingTo: defaultReportingTo
      });
      setAttachedFiles([]);
      setFileError('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

  const roleLabel = currentUser?.reportingRole
    ? (currentUser.reportingRole.toLowerCase() === 'md' ? 'MD' : currentUser.reportingRole.charAt(0).toUpperCase() + currentUser.reportingRole.slice(1).toLowerCase())
    : 'Manager';

  const avatarLetter = (() => {
    if (Array.isArray(formData.selectedReportingTo)) {
      if (formData.selectedReportingTo.length === 1) return formData.selectedReportingTo[0].charAt(0).toUpperCase();
      if (formData.selectedReportingTo.length > 1) return formData.selectedReportingTo.length;
      return roleLabel.charAt(0).toUpperCase();
    } else if (formData.selectedReportingTo) {
      return formData.selectedReportingTo.charAt(0).toUpperCase();
    }
    return roleLabel.charAt(0).toUpperCase();
  })();

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
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">Create Request</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Submit a new request for IT hardware or software.</p>
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
          </form>
        </div>

        {/* Approval Flow + Actions - fixed at bottom, OUTSIDE scrollable area */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-100">
          {/* Approval Flow */}
          <div className="px-6 py-4 border-b border-slate-200/75 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold shadow-sm ring-1 ring-brand-200 flex-shrink-0">
                {avatarLetter}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Next Step</p>
                {isMultiReporting ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-700">Forward to</span>
                    <div className="w-[180px]">
                      <CustomSelect
                        name="selectedReportingTo"
                        options={(Array.isArray(currentUser.reportingTo) ? currentUser.reportingTo : (currentUser.reportingTo ? [currentUser.reportingTo] : [])).map(n => ({ value: n, label: n }))}
                        value={formData.selectedReportingTo}
                        onChange={handleChange}
                        placeholder="Select person"
                        required={true}
                        isMulti={true}
                        menuPlacement="top"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-slate-700">Forward to</span>
                    <span className="text-[13px] font-bold text-slate-900">{formData.selectedReportingTo || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-white text-slate-600 uppercase tracking-wider border border-slate-200 shadow-sm flex-shrink-0 hidden sm:block">
              {roleLabel}
            </span>
          </div>

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
