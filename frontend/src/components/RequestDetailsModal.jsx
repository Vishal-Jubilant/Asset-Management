import React, { useContext, useState, useEffect } from 'react';
import { 
  X, Calendar, Check, CornerUpLeft, Clock, XCircle, RotateCcw, 
  User, Hash, Monitor, ChevronDown, ChevronRight, MessageSquare, AlertCircle, Paperclip, Download
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { AppContext } from '../context/AppContext';

// Helper components for design system
const Label = ({ children }) => (
  <span className="block text-[11px] font-semibold tracking-[0.05em] uppercase text-slate-500 mb-1.5">
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const TimelineNode = ({ status }) => {
  let icon;
  let bgClass;
  
  if (status === 'approve' || status === 'approved') {
    icon = <Check className="w-3 h-3 text-white" strokeWidth={3} />;
    bgClass = "bg-emerald-500 ring-4 ring-white";
  } else if (status === 'reject' || status === 'declined') {
    icon = <X className="w-3 h-3 text-white" strokeWidth={3} />;
    bgClass = "bg-rose-500 ring-4 ring-white";
  } else if (status === 'return' || status === 'returned') {
    icon = <RotateCcw className="w-3 h-3 text-white" strokeWidth={2.5} />;
    bgClass = "bg-amber-500 ring-4 ring-white";
  } else if (status === 'edit') {
    icon = <Check className="w-3 h-3 text-white" strokeWidth={3} />;
    bgClass = "bg-blue-500 ring-4 ring-white";
  } else if (status === 'pending') {
    icon = <Clock className="w-3 h-3 text-white" strokeWidth={2.5} />;
    bgClass = "bg-amber-500 ring-4 ring-white";
  } else {
    // Awaiting / default
    icon = <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />;
    bgClass = "bg-white border-2 border-slate-200";
  }

  return (
    <div className="absolute left-0 w-6 flex justify-center -translate-x-[11px] top-4">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 ${bgClass}`}>
        {icon}
      </div>
    </div>
  );
};

// Extracted Stepper component for the grouped comments
const LevelGroup = ({ group, stepNumber, isLastLevel, formatDateTime }) => {
  // Determine if this group is fully approved. If so, start collapsed.
  const isFullyApproved = group.comments.every(c => c.voteAction === 'approve');
  const [isExpanded, setIsExpanded] = useState(!isFullyApproved);

  return (
    <div className="relative">
      {/* Connecting line */}
      {!isLastLevel && (
        <div className="absolute top-6 bottom-[-24px] left-0 w-px bg-slate-200 -translate-x-[0.5px] z-0" />
      )}
      
      <div className="pl-8 pb-6">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full group mb-4"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            )}
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{stepNumber}. {group.role} LEVEL</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {group.comments.length} Approver{group.comments.length !== 1 && 's'}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {group.comments.map((c, idx) => {
              const ringColor = 
                c.voteAction === 'approve' ? 'ring-emerald-100' :
                c.voteAction === 'reject' ? 'ring-rose-100' :
                c.voteAction === 'return' || c.voteAction === 'pending' ? 'ring-amber-100' :
                c.voteAction === 'edit' ? 'ring-blue-100' :
                'ring-slate-100';

              const statusVariant = 
                c.voteAction === 'approve' ? 'green' : 
                c.voteAction === 'reject' ? 'red' : 
                c.voteAction === 'return' ? 'amber' : 
                c.voteAction === 'edit' ? 'blue' : 
                c.voteAction === 'pending' ? 'amber' : 'default';
                
              const statusLabel = 
                c.voteAction === 'approve' ? 'Approved' :
                c.voteAction === 'reject' ? 'Declined' :
                c.voteAction === 'return' ? 'Returned' :
                c.voteAction === 'edit' ? 'Resubmitted' :
                c.voteAction === 'pending' ? 'Pending' : 'Awaiting';

              const commentText = c.comment.replace('[System: ', '').replace(']', '');
              const hasComment = c.comment && !c.isPending && !c.comment.startsWith('[System:') && c.comment !== 'No comments filled';

              return (
                <div key={idx} className="relative bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition-colors">
                  <TimelineNode status={c.voteAction} />
                  
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm ring-2 ${ringColor}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-900">{c.name}</span>
                        <span className="text-[12px] text-slate-500">• {c.role}</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="bg-slate-50/50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100 mb-3">
                    {hasComment ? (
                      <span className="text-slate-700 whitespace-pre-wrap">"{commentText}"</span>
                    ) : (
                      <span className="italic text-slate-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> {commentText || "No comments provided"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between text-[11px] text-slate-500">
                    <div className="space-y-1">
                      {c.sentToStr && (
                        <div className="flex items-center gap-1.5 min-h-[20px]">
                          <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{c.voteAction === 'return' ? 'Returned to:' : 'Sent to:'}</span>
                          <span>{c.sentToStr}</span>
                        </div>
                      )}
                      {c.receivedDate && (
                        <div className="flex items-center gap-1.5 min-h-[20px]">
                          <span>Received:</span>
                          <span className="font-medium text-slate-700">{formatDateTime(c.receivedDate)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {c.date && (
                        <div className="flex items-center justify-end gap-1.5 min-h-[20px]">
                          <span>{c.voteAction === 'approve' ? 'Approved:' : c.voteAction === 'reject' ? 'Declined:' : c.voteAction === 'return' ? 'Returned:' : 'Responded:'}</span>
                          <span className="font-medium text-slate-700">{formatDateTime(c.date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
  
  useEffect(() => {
    if (isOpen && request) {
      setNewComment('');
      setIsApproving(false);
      setIsReturning(false);
      setReturnTarget('');
      setSelectedApprovers([]);
      setSelectedReportingRole('');
      setValidationError('');
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
  
  if (!isOpen || !request) return null;

  const requester = users.find(u => u.id === request.requestedBy);
  const roleName = requester?.role === 'md' ? 'MD' : (requester?.role ? requester.role.charAt(0).toUpperCase() + requester.role.slice(1).toLowerCase() : 'Unknown');
  const myRole = currentUser?.role === 'md' ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
  
  const isHandled = request.handledBy && request.handledBy.includes(currentUser?.id);
  const isRequester = request.requestedBy === currentUser?.id;
  
  const isForwardedToMe = (() => {
    if (request.forwardedTo && request.forwardedTo.length > 0) {
      return (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
    }
    return false;
  })();

  const isApprover = (() => {
    if (isForwardedToMe) return true;
    if (!request.status.includes('Pending')) return false;
    return request.status === `Pending with ${myRole}`;
  })();

  const hasVoted = request.votes && !!request.votes[currentUser?.id];
  const showActions = !hasVoted && !isRequester && isApprover;

  const handleActionClick = (actionStr) => {
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
      onAction(actionStr, request, newComment, actionStr === 'return' ? [returnTarget] : selectedApprovers, selectedReportingRole);
      onClose();
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
  let overallStatusIcon = <Clock className="w-3 h-3" />;
  if (request.status.toLowerCase().includes('approved') && !request.status.toLowerCase().includes('pending')) {
    overallStatusVariant = 'green';
    overallStatusIcon = <Check className="w-3 h-3" />;
  } else if (request.status.toLowerCase().includes('reject') || request.status.toLowerCase().includes('decline')) {
    overallStatusVariant = 'red';
    overallStatusIcon = <X className="w-3 h-3" />;
  }

  // Generate timeline groups
  let groupedComments = [];
  if (request.commentsHistory?.length > 0 || request.status.includes('Pending')) {
    let allComments = request.commentsHistory ? [...request.commentsHistory] : [];
    
    if (request.status.includes('Pending') && request.forwardedTo) {
      const lastCommentDate = allComments.length > 0 ? allComments[allComments.length - 1].date : (request.createdAt || request.date);
      
      (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).forEach(nameObj => {
        const name = typeof nameObj === 'object' ? nameObj.value || nameObj.label : String(nameObj);
        const u = users.find(user => user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim());
        
        if (u) {
          const hasVoted = request.votes && request.votes[u.id];
          if (!hasVoted) {
            allComments.push({
              name: u.name,
              role: u.role === 'md' ? 'MD' : (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1).toLowerCase() : ''),
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
      
      const u = users.find(user => user.name === c.name);
      const voteAction = c.action || (u ? request.votes?.[u.id] : undefined);
      const sentToObj = u && request.approverSelections ? request.approverSelections[u.id] : undefined;
      const sentToStr = sentToObj ? (Array.isArray(sentToObj) ? sentToObj : [sentToObj]).map(name => {
        const targetUser = users.find(user => user.name === name);
        if (targetUser) {
          const roleStr = targetUser.role === 'md' ? 'MD' : (targetUser.role ? targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1).toLowerCase() : '');
          return `${name} • ${roleStr}`;
        }
        return name;
      }).join(', ') : '';
      
      const enrichedComment = { ...c, originalIdx, receivedDate, voteAction, sentToStr };
      
      const lastGroup = groupedComments[groupedComments.length - 1];
      if (lastGroup && lastGroup.role === c.role) {
        lastGroup.comments.push(enrichedComment);
      } else {
        groupedComments.push({
          role: c.role,
          comments: [enrichedComment]
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-100 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-0.5 pr-10">
            <h2 className="text-[18px] font-semibold text-slate-900">{request.item}</h2>
            <Badge variant={overallStatusVariant}>
              <span className="flex items-center gap-1.5">
                {overallStatusIcon} {request.status.startsWith('Pending') ? 'Pending' : request.status}
              </span>
            </Badge>
          </div>
          <p className="text-[13px] text-slate-500">Requested on {formatDateTime(request.createdAt)}</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-[#F8F9FB] p-3.5 rounded-[12px] border border-slate-100">
            
            {/* 1. Request ID */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Request ID</span>
                <span className="block text-[13.5px] font-bold text-slate-800 truncate">{request.id}</span>
              </div>
            </div>

            {/* 2. Requested By */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Requested By</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13.5px] font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[120px]">{requester?.name || request.requestedBy}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider flex-shrink-0">
                     {roleName}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 3. Category */}
            <div className="bg-white border border-slate-200/75 rounded-[11px] p-3 flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-full sm:col-span-2 md:col-span-1">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</span>
                <span className="block text-[13.5px] font-bold text-slate-800 truncate">{request.category}</span>
              </div>
            </div>
            
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 mb-2.5">Request Details</h3>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-[13.5px] text-slate-700 leading-relaxed min-h-[60px]">
              {request.justification || <span className="text-slate-400 italic">No description provided.</span>}
            </div>
          </div>

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900 mb-2.5">Attachments</h3>
              <div className="flex flex-wrap gap-3">
                {request.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm pr-4 max-w-sm w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Paperclip size={18} />
                    </div>
                    <div className="flex-1 min-w-[120px] overflow-hidden">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">Image</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 border-l border-slate-100 pl-2">
                      <button 
                        onClick={() => {
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>Attachment: ${file.name}</title></head>
                                <body style="margin:0; background-color:#1e293b; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden;">
                                  <img src="${file.data}" style="max-width:90vw; max-height:90vh; object-fit:contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 8px;" />
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Monitor size={16} />
                      </button>
                      <a 
                        href={file.data} 
                        download={file.name}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </div>
                ))}
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

          {/* Approval Timeline */}
          {groupedComments.length > 0 && (
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900 mb-4">Approval Workflow</h3>
              <div className="pl-3">
                {groupedComments.map((group, idx) => (
                  <LevelGroup 
                    key={idx} 
                    group={group} 
                    stepNumber={groupedComments.length - idx}
                    isLastLevel={idx === groupedComments.length - 1} 
                    formatDateTime={formatDateTime}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Legacy Remarks */}
          {(!request.commentsHistory || request.commentsHistory.length === 0) && request.remarks && typeof request.remarks === 'string' && (
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900 mb-3">Previous Remarks</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                {request.remarks}
              </div>
            </div>
          )}


        </div>
        
        {/* Actions Footer */}
        {showActions && (
          <div className="flex flex-col relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            {/* Return for edits panel */}
            {isReturning && (() => {
              // Build list of users to return to: the requester and all previous approvers
              const involvedNames = new Set();
              if (requester && requester.name) involvedNames.add(requester.name);
              
              if (request.commentsHistory && request.commentsHistory.length > 0) {
                request.commentsHistory.forEach(action => {
                  if (action && action.name && action.name !== currentUser?.name) {
                    involvedNames.add(action.name);
                  }
                });
              }
              const involvedOptions = [...involvedNames]
                .map(name => {
                  const u = users.find(u => u.name?.toLowerCase().trim() === name?.toLowerCase().trim());
                  return u && u.name !== currentUser?.name ? {
                    value: u.name,
                    label: `${u.name} • ${u.role === 'md' ? 'MD' : (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '')}`
                  } : null;
                })
                .filter(Boolean)
                .reverse();

              return (
                <div className="px-6 py-4 border-t border-slate-200 bg-amber-50/60 space-y-3">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Return for Edits</span>

                  <div>
                    <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
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
              <div className="px-6 py-4 border-t border-slate-200 bg-blue-50/50">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3 block">Next Step Setup</span>
                <div className="flex flex-col gap-2">
                  {(() => {
                    const currentUserRoleObj = roles.find(r => r.name?.toLowerCase() === currentUser?.role?.toLowerCase());
                    const currentUserLevel = currentUserRoleObj ? currentUserRoleObj.level : Infinity;

                    if (currentUserLevel === 1) {
                      return <span className="text-sm font-semibold text-slate-700">You are providing final approval.</span>;
                    }

                    const higherRoles = roles.filter(r => r.level < currentUserLevel && r.name?.toLowerCase() !== 'admin');
                    const availablePersons = users.filter(u => u.role === selectedReportingRole);

                    const formatLabel = (str) => {
                      if (!str) return '';
                      if (str.toLowerCase() === 'md') return 'MD';
                      return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    };

                    return (
                      <div className="flex flex-col gap-3 p-1">
                        <div>
                          <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
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
                            <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
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
              </div>
            )}
            
            {validationError && (
              <div className="px-6 py-3 bg-rose-50 border-t border-rose-100 flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] font-medium text-rose-700">{validationError}</p>
              </div>
            )}
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between z-10">
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
                className={`px-4 py-2.5 text-sm font-semibold bg-white border rounded-lg transition-colors focus:ring-2 ${(isApproving || isReturning) ? 'border-slate-200 text-slate-600 hover:bg-slate-50 focus:ring-slate-200' : 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 focus:ring-amber-500/20'}`}
              >
                {(isApproving || isReturning) ? 'Cancel' : 'Return for edits'}
              </button>
              
              <div className="flex gap-3">
                {!isApproving && !isReturning && (
                  <button 
                    onClick={() => handleActionClick('reject')}
                    className="px-5 py-2.5 text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-colors focus:ring-2 focus:ring-rose-500/20"
                  >
                    Decline
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    if (isReturning) {
                      handleActionClick('return');
                    } else if (isApproving) {
                      const unvoted = request.forwardedTo ? (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).filter(nameObj => {
                        const name = typeof nameObj === 'object' ? nameObj.value || nameObj.label : String(nameObj);
                        const u = users.find(user => user.name?.toLowerCase()?.trim() === name?.toLowerCase()?.trim());
                        return u && !request.handledBy?.includes(u.id) && u.id !== currentUser?.id;
                      }) : [];
                      const currentUserRoleObj = roles.find(r => r.name?.toLowerCase() === currentUser?.role?.toLowerCase());
                      const currentUserLevel = currentUserRoleObj ? currentUserRoleObj.level : Infinity;
                      const isLastVoter = unvoted.length === 0;
                      
                      const requiresSelection = isLastVoter && currentUserLevel > 1 && (!selectedApprovers || selectedApprovers.length === 0 || !selectedReportingRole);
                      
                      if (requiresSelection) {
                        setValidationError("You must select a reporting role and person to forward to.");
                        return;
                      }
                      handleActionClick('approve');
                    } else {
                      setIsApproving(true);
                      setSelectedApprovers([]);
                      setSelectedReportingRole('');
                    }
                  }}
                  className={`px-6 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm transition-all focus:ring-2 flex items-center gap-2 ${isReturning ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 focus:ring-amber-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20 focus:ring-green-600/30'}`}
                >
                  <Check className="w-4 h-4" /> {isReturning ? 'Confirm Return' : isApproving ? 'Confirm Approval' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RequestDetailsModal;
