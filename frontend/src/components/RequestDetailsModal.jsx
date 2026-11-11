import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, Check, CornerUpLeft, Clock, XCircle, RotateCcw, 
  User, Hash, Eye, AlertCircle, Paperclip, Download, Shield,
  ArrowRight, Send, ChevronDown, Lock, Plus, FastForward, FileText, ExternalLink
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';
import api from '../utils/api';

// Helper components for design system
const Label = ({ children, className = '' }) => (
  <span className={`block text-[10px] sm:text-[11px] md:text-xs font-semibold tracking-[0.05em] uppercase text-slate-500 mb-1 sm:mb-1.5 ${className}`}>
    {children}
  </span>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const formatReturnRecipient = (recipient, users) => {
  const recipientName = typeof recipient === 'object'
    ? recipient.value || recipient.label || ''
    : String(recipient || '');
  const recipientUser = users.find(user => user.name?.toLowerCase().trim() === recipientName.toLowerCase().trim());

  if (!recipientUser) return recipientName;

  const roles = [recipientUser.role, recipientUser.departmentRole]
    .filter(Boolean)
    .map(role => role.toLowerCase());
  const roleLabel = roles.includes('md') ? 'MD' :
                    roles.includes('admin') ? 'Admin' :
                    roles.includes('head') ? 'Head' : 'User';
  const departmentRole = roleLabel === 'MD'
    ? 'MD'
    : `${recipientUser.department ? `${recipientUser.department} ` : ''}${roleLabel}`;

  return `${recipientUser.name} - ${departmentRole}`;
};

const isPdfAttachment = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = (file.data || '').toLowerCase();
  return name.endsWith('.pdf') || type.includes('pdf') || data.startsWith('data:application/pdf');
};

const getAttachmentBlobUrl = (file) => {
  if (!file?.data) return null;
  if (file.data.startsWith('blob:') || file.data.startsWith('http://') || file.data.startsWith('https://')) {
    return file.data;
  }
  try {
    const isPdf = isPdfAttachment(file);
    const defaultMime = isPdf ? 'application/pdf' : 'image/png';
    let mime = defaultMime;
    let base64String = file.data;
    if (file.data.includes(',')) {
      const parts = file.data.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match && match[1]) {
        mime = match[1];
      }
      base64String = parts[1];
    }
    base64String = base64String.replace(/\s/g, '');
    const byteCharacters = atob(base64String);
    const sliceSize = 1024;
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to create blob URL for attachment:', err);
    return file.data;
  }
};

