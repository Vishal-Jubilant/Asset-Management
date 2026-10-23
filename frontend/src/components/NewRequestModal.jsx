import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Plus, Package, Paperclip, User, Shield,
  ChevronDown, CheckCircle2, Lock, Building2,
  UserCheck, AlertTriangle, Trash2, Crown, PlusCircle, Check, ArrowRight, Send
} from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';
import api from '../utils/api';

/* ─── Helpers ─────────────────────────────────────────────── */
const isHead = (u) =>
  u?.status !== 'Inactive' &&
  ((u?.role && u.role.toLowerCase() === 'head') ||
    (u?.departmentRole && u.departmentRole.toLowerCase() === 'head'));

const isMD = (u) =>
  u?.status !== 'Inactive' &&
  ((u?.role && u.role.toLowerCase() === 'md') ||
    (u?.departmentRole && u.departmentRole.toLowerCase() === 'md') ||
    (u?.empCode && u.empCode.toLowerCase() === 'md') ||
    (u?.name && u.name.toLowerCase() === 'managing director'));

const isSameApprover = (a, b) => {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return (a.name || '').toLowerCase().trim() === (b.name || '').toLowerCase().trim();
};

/* ─── Main Modal ──────────────────────────────────────────── */
const NewRequestModal = ({ isOpen, onClose, onAdd, editRequest = null }) => {
  const { currentUser, categories, users } = useContext(AppContext);
  const isWorkflowLocked = Boolean(
    editRequest?.approvalSequence?.length &&
    editRequest.commentsHistory?.some(comment => comment.action === 'return')
  );
  const latestReturnCommentIndex = editRequest?.commentsHistory
    ?.map(comment => comment.action)
    .lastIndexOf('return') ?? -1;
  const latestReturnComment = latestReturnCommentIndex >= 0
    ? editRequest?.commentsHistory?.[latestReturnCommentIndex]
    : null;
  const canReplyToReturn = isWorkflowLocked &&
    editRequest?.status === 'Returned' &&
    String(currentUser?.id) === String(editRequest?.requestedBy);

  /* User context helpers */
  /* Approver data from backend */
  const [approverData, setApproverData] = useState(null);
  const [loadingApprovers, setLoadingApprovers] = useState(false);

  /* Selected workflow approvers state: ordered array of [{ id, name, department, role, departmentRole, empCode, isDefault }] */
  const [workflow, setWorkflow] = useState([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const workflowButtonRef = useRef(null);
  const workflowDropdownRef = useRef(null);

  /* Form state */
  const [formData, setFormData] = useState({
    assetType: '',
    otherAssetType: '',
    description: '',
    justification: '',
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnReply, setReturnReply] = useState('');
  const fileInputRef = useRef(null);

  const dropdownDirectionRef = useRef('up');

  const updateDropdownPosition = (isInitial = false) => {
    if (!workflowButtonRef.current) return;
    const rect = workflowButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 20;
    const spaceAbove = rect.top - 20;

    // Lock direction when initially opening; never flip direction while user is clicking items!
    if (isInitial || !dropdownDirectionRef.current) {
      const openUpward = spaceAbove >= 180 || spaceAbove > spaceBelow;
      dropdownDirectionRef.current = openUpward ? 'up' : 'down';
    }

    const isUp = dropdownDirectionRef.current === 'up';
    const availableSpace = isUp ? spaceAbove : spaceBelow;
    const maxAvailableHeight = Math.min(260, Math.max(140, availableSpace));

    setMenuStyle({
      position: 'fixed',
      width: rect.width,
      left: rect.left,
      zIndex: 99999,
      maxHeight: `${maxAvailableHeight}px`,
      ...(isUp
        ? { bottom: window.innerHeight - rect.top + 6, top: 'auto' }
        : { top: rect.bottom + 6, bottom: 'auto' }),
    });
  };

  const handleToggleDropdown = () => {
    if (!isDeptDropdownOpen) {
      updateDropdownPosition(true);
    }
    setIsDeptDropdownOpen(prev => !prev);
  };

  // Re-position when workflow items change or window changes without flipping direction
  useEffect(() => {
    if (isDeptDropdownOpen) {
      updateDropdownPosition(false);
      const timer = setTimeout(() => updateDropdownPosition(false), 320);
      return () => clearTimeout(timer);
    }
  }, [workflow.length, isDeptDropdownOpen]);

  // Close department dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        workflowButtonRef.current &&
        !workflowButtonRef.current.contains(e.target) &&
        workflowDropdownRef.current &&
        !workflowDropdownRef.current.contains(e.target)
      ) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on scroll or resize so portal menu does not drift
  useEffect(() => {
    if (!isDeptDropdownOpen) return;
    const close = () => setIsDeptDropdownOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isDeptDropdownOpen]);

  /* Fetch approvers from backend on open */
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset';
      return;
    }
    document.body.style.overflow = 'hidden';
    setValidationError('');
    setIsDeptDropdownOpen(false);

    const loadApprovers = async () => {
      setLoadingApprovers(true);
      try {
        const res = await api.get('/approvers');
        setApproverData(res.data);
      } catch (e) {
        console.error('Failed to load approvers', e);
      } finally {
        setLoadingApprovers(false);
      }
    };

    loadApprovers();

    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  /* Derived all eligible approvers and default head */
  const allEligibleApprovers = useMemo(() => {
    let list = [];
    if (approverData?.allApprovers && approverData.allApprovers.length > 0) {
      list = approverData.allApprovers;
    } else {
      list = (users || []).filter(u => isHead(u) || isMD(u)).map(u => ({
        id: u.id,
        name: u.name,
        department: u.department || (isMD(u) ? 'Management' : 'General'),
        role: isMD(u) ? 'MD' : 'Head',
        departmentRole: u.departmentRole,
        empCode: u.empCode
      }));
    }

    const currentUserDept = (currentUser?.department || '').trim().toLowerCase();
    const departmentUsers = (users || [])
      .filter(u =>
        u?.status !== 'Inactive' &&
        currentUserDept &&
        (u.department || '').trim().toLowerCase() === currentUserDept &&
        !isHead(u) && !isMD(u) &&
        (u.role || '').toLowerCase() !== 'admin'
      )
      .map(u => ({
        id: u.id,
        name: u.name,
        department: u.department,
        role: (u.role || u.departmentRole || 'User').replace(/^\w/, role => role.toUpperCase()),
        departmentRole: u.departmentRole,
        empCode: u.empCode
      }));
    list = [...list, ...departmentUsers];

    // Exclude requester from eligible approvers (cannot approve own request)
    // Strictly match by ID if IDs exist, so that an MD sharing the same username as a regular user (e.g. JC0033 User vs JC0033 MD) is NOT erroneously excluded
    const filtered = list.filter(u => {
      if (!u) return false;
      if (currentUser?.id && u.id) {
        return u.id !== currentUser.id;
      }
      const sameName = (u.name || '').toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim();
      const sameRole = (u.role || '').toLowerCase().trim() === (currentUser?.role || '').toLowerCase().trim();
      return !(sameName && sameRole);
    });

    const reportingList = Array.isArray(currentUser?.reportingTo)
      ? currentUser.reportingTo
      : (currentUser?.reportingTo ? [currentUser.reportingTo] : []);

    const isRequesterUser = !isHead(currentUser) && !isMD(currentUser) && (currentUser?.role || '').toLowerCase() !== 'admin';

    const currentDeptHeads = [];
    const currentDeptUsers = [];
    const otherDeptHeads = [];
    const mdApprovers = [];

    filtered.forEach(u => {
      const uIsHead = isHead(u) || (u.role || '').toLowerCase() === 'head' || (u.departmentRole || '').toLowerCase() === 'head';
      const uIsMD = isMD(u) || (u.role || '').toUpperCase() === 'MD' || (u.departmentRole || '').toUpperCase() === 'MD';
      const uDept = (u.department || '').trim().toLowerCase();

      if (uIsMD) {
        mdApprovers.push(u);
      } else if (uIsHead) {
        if (currentUserDept && uDept === currentUserDept) {
          // If head matches direct reportingTo, prioritize at the absolute top
          const isDirectReport = reportingList.some(r => String(r || '').toLowerCase().trim() === (u.name || '').toLowerCase().trim());
          if (isDirectReport) {
            currentDeptHeads.unshift(u);
          } else {
            currentDeptHeads.push(u);
          }
        } else {
          otherDeptHeads.push(u);
        }
      } else if (currentUserDept && uDept === currentUserDept && (u.role || '').toLowerCase() !== 'admin') {
        currentDeptUsers.push(u);
      }
    });

    // Make sure default department head is placed at the absolute top (index 0) of currentDeptHeads
    if (currentDeptHeads.length > 1 && reportingList.length > 0) {
      const repIdx = currentDeptHeads.findIndex(h =>
        reportingList.some(r => String(r || '').toLowerCase().trim() === (h?.name || '').toLowerCase().trim())
      );
      if (repIdx > 0) {
        const [rep] = currentDeptHeads.splice(repIdx, 1);
        currentDeptHeads.unshift(rep);
      }
    }

    if (isRequesterUser) {
      // Default department Head, own-department employees, other Heads, then MDs.
      return [...currentDeptHeads, ...currentDeptUsers, ...otherDeptHeads, ...mdApprovers];
    }

    const isRequesterHead = isHead(currentUser);
    if (isRequesterHead) {
      // Department Head requests start with eligible people from their own department.
      return [...currentDeptHeads, ...currentDeptUsers, ...otherDeptHeads, ...mdApprovers];
    }

    // Default order for any other role
    return [...currentDeptHeads, ...otherDeptHeads, ...mdApprovers];
  }, [approverData, users, currentUser]);

  const defaultHead = useMemo(() => {
    const isCurrentHead = isHead(currentUser);
    const uDept = (currentUser?.department || '').trim().toLowerCase();
    if (isCurrentHead || !uDept) return null;

    // Check if user has reportingTo matching an active head
    const reportingList = Array.isArray(currentUser?.reportingTo)
      ? currentUser.reportingTo
      : (currentUser?.reportingTo ? [currentUser.reportingTo] : []);

    if (reportingList.length > 0) {
      const match = allEligibleApprovers.find(h =>
        isHead(h) &&
        reportingList.some(r => String(r || '').toLowerCase().trim() === (h?.name || '').toLowerCase().trim())
      );
      if (match) return match;
    }

    // First active head of requester's department
    return allEligibleApprovers.find(h =>
      isHead(h) &&
      (h?.department || '').trim().toLowerCase() === uDept
    ) || null;
  }, [allEligibleApprovers, currentUser]);

  const isApproverSameAsDefault = (approver) => {
    if (!defaultHead || !approver) return false;
    if (approver.id && defaultHead.id) {
      return approver.id === defaultHead.id;
    }
    return (approver.name || '').toLowerCase().trim() === (defaultHead.name || '').toLowerCase().trim();
  };

  /* Build workflow whenever modal opens or defaultHead / editRequest changes */
  useEffect(() => {
    if (!isOpen) return;

    if (editRequest) {
      // Re-build sequence from editRequest
      if (editRequest.approvalSequence && editRequest.approvalSequence.length > 0) {
        const reconstructed = [];
        editRequest.approvalSequence.forEach((step, sIdx) => {
          const approverName = Array.isArray(step?.approvers) && step.approvers.length > 0
            ? step.approvers[0]
            : (step?.name || '');
          const cleanName = String(approverName || '').trim().toLowerCase();
          const stepDepartment = (step?.department || '').toLowerCase().trim();
          const stepRole = (step?.role || '').toLowerCase().trim();
          const match = allEligibleApprovers.find(u =>
            (u?.name || '').toLowerCase().trim() === cleanName &&
            (!stepDepartment || (u?.department || '').toLowerCase().trim() === stepDepartment) &&
            (!stepRole || (stepRole === 'md' ? isMD(u) : isHead(u)))
          );
          const isThisDefault = defaultHead && (
            (match && match.id === defaultHead.id) ||
            cleanName === (defaultHead.name || '').toLowerCase().trim()
          );

          if (match) {
            reconstructed.push({
              ...match,
              isDefault: Boolean(isThisDefault)
            });
          } else if (approverName) {
            reconstructed.push({
              id: `custom-${sIdx}`,
              name: approverName,
              department: step?.department || (step?.role === 'MD' ? 'Management' : 'General'),
              role: step?.role || 'Head',
              isDefault: Boolean(isThisDefault)
            });
          }
        });

        // Ensure the default department head remains in the workflow.
        if (!isWorkflowLocked && defaultHead && !reconstructed.some(a => (a?.name || '').toLowerCase().trim() === (defaultHead.name || '').toLowerCase().trim())) {
          reconstructed.push({ ...defaultHead, isDefault: true });
        }

        setWorkflow(reconstructed);
        return;
      }
    }

    // Fresh request: preselect the locked default department head.
    if (defaultHead) {
      setWorkflow([{ ...defaultHead, isDefault: true }]);
    } else {
      setWorkflow([]);
    }
  }, [isOpen, defaultHead, allEligibleApprovers, editRequest]);

  /* Reset form on open */
  useEffect(() => {
    if (!isOpen) return;
    if (editRequest) {
      setFormData({
        assetType: categories.some(c => c.value === editRequest.category) ? editRequest.category : 'Other',
        otherAssetType: categories.some(c => c.value === editRequest.category) ? '' : editRequest.category,
        description: editRequest.item || '',
        justification: editRequest.justification || '',
      });
    } else {
      setFormData({ assetType: '', otherAssetType: '', description: '', justification: '' });
    }
    setAttachedFiles([]);
    setFileError('');
    setValidationError('');
    setReturnReply('');
  }, [isOpen, editRequest, categories]);

  // Group workflow into rows of up to 4 items each (4 selectors per row)
  const workflowRows = useMemo(() => {
    const rows = [];
    const chunkSize = 4;
    for (let i = 0; i < workflow.length; i += chunkSize) {
      rows.push(workflow.slice(i, i + chunkSize));
    }
    return rows;
  }, [workflow]);

  if (!isOpen) return null;

  const handleToggleApprover = (approver) => {
    if (!approver || isWorkflowLocked) return;
    // Default department head cannot be deselected or removed
    if (isApproverSameAsDefault(approver)) {
      return;
    }

    setWorkflow(prev => {
      const existsIndex = prev.findIndex(a => isSameApprover(a, approver));

      if (existsIndex !== -1) {
        // Deselect: remove from workflow and recalculate sequence numbers without gaps
        return prev.filter((a, idx) => idx !== existsIndex || a.isDefault);
      } else {
        // Same-department users go before the locked default head in the sequence.
        const isSameDepartmentUser =
          !isHead(approver) &&
          !isMD(approver) &&
          (approver.department || '').trim().toLowerCase() ===
            (currentUser?.department || '').trim().toLowerCase();
        const defaultHeadIndex = prev.findIndex(a => isApproverSameAsDefault(a));
        if (isSameDepartmentUser && defaultHeadIndex !== -1) {
          return [
            ...prev.slice(0, defaultHeadIndex),
            { ...approver, isDefault: false },
            ...prev.slice(defaultHeadIndex)
          ];
        }

        // Other approvers retain selection order.
        return [...prev, { ...approver, isDefault: false }];
      }
    });
  };

  const handleRemoveApprover = (approver) => {
    if (!approver || isWorkflowLocked) return;
    // Default department head cannot be removed
    if (approver.isDefault || isApproverSameAsDefault(approver)) {
      return;
    }

    setWorkflow(prev => prev.filter(a => a.isDefault || !isSameApprover(a, approver)));
  };

  /* ── File handling ── */
  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFileError('');
    let hasError = false;
    const validFiles = [];
    newFiles.forEach(f => {
      if (f.size > 10 * 1024 * 1024) hasError = true;
      else validFiles.push(f);
    });
    if (hasError) setFileError('One or more files exceed the 10MB limit and were skipped.');
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (['description', 'justification', 'otherAssetType'].includes(name) && v.length > 0) {
      v = v.charAt(0).toUpperCase() + v.slice(1);
    }
    setFormData(prev => ({ ...prev, [name]: v }));
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setIsSubmitting(true);

    if (canReplyToReturn && returnReply.trim()) {
      try {
        await onAdd({ replyOnly: true, returnReply: returnReply.trim() });
        onClose();
      } catch (err) {
        console.error('Error sending return reply', err);
        const serverMessage = err.response?.data?.detail;
        setValidationError(typeof serverMessage === 'string' ? serverMessage : 'Failed to send reply. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (workflow.length === 0) {
      setValidationError('Please select at least one approver in the workflow.');
      setIsSubmitting(false);
      return;
    }

    if (!isWorkflowLocked && defaultHead && !workflow.some(a => a.isDefault || (a?.name || '').toLowerCase().trim() === (defaultHead.name || '').toLowerCase().trim())) {
      setValidationError('Your default department head must remain in the workflow.');
      setIsSubmitting(false);
      return;
    }

    // Build the formatted approvalSequence preserving exact selection order
    const formattedSequence = workflow.map((a, idx) => ({
      step: idx + 1,
      id: a.id,
      approverId: a.id,
      role: a.role || 'Head',
      department: a.department || null,
      approvers: [a.name],
      status: idx === 0 ? 'pending' : 'waiting'
    }));

    const approverNames = workflow.map(a => a.name);

    // Convert files
    const filePromises = attachedFiles.map(file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
    );

    try {
      const base64Files = await Promise.all(filePromises);

      if (onAdd) {
        await onAdd({
          ...formData,
          approvalSequence: formattedSequence,
          selectedReportingTo: approverNames,
          selectedReportingRole: formattedSequence[0]?.role || 'Head',
          attachments: base64Files,
          returnReply: canReplyToReturn ? returnReply.trim() : ''
        });
      }
      onClose();
    } catch (err) {
      console.error('Error submitting request', err);
      const serverMessage = err.response?.data?.detail;
      setValidationError(typeof serverMessage === 'string' ? serverMessage : 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div
          className="bg-white rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.18)] w-full max-w-[580px] border border-slate-100 flex flex-col overflow-hidden"
          style={{ height: 'min(700px, 92vh)' }}
        >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
                {editRequest ? 'Edit Request' : 'New Asset Request'}
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {editRequest ? 'Update and resubmit your request.' : 'Submit a request with approval workflow.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">

          <form id="new-request-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Requester (Left) & Category (Right) split equally in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Requester */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-slate-700">
                  Requester
                </label>
                <div className="flex items-center gap-2.5 px-3.5 h-[46px] bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0 ring-1 ring-brand-200">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-slate-800 capitalize truncate block">
                      {currentUser?.name || 'User'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 border border-brand-100 flex-shrink-0">
                    Requester
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-slate-700">
                  Category <span className="text-red-500 ml-0.5">*</span>
                </label>
                <CustomSelect
                  name="assetType"
                  options={categories}
                  value={formData.assetType}
                  onChange={handleChange}
                  placeholder="Select category..."
                  required={true}
                />
                {formData.assetType === 'Other' && (
                  <input
                    type="text"
                    name="otherAssetType"
                    value={formData.otherAssetType}
                    onChange={handleChange}
                    placeholder="Specify category..."
                    required
                    className="w-full px-3.5 py-2.5 mt-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-[13px] shadow-sm transition-all placeholder:text-slate-400"
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
                className="w-full px-3.5 h-[46px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-[13px] shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Description / Justification */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-slate-700">
                  Description <span className="text-red-500 ml-0.5">*</span>
                </label>
                <span className={`text-[11px] font-medium tabular-nums ${formData.justification.length > 900 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {formData.justification.length}/1000
                </span>
              </div>
              <textarea
                rows={3}
                name="justification"
                placeholder="Provide a brief business justification..."
                value={formData.justification}
                onChange={handleChange}
                required
                maxLength={1000}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-[13px] resize-none shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-slate-700">
                Attachments <span className="text-slate-400 font-normal ml-1">Optional</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 bg-white rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all group shadow-sm"
              >
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200 group-hover:border-brand-200 flex items-center justify-center shadow-sm transition-colors">
                  <Paperclip size={14} className="text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-700 group-hover:text-brand-700 transition-colors">Attach files or screenshots</p>
                  <p className="text-[11px] text-slate-400">Up to 10MB per file</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
              {fileError && <p className="text-xs text-rose-500 font-medium">{fileError}</p>}
              {attachedFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
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

            {/* Approval Workflow Dropdown (Below Attachments) */}
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                  Approval Workflow <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isWorkflowLocked ? 'Original workflow locked for resubmission' : defaultHead ? 'Own department head selected by default' : 'Select approvers'}
                </span>
              </div>

              {/* Main Selector Box with Ordered Steps (1, 2, 3 simple chips) */}
              <div
                ref={workflowButtonRef}
                onClick={() => !isWorkflowLocked && handleToggleDropdown()}
                aria-disabled={isWorkflowLocked}
                className={`relative w-full ${isWorkflowLocked ? 'cursor-not-allowed' : 'cursor-pointer'} text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 flex items-center justify-between min-h-[46px] bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-3.5 pr-10 text-[13px] shadow-sm ${
                  isDeptDropdownOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''
                }`}
              >
                {workflow.length === 0 ? (
                  <span className="text-slate-400 text-[13px]">
                    {loadingApprovers ? 'Loading approvers...' : 'Select approvers...'}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {workflow.map((item, idx) => {
                      const stepNum = idx + 1;
                      const isDefault = item.isDefault || isApproverSameAsDefault(item);

                      return (
                        <span
                          key={item.id || `${item.name}-${idx}`}
                          className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-brand-100"
                        >
                          <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {stepNum}
                          </span>
                          <span className="truncate max-w-[140px]">{item.name}</span>
                          {isDefault || isWorkflowLocked ? (
                            <Lock size={11} className="text-brand-600 flex-shrink-0" title="Default Approver (Locked)" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveApprover(item);
                              }}
                              className="hover:bg-brand-200/50 p-0.5 rounded-full transition-colors ml-0.5 text-brand-500 hover:text-rose-600"
                              title="Remove approver"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown chevron on the right */}
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {isWorkflowLocked ? (
                    <Lock size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isDeptDropdownOpen ? 'rotate-180 text-brand-500' : ''
                      }`}
                    />
                  )}
                </span>
              </div>

              {/* Horizontal Sequence Flowchart with Arrows (Step 1 -> Step 2 -> Step 3) */}
              {workflow.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-600 font-bold">
                      <Shield size={12} className="text-brand-600" />
                      Approval Status Flow
                    </span>
                    <span className="text-slate-400 font-normal">
                      {workflow.length} step{workflow.length !== 1 ? 's' : ''} in sequence
                    </span>
                  </div>

                  {/* Flow Steps with Arrows (Up to 4 selectors per row; wraps to next row if > 4) */}
                  <div className="space-y-2">
                    {workflowRows.map((row, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex items-center flex-wrap gap-2 pt-0.5"
                      >
                        {rIdx > 0 && (
                          <span className="text-slate-400 font-bold text-xs select-none pr-1 flex-shrink-0" title="Next row in sequence">
                            ↳
                          </span>
                        )}
                        {row.map((item, itemIdx) => {
                          const globalIdx = rIdx * 4 + itemIdx;
                          const stepNum = globalIdx + 1;
                          const isDefault = item.isDefault || isApproverSameAsDefault(item);
                          const isFinal = globalIdx === workflow.length - 1;

                          return (
                            <React.Fragment key={item.id || `${item.name}-${globalIdx}`}>
                              {itemIdx > 0 && (
                                <span className="text-slate-400 font-bold text-xs select-none px-0.5 flex-shrink-0">
                                  →
                                </span>
                              )}
                              <div
                                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all shadow-xs flex-shrink-0 ${
                                  isDefault
                                    ? 'bg-brand-50/80 text-brand-900 border-brand-200'
                                    : isFinal
                                      ? 'bg-amber-50/80 text-amber-900 border-amber-200'
                                      : 'bg-white text-slate-800 border-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                                    isDefault ? 'bg-brand-600' : isFinal ? 'bg-amber-600' : 'bg-slate-700'
                                  }`}
                                >
                                  {stepNum}
                                </span>
                                <div className="flex flex-col min-w-0 leading-tight">
                                  <span className="font-semibold text-slate-900 whitespace-nowrap">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                    {item.role === 'MD' ? 'MD' : `${item.department || 'General'} ${item.role || 'Head'}`}
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Previous Comments on edit */}
            {editRequest?.commentsHistory?.length > 0 && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-[12px] font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  Approval Workflow Comments
                </h3>
                <div className="space-y-3">
                  {[...editRequest.commentsHistory].reverse().map((c, i) => {
                    const historyIndex = editRequest.commentsHistory.length - i - 1;
                    const isReplyTarget = canReplyToReturn && historyIndex === latestReturnCommentIndex;
                    return (
                      <div key={historyIndex} className={`p-3 rounded-lg border ${c.action === 'return' ? 'bg-amber-50/50 border-amber-100' : c.action === 'reject' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 text-[12px]">{historyIndex + 1}. {c.name} <span className="text-slate-500 font-normal ml-1">({c.role})</span></span>
                          <span className="text-slate-400 font-medium text-[10px]">{new Date(c.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <p className="text-slate-700 text-[13px]">{c.comment || 'No comment provided.'}</p>
                        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider">
                          <span className={c.action === 'approve' ? 'text-emerald-600' : c.action === 'reject' ? 'text-rose-600' : 'text-amber-600'}>
                            {c.action === 'approve' ? 'Approved' : c.action === 'reject' ? 'Declined' : c.action === 'return' ? 'Returned' : 'Responded'}
                          </span>
                        </div>
                        {c.replies?.map((reply, replyIndex) => (
                          <div key={replyIndex} className="mt-2 ml-4 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 text-[11px]">{reply.name} <span className="text-slate-500 font-normal ml-1">({reply.role})</span></span>
                              <span className="text-slate-400 text-[10px]">{new Date(reply.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <p className="text-slate-700 text-[12px]"><span className="font-semibold text-slate-500">Reply Comment:</span> {reply.comment}</p>
                          </div>
                        ))}
                        {isReplyTarget && (
                          <div className="mt-3 border-t border-amber-100 pt-3">
                            <textarea
                              value={returnReply}
                              onChange={event => setReturnReply(event.target.value)}
                              maxLength={1000}
                              rows={2}
                              placeholder="Write a reply to this return..."
                              aria-label="Reply to returned request"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                            />
                            <div className="mt-1 text-right text-[10px] text-slate-400">{returnReply.length}/1000</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {validationError && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
              <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
              <p className="text-[12px] text-rose-600 font-medium">{validationError}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
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
              disabled={isSubmitting || loadingApprovers}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-green-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-600/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : canReplyToReturn && returnReply.trim() ? (
                <Send size={16} className="text-brand-100" />
              ) : (
                <Plus size={16} className="text-brand-100" />
              )}
              {canReplyToReturn && returnReply.trim()
                ? 'Send Reply'
                : editRequest ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Dropdown Menu Portal (Category style as in Image 2) */}
      {isDeptDropdownOpen && !isWorkflowLocked && ReactDOM.createPortal(
        <div
          ref={workflowDropdownRef}
          style={menuStyle}
          className="max-h-60 overflow-auto rounded-xl bg-white py-1 text-sm shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
        >
          <ul className="flex flex-col">
            {loadingApprovers ? (
              <li className="py-2.5 px-3.5 text-slate-400 text-sm">
                Loading approvers...
              </li>
            ) : allEligibleApprovers.length === 0 ? (
              <li className="py-2.5 px-3.5 text-slate-400 text-sm">
                No eligible approvers available
              </li>
            ) : (
              allEligibleApprovers.map((approver) => {
                const isUserDefaultHead = Boolean(isApproverSameAsDefault(approver));
                const selectedIndex = workflow.findIndex(s => isSameApprover(s, approver));
                const isSelected = selectedIndex !== -1;
                const stepNumber = isSelected ? selectedIndex + 1 : null;
                const approverRoleLabel = approver.role === 'MD'
                  ? 'MD'
                  : `${approver.department || 'General'} ${approver.role || 'Head'}`;

                return (
                  <li
                    key={approver.id || approver.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isUserDefaultHead) {
                        handleToggleApprover(approver);
                      }
                    }}
                    className={`relative select-none py-2.5 pl-3.5 pr-12 transition-all text-sm mx-1 my-0.5 rounded-lg flex items-center justify-between ${
                      isUserDefaultHead
                        ? 'bg-brand-50/60 text-brand-800 font-medium cursor-not-allowed'
                        : isSelected
                          ? 'bg-brand-50/80 text-brand-700 font-medium cursor-pointer'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="truncate">{approver.name}</span>
                      <span className="text-xs text-slate-400 font-normal flex-shrink-0">
                        ({approverRoleLabel})
                      </span>
                      {isUserDefaultHead && (
                        <span className="text-[10px] text-brand-600 bg-brand-100/70 border border-brand-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1 font-semibold flex-shrink-0">
                          <Lock size={10} /> Default{isSelected ? ` (Step ${stepNumber})` : ''}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-brand-600 gap-1 font-semibold text-xs">
                        <span>{stepNumber}</span>
                        <Check size={16} />
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
};

export default NewRequestModal;