const RequestDetailsModal = ({ isOpen, onClose, request, onAction }) => {
  const { users, currentUser, roles } = useContext(AppContext);
  const [newComment, setNewComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnTarget, setReturnTarget] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState([]);
  const [selectedReportingRole, setSelectedReportingRole] = useState('');
  const [validationError, setValidationError] = useState('');
  const [returnReply, setReturnReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isWorkflowMenuOpen, setIsWorkflowMenuOpen] = useState(false);
  const [selectedWorkflowApprovers, setSelectedWorkflowApprovers] = useState([]);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const workflowScrollerRef = useRef(null);
  const workflowMenuRef = useRef(null);

  const handleViewAttachment = (file) => {
    const blobUrl = getAttachmentBlobUrl(file);
    const isPdf = isPdfAttachment(file);
    setPreviewAttachment({
      file,
      blobUrl,
      isPdf
    });
  };

  const handleOpenInNewTab = (file) => {
    const blobUrl = getAttachmentBlobUrl(file);
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownloadAttachment = (file) => {
    try {
      const isPdf = isPdfAttachment(file);
      const blobUrl = getAttachmentBlobUrl(file);
      const targetUrl = blobUrl || file.data;
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = file.name || (isPdf ? 'document.pdf' : 'attachment');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download attachment:', err);
    }
  };

  const closePreviewAttachment = () => {
    if (previewAttachment?.blobUrl && previewAttachment.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewAttachment.blobUrl);
    }
    setPreviewAttachment(null);
  };
  
  useEffect(() => {
    if (isOpen && request) {
      setNewComment('');
      setIsApproving(false);
      setIsReturning(false);
      setReturnTarget('');
      setSelectedApprovers([]);
      setSelectedReportingRole('');
      setValidationError('');
      setReturnReply('');
      setIsSendingReply(false);
      setIsDownloadingPdf(false);
      setIsWorkflowMenuOpen(false);
      setSelectedWorkflowApprovers([]);
      setPreviewAttachment(null);
    }
  }, [isOpen, request]);
  
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
    if (isOpen && workflowScrollerRef.current) {
      workflowScrollerRef.current.scrollLeft = 0;
    }
  }, [
    isOpen,
    request?.id,
    request?.currentStep,
    request?.approvalSequence?.length
  ]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (workflowMenuRef.current && !workflowMenuRef.current.contains(event.target)) {
        setIsWorkflowMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);
  
  if (!isOpen || !request) return null;

  const requester = users.find(u => u.id === request.requestedBy);
  const requesterRole = requester?.role?.toLowerCase() === 'md' || requester?.departmentRole?.toLowerCase() === 'md'
    ? 'MD'
    : requester?.role?.toLowerCase() === 'head' || requester?.departmentRole?.toLowerCase() === 'head'
      ? 'Head'
      : 'User';
  const requesterDepartmentRole = `${requester?.department ? `${requester.department} ` : ''}${requesterRole}`;
  const roleName = requester?.role === 'md' ? 'MD' : (requester?.role ? requester.role.charAt(0).toUpperCase() + requester.role.slice(1).toLowerCase() : 'Unknown');
  const myRole = currentUser?.role === 'md' ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
  const isMD = currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md' || myRole === 'MD';
  
  const currentUserId = String(currentUser?.id ?? '');
  const isHandled = (request.handledBy || []).some(id => String(id) === currentUserId);
  const isRequester = String(request.requestedBy) === currentUserId;
  const hasVoted = Boolean(request.votes?.[currentUserId]);

  const isOverallApproved = Boolean(request.status === 'Approved' || request.status?.toLowerCase() === 'approved');
  const isOverallRejected = Boolean(request.status === 'Rejected' || request.status?.toLowerCase() === 'rejected');
  const isFinalDecision = isOverallApproved || isOverallRejected;

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !request?.id) return;
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/asset-requests/${request.id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${request.id}_Details.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isForwardedToMe = (() => {
    if (request.forwardedTo && request.forwardedTo.length > 0) {
      return (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
    }
    return false;
  })();
  const activeStepApprovers = request.approvalSequence?.[(request.currentStep || 1) - 1]?.approvers || [];
  const isCurrentStepRecipient = activeStepApprovers.some(approver => {
    const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
    return name?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
  });

  const isApprover = (() => {
    if (!request.status || !request.status.includes('Pending')) return false;
    if (isRequester) return false;
    if (isHandled || hasVoted) return false;
    // 1. If approval sequence exists, authorization strictly belongs to active step
    if (request.approvalSequence && request.approvalSequence.length > 0) {
      const curStepIdx = (request.currentStep || 1) - 1;
      const curStep = request.approvalSequence[curStepIdx];
      if (!curStep) return false;

      // If this step is already completed
      if (curStep.status === 'approved' || curStep.status === 'rejected') return false;

      // If this step is for MD and current user is MD
      if (curStep.role?.toLowerCase() === 'md' && isMD) {
        return true;
      }

      // Check if current user's name matches any approver for this active step
      const stepApprovers = curStep.approvers || [];
      return stepApprovers.some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
    }

    // 2. If forwardedTo is explicitly specified
    if (request.forwardedTo && (Array.isArray(request.forwardedTo) ? request.forwardedTo.length > 0 : true)) {
      if (isForwardedToMe) return true;
      if (request.status === 'Pending with MD' && isMD) return true;
      return false; // Directed to someone else
    }

    // 3. Fallback only if no sequence and no forwardedTo (legacy fallback)
    return request.status === `Pending with ${myRole}`;
  })();

  const showActions = isApprover && !hasVoted && !isHandled && !isRequester;
  const canAddWorkflowHead = Boolean(
    request.status?.includes('Pending') &&
    !isRequester &&
    !hasVoted &&
    !isHandled &&
    isApprover
  );
  const workflowHeadNames = new Set(
    (request.approvalSequence || []).flatMap(step => (step.approvers || []).map(approver => {
      const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
      return name.trim().toLowerCase();
    }))
  );
  const isManagingDirector = (user) =>
    user?.role?.toLowerCase() === 'md' ||
    user?.departmentRole?.toLowerCase() === 'md' ||
    user?.empCode?.toLowerCase() === 'md' ||
    user?.name?.toLowerCase() === 'managing director';
  const workflowHeads = users.filter(user => {
    const role = `${user.role || ''} ${user.departmentRole || ''}`.toLowerCase();
    return user.status !== 'Inactive' && (role.includes('head') || isManagingDirector(user));
  });
  const availableWorkflowHeads = workflowHeads.filter(head =>
    !workflowHeadNames.has(head.name.trim().toLowerCase()) &&
    String(head.id) !== currentUserId
  );
  const workflowSequenceNames = (request.approvalSequence || []).flatMap(step =>
    (step.approvers || []).map(approver => {
      const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
      return name.trim().toLowerCase();
    })
  );
  const queuedWorkflowNames = selectedWorkflowApprovers.map(item => item.name.trim().toLowerCase());
  const orderedSelectedWorkflowApprovers = [...selectedWorkflowApprovers].sort((a, b) => {
    const aUser = workflowHeads.find(user => String(user.id) === String(a.id));
    const bUser = workflowHeads.find(user => String(user.id) === String(b.id));
    return Number(isManagingDirector(aUser)) - Number(isManagingDirector(bUser));
  });
  const workflowHeadDisplayOrder = [...workflowHeads].sort((a, b) => {
    const aName = a.name.trim().toLowerCase();
    const bName = b.name.trim().toLowerCase();
    const isSameDepartment = (head) =>
      head.department && currentUser?.department &&
      head.department.trim().toLowerCase() === currentUser.department.trim().toLowerCase();
    const aIsSameDepartment = isSameDepartment(a);
    const bIsSameDepartment = isSameDepartment(b);
    const aIsSelected = workflowHeadNames.has(aName) || queuedWorkflowNames.includes(aName);
    const bIsSelected = workflowHeadNames.has(bName) || queuedWorkflowNames.includes(bName);
    const aIsMD = isManagingDirector(a);
    const bIsMD = isManagingDirector(b);

    const getGroup = (isSameDept, isSelected, isMD) =>
      isMD ? 3 : isSameDept ? 0 : isSelected ? 1 : 2;
    const groupDifference = getGroup(aIsSameDepartment, aIsSelected, aIsMD) -
      getGroup(bIsSameDepartment, bIsSelected, bIsMD);
    if (groupDifference !== 0) return groupDifference;

    if (aIsSelected && bIsSelected) {
      const aSequenceIndex = workflowSequenceNames.indexOf(aName);
      const bSequenceIndex = workflowSequenceNames.indexOf(bName);
      if (aSequenceIndex !== bSequenceIndex) {
        return (aSequenceIndex === -1 ? Number.MAX_SAFE_INTEGER : aSequenceIndex) -
          (bSequenceIndex === -1 ? Number.MAX_SAFE_INTEGER : bSequenceIndex);
      }
    }

    return workflowHeads.indexOf(a) - workflowHeads.indexOf(b);
  });

  const handleActionClick = async (actionStr) => {
    if (actionStr === 'return') {
      if (!newComment.trim()) {
        setValidationError('Please add a comment before returning for edits.');
        return;
      }
      if (!returnTarget) {
        setValidationError('Please select a person to return the request to.');
        return;
      }
    }
    if (onAction) {
      setIsApproving(actionStr === 'approve');
      await onAction(
        actionStr,
        request,
        newComment,
        actionStr === 'return' ? [returnTarget] : selectedApprovers,
        selectedReportingRole,
        orderedSelectedWorkflowApprovers
      );
      onClose();
    }
  };

  const handleReturnReply = async () => {
    if (!returnReply.trim() || !onAction) return;
    setIsSendingReply(true);
    setValidationError('');
    try {
      await onAction('reply', request, returnReply.trim());
      setReturnReply('');
    } catch (error) {
      const serverMessage = error.response?.data?.detail;
      setValidationError(typeof serverMessage === 'string' ? serverMessage : 'Failed to send reply. Please try again.');
    } finally {
      setIsSendingReply(false);
      setIsDownloadingPdf(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
  };

  // Determine overall status badge
  let overallStatusVariant = 'amber';
  let overallStatusIcon = <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />;
  if (request.status.toLowerCase().includes('approved') && !request.status.toLowerCase().includes('pending')) {
    overallStatusVariant = 'green';
    overallStatusIcon = <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />;
  } else if (request.status.toLowerCase().includes('reject') || request.status.toLowerCase().includes('decline')) {
    overallStatusVariant = 'red';
    overallStatusIcon = <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />;
  }

  // Generate timeline groups
  let groupedComments = [];
  if (request.commentsHistory?.length > 0 || request.status.includes('Pending') || request.status === 'Returned') {
    let allComments = request.commentsHistory ? [...request.commentsHistory] : [];
    const approvalSteps = request.approvalSequence || [];

    const resolveCommentStep = (comment) => {
      const stepByNumber = approvalSteps.find((step, index) =>
        Number(step.step || index + 1) === Number(comment.step)
      );
      if (stepByNumber) return stepByNumber;

      const commentName = (comment.name || '').toLowerCase().trim();
      return approvalSteps.find(step => (step.approvers || []).some(approver => {
        const approverName = typeof approver === 'object'
          ? approver.value || approver.label || ''
          : String(approver);
        return approverName.toLowerCase().trim() === commentName;
      }));
    };

    const hasPendingRecipient = request.status.includes('Pending') || request.status === 'Returned';
    if (hasPendingRecipient && request.forwardedTo) {
      const lastCommentDate = allComments.length > 0 ? allComments[allComments.length - 1].date : (request.createdAt || request.date);

      const currentStepNumber = Number(request.currentStep || 1);
      const curStepObj = approvalSteps.find((step, index) =>
        Number(step.step || index + 1) === currentStepNumber
      );

      (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).forEach(nameObj => {
        const name = typeof nameObj === 'object' ? nameObj.value || nameObj.label : String(nameObj);
        const stepDept = (curStepObj?.department || '').toLowerCase().trim();
        const u = users.find(user => 
          user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim() &&
          (user.role?.toLowerCase() === 'head' || user.departmentRole?.toLowerCase() === 'head' || user.role?.toLowerCase() === 'md') &&
          (!stepDept || (user.department || '').toLowerCase().trim() === stepDept)
        ) || users.find(user => 
          user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim() &&
          (user.role?.toLowerCase() === 'head' || user.departmentRole?.toLowerCase() === 'head' || user.role?.toLowerCase() === 'md')
        ) || users.find(user => user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim());
        
        if (u) {
          const hasVoted = request.votes && request.votes[u.id];
          if (!hasVoted) {
            allComments.push({
              name: u.name,
              role: curStepObj?.role?.toLowerCase() === 'md'
                ? 'MD'
                : `${curStepObj?.department || u.department || ''} ${curStepObj?.role || 'Head'}`.trim(),
              department: curStepObj?.department || u.department || '',
              step: curStepObj?.step || currentStepNumber,
              comment: 'Pending review...',
              date: null,
              action: 'pending',
              isPending: true,
              receivedDateOverride: lastCommentDate
            });
          }
        }
      });
    }

    const groupsByStep = new Map();
    [...allComments].reverse().forEach((c, idx) => {
      const originalIdx = allComments.length - 1 - idx;
      let receivedDate = c.receivedDateOverride || request.createdAt || request.date; // Fallback to request creation date
      
      if (!c.receivedDateOverride) {
        for (let i = originalIdx - 1; i >= 0; i--) {
          if (allComments[i].role !== c.role) {
            receivedDate = allComments[i].date;
            break;
          }
        }
      }
      
      const cName = (c.name || '').toLowerCase().trim();
      const isRequesterComment = cName === (requester?.name || '').toLowerCase().trim();
      const workflowStep = isRequesterComment ? null : resolveCommentStep(c);
      const u = users.find(user =>
        user.name?.toLowerCase().trim() === cName &&
        (!workflowStep?.department || (user.department || '').toLowerCase().trim() === workflowStep.department.toLowerCase().trim())
      ) || users.find(user => user.name?.toLowerCase().trim() === cName);
      const roleText = [workflowStep?.role, c.role, u?.role, u?.departmentRole].filter(Boolean).join(' ').toLowerCase();
      const isMDApprover = !isRequesterComment && (workflowStep?.role?.toLowerCase() === 'md' ||
        u?.role?.toLowerCase() === 'md' || u?.departmentRole?.toLowerCase() === 'md' || /\bmd\b/.test(roleText));
      const isHeadApprover = !isRequesterComment && (workflowStep?.role?.toLowerCase() === 'head' ||
        u?.role?.toLowerCase() === 'head' || u?.departmentRole?.toLowerCase() === 'head' || /\bhead\b/.test(roleText));
      if (!isRequesterComment && !isMDApprover && !isHeadApprover && !workflowStep) return;

      const department = workflowStep?.department || u?.department || c.department || '';
      const stepRole = workflowStep?.role || (isMDApprover ? 'MD' : isHeadApprover ? 'Head' : u?.role || 'User');
      const historyRole = isRequesterComment
        ? requesterDepartmentRole
        : isMDApprover ? 'MD' : `${department ? `${department} ` : ''}${stepRole}`;
      const voteAction = c.action || (u ? request.votes?.[u.id] : undefined);
      const sentToObj = u && request.approverSelections ? request.approverSelections[u.id] : undefined;
      const sentToStr = voteAction === 'return'
        ? (c.sentToStr ? formatReturnRecipient(c.sentToStr, users) : '')
        : sentToObj ? (Array.isArray(sentToObj) ? sentToObj : [sentToObj]).map(name => {
        const targetUser = users.find(user => user.name === name);
        if (targetUser) {
          const roleStr = targetUser.role === 'md' ? 'MD' : (targetUser.role ? targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1).toLowerCase() : '');
          return `${name} • ${roleStr}`;
        }
        return name;
      }).join(', ') : '';
      
      const enrichedComment = { ...c, role: historyRole, originalIdx, receivedDate, voteAction, sentToStr, sentToName: c.sentToStr || '' };
      const stepNumber = isRequesterComment ? null : workflowStep
        ? Number(workflowStep.step || approvalSteps.indexOf(workflowStep) + 1)
        : Number(c.step) || groupedComments.length + 1;
      const groupKey = isRequesterComment ? 'requester' : workflowStep ? `step-${stepNumber}` : `legacy-${historyRole}-${stepNumber}`;
      let group = groupsByStep.get(groupKey);
      if (!group) {
        group = { key: groupKey, role: historyRole, stepNumber, isRequesterGroup: isRequesterComment, comments: [] };
        groupsByStep.set(groupKey, group);
        groupedComments.push(group);
      }
      group.comments.push(enrichedComment);
    });
  }
  groupedComments.sort((a, b) => {
    const aHasPending = a.comments.some(comment => comment.voteAction === 'pending');
    const bHasPending = b.comments.some(comment => comment.voteAction === 'pending');
    if (aHasPending !== bHasPending) return aHasPending ? -1 : 1;
    if (a.isRequesterGroup !== b.isRequesterGroup) return a.isRequesterGroup ? -1 : 1;
    return (a.stepNumber ?? Number.MAX_SAFE_INTEGER) - (b.stepNumber ?? Number.MAX_SAFE_INTEGER);
  });
  const historyEntries = groupedComments.flatMap(group => group.comments).sort((a, b) => {
    if ((a.voteAction === 'pending') !== (b.voteAction === 'pending')) {
      return a.voteAction === 'pending' ? -1 : 1;
    }
    return new Date(b.date || b.receivedDate || 0) - new Date(a.date || a.receivedDate || 0);
  });

  const commentsHistory = request.commentsHistory || [];
  const latestReturnHistoryIndex = commentsHistory.map(comment => comment.action).lastIndexOf('return');
  const lastEditIndex = commentsHistory.map(comment => comment.action).lastIndexOf('edit');
  const currentWorkflowHistory = commentsHistory.slice(lastEditIndex + 1);
  const latestWorkflowAction = [...currentWorkflowHistory]
    .reverse()
    .find(comment => ['approve', 'reject', 'return'].includes(comment.action));
  const isReturnInProgress = latestWorkflowAction?.action === 'return' &&
    !(latestWorkflowAction.replies?.length > 0) &&
    !['Approved', 'Rejected'].includes(request.status);
  const canReplyToReturn = Boolean(
    (!isRequester &&
      request.status?.includes('Pending') &&
      latestWorkflowAction?.action === 'return' &&
      latestWorkflowAction.sentToStr?.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim() &&
      isCurrentStepRecipient) ||
    (isRequester &&
      (request.status === 'Returned' || request.status?.toLowerCase() === 'returned') &&
      latestWorkflowAction?.action === 'return')
  );
  const returnTargetName = (latestWorkflowAction?.sentToStr || '').toLowerCase().trim();
  const returnsToEarlierApprover = latestWorkflowAction?.action === 'return' &&
    (request.approvalSequence || []).some(step =>
      Number(step.step) < Number(latestWorkflowAction.step) &&
      (step.approvers || []).some(approver => {
        const approverName = typeof approver === 'object' ? approver.value || approver.label : String(approver);
        return approverName.toLowerCase().trim() === returnTargetName;
      })
    );
  const isReturnToRequester = latestWorkflowAction?.action === 'return' && !returnsToEarlierApprover;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-200 bg-slate-100 relative">
          <button 
            onClick={onClose}
            aria-label="Close request details"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-1 sm:p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" />
          </button>
          
          <div className="flex items-center gap-3 mb-0.5 pr-10">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">{request.item}</h2>
            <Badge variant={overallStatusVariant}>
              <span className="flex items-center gap-1.5">
                {overallStatusIcon} {request.status.startsWith('Pending') ? 'Pending' : request.status}
              </span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm md:text-[14px] text-slate-500">Requested on {formatDateTime(request.createdAt)}</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 bg-[#F8F9FB] p-2.5 sm:p-3.5 md:p-4 rounded-[12px] border border-slate-100">
            
            {/* 1. Request ID */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full">
              <div className="min-w-0">
                <span className="block text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Request ID</span>
                <span className="block text-xs sm:text-sm md:text-base font-bold text-slate-800 truncate">{request.id}</span>
              </div>
            </div>

            {/* 2. Requested By */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full">
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Requested By</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm md:text-base font-bold text-slate-800 break-words">{requester?.name || request.requestedBy}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider flex-shrink-0">
                     {roleName}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 3. Category */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full sm:col-span-2 md:col-span-1">
              <div className="min-w-0">
                <span className="block text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</span>
                <span className="block text-xs sm:text-sm md:text-base font-bold text-slate-800 truncate">{request.category}</span>
              </div>
            </div>
            
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs sm:text-sm md:text-base font-semibold text-slate-900 mb-1.5 sm:mb-2.5">Request Details</h3>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-[13.5px] text-slate-700 leading-relaxed min-h-[60px]">
              {request.justification || <span className="text-slate-400 italic">No description provided.</span>}
            </div>
          </div>

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-slate-900 mb-1.5 sm:mb-2.5">Attachments</h3>
              <div className="flex flex-wrap gap-3">
                {request.attachments.map((file, idx) => {
                  const isPdf = isPdfAttachment(file);
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm pr-3 max-w-sm w-full sm:w-auto">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {isPdf ? (
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-[120px] overflow-hidden">
                        <p className="text-xs sm:text-sm md:text-[14px] font-semibold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className={`text-[9px] sm:text-[10px] md:text-[11px] font-medium uppercase tracking-wide ${
                          isPdf ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {isPdf ? 'PDF Document' : 'Image'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 border-l border-slate-100 pl-2">
                        <button 
                          type="button"
                          onClick={() => handleViewAttachment(file)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview attachment"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadAttachment(file)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviewer Input */}
          {showActions && (
            <div>
              <div className="flex justify-between items-end mb-2">
                <Label>Your Comments {isReturning ? <span className="text-red-500">*</span> : isApproving ? '(Optional)' : ''}</Label>
                <span className="text-[11px] text-slate-400">{newComment.length}/500</span>
              </div>
              <textarea
                className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[80px]"
                placeholder="Add your reasoning for approval, return, or decline..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={500}
              />
            </div>
          )}

          {/* Approval Sequence Workflow Card */}
          {request.approvalSequence && request.approvalSequence.length > 0 && (
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-blue-600" />
                  Approval Status Workflow
                </h3>
                <div ref={workflowMenuRef} className="relative flex items-center gap-2">
                  <span
                    className={`text-[10px] sm:text-[11px] md:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border shadow-2xs ${
                      request.status === 'Approved'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : request.status === 'Rejected'
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : request.status === 'Returned'
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-slate-500 bg-white border-slate-200'
                    }`}
                  >
                    Step {request.status === 'Approved' ? request.approvalSequence.length : (request.currentStep || 1)} of {request.approvalSequence.length}
                    {request.status === 'Returned' ? ' • Returned' : request.status === 'Approved' ? ' • Approved' : request.status === 'Rejected' ? ' • Rejected' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsWorkflowMenuOpen(prev => !prev)}
                    className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700"
                    aria-expanded={isWorkflowMenuOpen}
                  >
                    Edit Workflow
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isWorkflowMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isWorkflowMenuOpen && (
                    <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="mb-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Lock size={11} /> Locked after creation
                      </div>
                      <div className="space-y-1">
                      {workflowHeadDisplayOrder.map(head => {
                        const isSelected = request.approvalSequence.some(step =>
                          (step.approvers || []).some(approver => {
                            const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
                            return name.trim().toLowerCase() === head.name.trim().toLowerCase();
                          })
                        );
                        const queuedIndex = orderedSelectedWorkflowApprovers.findIndex(
                          item => String(item.id) === String(head.id)
                        );
                        const isQueued = queuedIndex !== -1;
                        return (
                          <button
                            key={head.id}
                            type="button"
                            disabled={isSelected || !canAddWorkflowHead}
                            onClick={() => {
                              if (!isSelected && canAddWorkflowHead) {
                                setSelectedWorkflowApprovers(prev => isQueued
                                  ? prev.filter(item => String(item.id) !== String(head.id))
                                  : [...prev, { id: head.id, name: head.name }]
                                );
                              }
                            }}
                            className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] leading-5 text-left transition-colors ${
                              isSelected ? 'bg-blue-50 text-blue-700' :
                              isQueued ? 'bg-emerald-50 text-emerald-700' :
                              canAddWorkflowHead ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400'
                            }`}
                          >
                            <span className="min-w-0 truncate font-medium">
                              {head.name}
                              <span className="ml-1 text-[11px] font-normal text-slate-500">
                                ({isManagingDirector(head)
                                  ? 'MD'
                                  : `${head.department || 'Department'} Head`})
                              </span>
                            </span>
                            {isSelected ? (
                              <Lock size={11} className="text-blue-600" />
                            ) : isQueued ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-sm">
                                {queuedIndex + 1}
                              </span>
                            ) : (
                              <Plus size={11} />
                            )}
                          </button>
                        );
                      })}
                      </div>
                      {availableWorkflowHeads.length === 0 && (
                        <p className="px-2 py-1 text-[11px] text-slate-400">All Department Heads are already in this workflow.</p>
                      )}
                      {selectedWorkflowApprovers.length > 0 && (
                        <p className="mt-1 border-t border-slate-100 px-2 pt-2 text-[10px] text-emerald-700">
                          Your department head is added first, then selected heads from other departments.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={workflowScrollerRef}
                className="flex items-start justify-between overflow-x-auto py-2 px-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <React.Fragment key="requester">
                  <div className="flex flex-col items-center text-center flex-1 min-w-[95px] sm:min-w-[115px] md:min-w-[130px] px-1">
                    <div className="relative">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-emerald-50 border-2 border-emerald-300 text-emerald-700 shadow-sm">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </div>
                      {request.status === 'Returned' && isReturnInProgress && isReturnToRequester && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3" title="Request returned to requester">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-col items-center w-full">
                      <span className="text-xs sm:text-[13px] md:text-sm font-bold text-emerald-800 block text-center leading-tight break-words w-full">
                        {requester?.name || 'Requester'}
                      </span>
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-emerald-700 block text-center leading-snug break-words w-full mt-0.5 sm:mt-1">
                        {requesterDepartmentRole}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center min-w-[28px] sm:min-w-[48px] pt-4 sm:pt-4.5 px-1">
                    <div className="w-full flex items-center justify-center">
                      <span className="h-[2px] w-full rounded-l-full bg-slate-200" />
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 -ml-1 text-slate-300" strokeWidth={2.5} />
                    </div>
                  </div>
                </React.Fragment>
                {request.approvalSequence.map((step, sIdx) => {
                  const stepNumber = sIdx + 1;
                  const currentStepNum = request.currentStep || 1;
                  const isOverallApproved = request.status === 'Approved';
                  const isOverallRejected = request.status === 'Rejected';
                  const isOverallReturned = request.status === 'Returned';

                  const stepApproverNames = (step.approvers || []).map(a =>
                    (typeof a === 'object' ? a.value || a.label : String(a)).toLowerCase().trim()
                  );

                  // Extract the latest action specifically associated with this step or its approvers
                  const stepComments = currentWorkflowHistory.filter(c => {
                    if (c.step && c.step === stepNumber) return true;
                    const cName = (c.name || '').toLowerCase().trim();
                    return stepApproverNames.includes(cName);
                  });
                  const latestStepComment = stepComments.length > 0 ? stepComments[stepComments.length - 1] : null;

                  // Keep a return visible on its originating step when routing back to an earlier step.
                  const hasPriorApproval = step.status === 'approved' || latestStepComment?.action === 'approve';
                  const isFutureStep = stepNumber > currentStepNum && !isOverallApproved &&
                    !hasPriorApproval && latestStepComment?.action !== 'return';
                  const isCurrent = !isFutureStep &&
                    stepNumber === currentStepNum &&
                    request.status?.includes('Pending');
                  const isLatestReturnedStep = request.status === 'Returned' &&
                    latestWorkflowAction?.action === 'return' &&
                    Number(latestWorkflowAction.step) === stepNumber;
                  const isReturnedToEarlierStep = request.status?.includes('Pending') &&
                    latestWorkflowAction?.action === 'return' &&
                    latestWorkflowAction.step != null &&
                    Number(latestWorkflowAction.step) > currentStepNum;

                  // Determine step status
                  const isRejected = !isLatestReturnedStep && !isCurrent && !isFutureStep && (
                    step.status === 'rejected' ||
                    latestStepComment?.action === 'reject' ||
                    (isOverallRejected && stepNumber === currentStepNum)
                  );

                  const isReturned = !isCurrent && !isFutureStep && !isRejected && (
                    isLatestReturnedStep ||
                    step.status === 'returned' ||
                    latestStepComment?.action === 'return' ||
                    (isOverallReturned && stepNumber === currentStepNum)
                  );

                  const isSkipped = !isCurrent && !isFutureStep && !isRejected && !isReturned && (
                    step.status === 'skipped' ||
                    latestStepComment?.action === 'skip' ||
                    latestStepComment?.skipped
                  );

                  const isCompleted = !isCurrent && !isFutureStep && !isRejected && !isReturned && !isSkipped && (
                    hasPriorApproval ||
                    isOverallApproved ||
                    (latestStepComment?.action === 'approve') ||
                    (stepNumber < currentStepNum && !isOverallRejected && !isOverallReturned)
                  );
                  const roleText = (() => {
                    return step.role === 'MD'
                      ? 'Managing Director' 
                      : `${step.department ? `${step.department} ` : 'Department '}${step.role || 'Head'}`;
                  })();

                  return (
                    <React.Fragment key={sIdx}>
                      {/* Step Item Column */}
                      <div className="flex flex-col items-center text-center flex-1 min-w-[95px] sm:min-w-[115px] md:min-w-[130px] group px-1">
                        {/* Circle Shape Step Indicator */}
                        <div className="relative flex items-center justify-center">
                          <div
                            className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm md:text-base transition-all duration-200 ${
                              isCompleted
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-100'
                                : isSkipped
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-4 ring-amber-100'
                                : isRejected
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 ring-4 ring-rose-100'
                                : isReturned
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-4 ring-amber-100'
                                : isCurrent
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-100 scale-105'
                                : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" strokeWidth={3} />
                            ) : isSkipped ? (
                              <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                            ) : isRejected ? (
                              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" strokeWidth={3} />
                            ) : isReturned ? (
                              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" strokeWidth={2.5} />
                            ) : (
                              <span className="text-xs sm:text-sm md:text-base font-bold">{stepNumber}</span>
                            )}
                          </div>

                          {isCurrent && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 ring-2 ring-white"></span>
                            </span>
                          )}
                        </div>

                        {/* Step Details beneath circle */}
                        <div className="mt-2.5 flex flex-col items-center w-full">
                          <span
                            className={`text-xs sm:text-[13px] md:text-sm font-bold block text-center leading-tight break-words w-full ${
                              isCurrent 
                                ? 'text-blue-950 font-extrabold' 
                                : isSkipped
                                ? 'text-amber-950 font-bold'
                                : isReturned 
                                ? 'text-amber-950 font-extrabold' 
                                : isRejected 
                                ? 'text-rose-950 font-extrabold' 
                                : isCompleted 
                                ? 'text-slate-800' 
                                : 'text-slate-700'
                            }`}
                            title={step.approvers?.join(', ')}
                          >
                            {step.approvers?.join(', ')}
                          </span>
                          <span
                            className="text-[10px] sm:text-[11px] md:text-xs text-slate-500 block text-center leading-snug break-words w-full mt-0.5 sm:mt-1"
                            title={roleText}
                          >
                            {roleText}
                          </span>
                          {isSkipped && (
                            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 sm:mt-1">
                              Skipped
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow Connector (-->) between steps */}
                      {sIdx < request.approvalSequence.length - 1 && (
                        <div className="flex-1 flex items-center justify-center min-w-[28px] sm:min-w-[48px] pt-4 sm:pt-4.5 px-1">
                          <div className="w-full flex items-center justify-center">
                            <span
                              className={`h-[2px] w-full rounded-l-full transition-colors ${
                                isCompleted ? 'bg-emerald-400' : isCurrent ? 'bg-blue-300' : 'bg-slate-200'
                              }`}
                            />
                            <ArrowRight
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 -ml-1 transition-colors ${
                                isCompleted
                                  ? 'text-emerald-500'
                                  : isCurrent
                                  ? 'text-blue-500'
                                  : 'text-slate-300'
                              }`}
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approval Timeline */}
          {historyEntries.length > 0 && (
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-slate-900 mb-2.5 sm:mb-4">Approval History</h3>
              <div className="relative">
                <span className="absolute left-[14px] top-7 bottom-7 w-px bg-slate-200" />
                {historyEntries.map((entry, idx) => {
                  const action = entry.voteAction;
                  const isEntrySkipped = action === 'skip' || action === 'skipped' || entry.skipped;
                  const statusLabel = action === 'approve' ? 'Approved'
                    : action === 'reject' ? 'Declined'
                    : action === 'return' ? 'Returned'
                    : action === 'edit' ? 'Resubmitted'
                    : isEntrySkipped ? 'Skipped'
                    : action === 'pending' ? 'Pending' : 'Awaiting';
                  const statusColor = action === 'approve' ? 'text-emerald-600'
                    : action === 'reject' ? 'text-rose-600'
                    : action === 'pending' ? 'text-blue-600'
                    : action === 'return' ? 'text-amber-600'
                    : isEntrySkipped ? 'text-amber-600'
                    : action === 'edit' ? 'text-blue-600' : 'text-slate-500';
                  const cardColor = action === 'return'
                    ? 'border-amber-300 bg-amber-50/60'
                    : isEntrySkipped
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-300 bg-slate-50/80';
                  const markerColor = action === 'approve' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : action === 'reject' ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : action === 'return' ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : isEntrySkipped ? 'border-amber-300 bg-amber-100 text-amber-800'
                    : action === 'edit' ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : action === 'pending' ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600';
                  const comment = String(entry.comment || '').replace('[System: ', '').replace(']', '');
                  const commentText = isEntrySkipped
                    ? (comment || 'Skipped due to no response')
                    : (!comment || comment === 'No comments filled'
                      ? 'No comment provided.'
                      : comment);
                  const date = formatDateTime(entry.date || entry.receivedDate).replace(' at ', ', ');
                  const canReplyToEntry = action === 'return' &&
                    entry.originalIdx === latestReturnHistoryIndex &&
                    canReplyToReturn;

                  return (
                    <div key={`${entry.originalIdx}-${entry.name}-${idx}`} className="relative flex gap-3">
                      <div className="relative flex w-8 shrink-0 justify-center">
                        <span className={`relative z-10 flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0 self-center items-center justify-center rounded-full border text-[10px] sm:text-[11px] md:text-xs font-bold ${markerColor}`}>
                          {historyEntries.length - idx}
                        </span>
                      </div>
                      <div className={`mb-2.5 sm:mb-3 min-w-0 flex-1 rounded-lg sm:rounded-xl border-[1.5px] p-2.5 sm:px-3 sm:py-2.5 md:p-3.5 ${cardColor}`}>
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0 text-[11px] sm:text-xs md:text-sm">
                            <span className="font-semibold text-slate-900">{entry.name}</span>
                            {entry.role && <span className="ml-1 text-slate-500">({entry.role})</span>}
                          </div>
                          {date && <span className="shrink-0 text-[10px] sm:text-[11px] md:text-xs text-slate-400">{date}</span>}
                        </div>
                        <div className="mt-2 rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5">
                          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold uppercase leading-none text-slate-400">Comment</span>
                          <p className="mt-0.5 text-[11px] sm:text-xs md:text-[13px] leading-snug text-slate-700 whitespace-pre-wrap">{commentText}</p>
                        </div>
                        <div className={`mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[9px] sm:text-[10px] md:text-[11px] ${action === 'return' ? 'mb-2 border-b border-amber-200/70 pb-2' : ''}`}>
                          <span className={`font-semibold uppercase ${statusColor}`}>{statusLabel}</span>
                          {Array.isArray(entry.addedFlow) && entry.addedFlow.length > 0 && (
                            <span className="ml-auto text-right text-[10px] sm:text-[11px] md:text-xs text-slate-500">
                              <span className="font-semibold text-emerald-700">Added Flow:</span>{' '}
                              {entry.addedFlow.map((flow, flowIndex) => {
                                const department = flow.department || 'General';
                                const role = flow.role || 'User';
                                return (
                                  <React.Fragment key={`${flow.name}-${flowIndex}`}>
                                    {flowIndex > 0 && ', '}
                                    <span className="font-medium text-slate-700">
                                      {flow.name} ({department} {role})
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </span>
                          )}
                          {action === 'return' && entry.sentToStr && (
                            <span className="text-right text-slate-500"><span className="font-semibold uppercase">Returned to:</span> <span className="font-medium text-slate-700">{entry.sentToStr}</span></span>
                          )}
                        </div>
                        {entry.replies?.map((reply, replyIdx) => (
                          <div key={`${reply.name}-${replyIdx}`} className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                              <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-800">
                                {reply.name}{reply.role && <span className="ml-1 font-normal text-slate-500">({reply.role})</span>}
                              </span>
                              {reply.date && <span className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400">{formatDateTime(reply.date).replace(' at ', ', ')}</span>}
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-[11px] sm:text-xs md:text-[13px] text-slate-700"><span className="font-semibold text-slate-500">Reply Comment:</span> {reply.comment}</p>
                          </div>
                        ))}
                        {canReplyToEntry && (
                          <div className="mt-3 border-t border-amber-100 pt-3">
                            <textarea
                              value={returnReply}
                              onChange={event => setReturnReply(event.target.value)}
                              maxLength={1000}
                              rows={2}
                              placeholder="Write a reply to this return..."
                              aria-label="Reply to return message"
                              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] sm:text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <span className="text-[9px] sm:text-[10px] md:text-xs text-slate-400">{returnReply.length}/1000</span>
                            </div>
                          </div>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy Remarks */}
          {(!request.commentsHistory || request.commentsHistory.length === 0) && request.remarks && typeof request.remarks === 'string' && (
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-slate-900 mb-2 sm:mb-3">Previous Remarks</h3>
              <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {request.remarks}
              </div>
            </div>
          )}


        </div>
        
        {/* Actions Footer */}
        {canReplyToReturn ? (
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between z-10">
            {validationError && <p className="text-[11px] sm:text-xs font-medium text-rose-600">{validationError}</p>}
            <div className="ml-auto flex gap-2 sm:gap-3">
              {isRequester && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction && onAction('edit', request);
                  }}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  Edit Request
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleReturnReply}
                disabled={!returnReply.trim() || isSendingReply}
                className="px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        ) : showActions ? (
          <div className="flex flex-col relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            {/* Return for edits panel */}
            {isReturning && (() => {
              // Build list of target users to return to: the original requester and previous approvers
              const targetCandidates = [];
              const addedUserKeys = new Set();

              // Helper to resolve the correct user object from users list (handles duplicate names across departments/roles)
              const resolveUser = (name, preferredDept = '', preferredRole = '') => {
                if (!name) return null;
                const cleanName = name.toLowerCase().trim();
                const cleanDept = (preferredDept || '').toLowerCase().trim();
                const cleanRole = (preferredRole || '').toLowerCase().trim();

                // 1. Match name + role (head/md) + department
                if (cleanRole || cleanDept) {
                  const match = users.find(u =>
                    u.name?.toLowerCase().trim() === cleanName &&
                    (cleanRole ? (u.role?.toLowerCase() === cleanRole || u.departmentRole?.toLowerCase() === cleanRole) : true) &&
                    (cleanDept ? (u.department || '').toLowerCase().trim() === cleanDept : true)
                  );
                  if (match) return match;
                }

                // 2. Match name + role (head/md)
                if (cleanRole === 'head' || cleanRole === 'md') {
                  const match = users.find(u =>
                    u.name?.toLowerCase().trim() === cleanName &&
                    (u.role?.toLowerCase() === cleanRole || u.departmentRole?.toLowerCase() === cleanRole)
                  );
                  if (match) return match;
                }

                // 3. Match name + department
                if (cleanDept) {
                  const match = users.find(u =>
                    u.name?.toLowerCase().trim() === cleanName &&
                    (u.department || '').toLowerCase().trim() === cleanDept
                  );
                  if (match) return match;
                }

                // 4. Default match by name
                return users.find(u => u.name?.toLowerCase().trim() === cleanName);
              };

              // Helper to format: USERNAME - Department Head/User
              // e.g. "ew - HR Head", "RAOO - HR User"
              const formatReturnLabel = (u, fallbackDept = '', fallbackRole = '') => {
                if (!u && !fallbackRole) return '';
                const name = u?.name || '';
                const rawRole = (u?.role || fallbackRole || 'User').toLowerCase();
                const roleLabel = rawRole === 'md' ? 'MD' :
                                  rawRole === 'head' ? 'Head' :
                                  rawRole === 'admin' ? 'Admin' :
                                  (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));
                
                const dept = u?.department || fallbackDept || '';
                
                let deptRoleLabel = '';
                if (roleLabel === 'MD') {
                  deptRoleLabel = 'MD';
                } else if (dept) {
                  deptRoleLabel = `${dept} ${roleLabel}`;
                } else {
                  deptRoleLabel = roleLabel;
                }

                return `${name} - ${deptRoleLabel}`;
              };

              // 1. Previous approvers from approvalSequence (before current step in reverse order)
              if (request.approvalSequence && request.approvalSequence.length > 0) {
                const currentStepNum = request.currentStep || 1;
                const previousSteps = request.approvalSequence
                  .filter(step => step.step < currentStepNum)
                  .reverse();

                previousSteps.forEach(step => {
                  (step.approvers || []).forEach(approverName => {
                    const nameStr = typeof approverName === 'object' ? approverName.value || approverName.label : String(approverName);
                    if (!nameStr || nameStr.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim()) return;

                    const u = resolveUser(nameStr, step.department, step.role);
                    const key = (u?.id || nameStr).toString();
                    if (!addedUserKeys.has(key)) {
                      addedUserKeys.add(key);
                      targetCandidates.push({
                        value: u ? u.name : nameStr,
                        label: formatReturnLabel(u, step.department, step.role)
                      });
                    }
                  });
                });
              } else if (request.commentsHistory && request.commentsHistory.length > 0) {
                // Fallback for legacy requests with commentsHistory
                [...request.commentsHistory].reverse().forEach(action => {
                  if (action && action.name && action.name.toLowerCase().trim() !== currentUser?.name?.toLowerCase().trim()) {
                    const u = resolveUser(action.name);
                    const key = (u?.id || action.name).toString();
                    if (!addedUserKeys.has(key)) {
                      addedUserKeys.add(key);
                      targetCandidates.push({
                        value: u ? u.name : action.name,
                        label: formatReturnLabel(u)
                      });
                    }
                  }
                });
              }

              // 2. The original requester
              if (requester && requester.name?.toLowerCase().trim() !== currentUser?.name?.toLowerCase().trim()) {
                const reqKey = requester.id.toString();
                if (!addedUserKeys.has(reqKey)) {
                  addedUserKeys.add(reqKey);
                  targetCandidates.push({
                    value: requester.name,
                    label: formatReturnLabel(requester)
                  });
                }
              }

              const involvedOptions = targetCandidates;

              return (
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-amber-50/60 space-y-2 sm:space-y-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Return for Edits</span>

                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 block">
                      Return to <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="returnTarget"
                      options={involvedOptions}
                      value={returnTarget}
                      onChange={e => { setReturnTarget(e.target.value); setValidationError(''); }}
                      placeholder="Select person to return to..."
                      menuPlacement="top"
                    />
                  </div>
                </div>
              );
            })()}

            {isApproving && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-blue-50/50">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1.5 sm:mb-2 block">
                  Workflow Approval Step
                </span>
                {request.approvalSequence && request.approvalSequence.length > 0 ? (
                  (() => {
                    const nextStep = request.approvalSequence[request.currentStep || 1];
                    if (!nextStep) {
                      return (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                          <span className="text-xs sm:text-[13px] font-semibold text-emerald-800">
                            You are providing final approval. Confirming will mark this request as Approved.
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Advances to Next Step</span>
                          <span className="text-xs sm:text-[13px] font-bold text-slate-800">
                            Step {nextStep.step}: {nextStep.approvers?.join(', ')} ({nextStep.role === 'MD' ? 'Managing Director' : `${nextStep.department || ''} Head`})
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const currentUserRoleObj = roles.find(r => r.name?.toLowerCase() === currentUser?.role?.toLowerCase());
                      const currentUserLevel = currentUserRoleObj ? currentUserRoleObj.level : Infinity;

                      if (currentUserLevel === 1 || currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md') {
                        return <span className="text-sm font-semibold text-slate-700">You are providing final approval.</span>;
                      }

                      let higherRoles = roles.filter(r => r.level < currentUserLevel && r.name?.toLowerCase() !== 'admin');
                      let availablePersons = users.filter(u => 
                        (u.role && u.role.toLowerCase() === selectedReportingRole?.toLowerCase()) ||
                        (u.departmentRole && u.departmentRole.toLowerCase() === selectedReportingRole?.toLowerCase())
                      );

                      const formatLabel = (str) => {
                        if (!str) return '';
                        if (str.toLowerCase() === 'md') return 'MD';
                        return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      };

                      return (
                        <div className="flex flex-col gap-3 p-1">
                          <div>
                            <label className="text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 block">
                              Reporting Role <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <CustomSelect
                                name="selectedReportingRole"
                                options={higherRoles.map(r => ({ value: r.name, label: formatLabel(r.name) }))}
                                value={selectedReportingRole}
                                onChange={(e) => {
                                  setSelectedReportingRole(e.target.value);
                                  setSelectedApprovers([]);
                                  setValidationError('');
                                }}
                                placeholder="Select reporting role"
                                menuPlacement="top"
                              />
                            </div>
                          </div>
                          {selectedReportingRole && (
                            <div>
                              <label className="text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 block">
                                Forward to <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <CustomSelect
                                   name="selectedApprovers"
                                   options={availablePersons.map(u => ({ value: u.name, label: formatLabel(u.name) }))}
                                   value={selectedApprovers}
                                   onChange={(e) => {
                                     setSelectedApprovers(e.target.value);
                                     setValidationError('');
                                   }}
                                   placeholder="Select person(s)"
                                   isMulti={true}
                                   menuPlacement="top"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {validationError && (
              <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-rose-50 border-t border-rose-100 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs sm:text-[13px] font-medium text-rose-700">{validationError}</p>
              </div>
            )}
            
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between z-10">
              <button 
                onClick={() => {
                  if (isApproving) {
                    setIsApproving(false);
                    setSelectedApprovers([]);
                    setValidationError('');
                  } else if (isReturning) {
                    setIsReturning(false);
                    setReturnTarget('');
                    setValidationError('');
                  } else {
                    setIsReturning(true);
                    setIsApproving(false);
                    setValidationError('');
                  }
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold bg-white border rounded-lg transition-colors focus:ring-2 ${(isApproving || isReturning) ? 'border-slate-200 text-slate-600 hover:bg-slate-50 focus:ring-slate-200' : 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 focus:ring-amber-500/20'}`}
              >
                {(isApproving || isReturning) ? 'Cancel' : 'Return for edits'}
              </button>
              
              <div className="flex gap-2 sm:gap-3">
                {!isApproving && !isReturning && (
                  <button 
                    onClick={() => handleActionClick('reject')}
                    className="px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-colors focus:ring-2 focus:ring-rose-500/20"
                  >
                    Decline
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    if (isReturning) {
                      handleActionClick('return');
                    } else if (isApproving) {
                      if (!request.approvalSequence || request.approvalSequence.length === 0) {
                        const unvoted = request.forwardedTo ? (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).filter(nameObj => {
                          const name = typeof nameObj === 'object' ? nameObj.value || nameObj.label : String(nameObj);
                          const u = users.find(user => user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim());
                          return u && !request.handledBy?.includes(u.id) && u.id !== currentUser?.id;
                        }) : [];
                        const currentUserRoleObj = roles.find(r => r.name?.toLowerCase() === currentUser?.role?.toLowerCase());
                        const currentUserLevel = currentUserRoleObj ? currentUserRoleObj.level : Infinity;
                        const isLastVoter = unvoted.length === 0;
                        const isMDApprover = currentUserLevel === 1 || currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md';
                        
                        const requiresSelection = isLastVoter && !isMDApprover && (!selectedApprovers || selectedApprovers.length === 0 || !selectedReportingRole);
                        
                        if (requiresSelection) {
                          setValidationError("You must select a reporting role and person to forward to.");
                          return;
                        }
                      }
                      handleActionClick('approve');
                    } else {
                      setIsApproving(true);
                      setValidationError('');
                      const isHead = currentUser?.role?.toLowerCase() === 'head' || currentUser?.departmentRole?.toLowerCase() === 'head';
                      if (isHead) {
                        setSelectedReportingRole('MD');
                        const mdUser = users.find(u => (u.role && u.role.toLowerCase() === 'md') || (u.departmentRole && u.departmentRole.toLowerCase() === 'md'));
                        if (mdUser) {
                          setSelectedApprovers([mdUser.name]);
                        }
                      }
                    }
                  }}
                  className={`px-3.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg shadow-sm transition-all focus:ring-2 flex items-center gap-1.5 sm:gap-2 ${isReturning ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 focus:ring-amber-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20 focus:ring-green-600/30'}`}
                >
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isReturning ? 'Confirm Return' : isApproving ? 'Confirm Approval' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center ${isFinalDecision ? 'justify-between' : 'justify-end'} z-10`}>
            {isFinalDecision && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-blue-600 rounded-lg shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download full request card details as PDF"
              >
                {isDownloadingPdf ? (
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                )}
                <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}

      </div>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6"
          onClick={closePreviewAttachment}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[90vh] overflow-hidden border border-slate-700/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 text-white border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  previewAttachment.isPdf ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {previewAttachment.isPdf ? (
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {previewAttachment.file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {previewAttachment.isPdf ? 'PDF Document' : 'Image Preview'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(previewAttachment.file)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewAttachment.file)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={closePreviewAttachment}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-900 overflow-hidden relative flex items-center justify-center">
              {previewAttachment.isPdf ? (
                <iframe
                  src={`${previewAttachment.blobUrl}#toolbar=1`}
                  className="w-full h-full border-0 bg-slate-100"
                  title={previewAttachment.file.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={previewAttachment.blobUrl}
                    alt={previewAttachment.file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetailsModal;
