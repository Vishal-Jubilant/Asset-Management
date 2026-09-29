import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import StatusBadge from './StatusBadge';
import Button from './Button';
import { Eye, Check, X, CornerUpLeft, MessageSquare, FileText, ChevronLeft, ChevronRight, Trash2, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

const RequestTable = ({ requests, role, variant, onAction }) => {
  const { currentUser } = useContext(AppContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [requests.length]);

  const totalPages = Math.max(1, Math.ceil(requests.length / itemsPerPage));
  const paginatedRequests = requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getActions = (req) => {
    if (role === 'incharge') {
      if (req.status === 'Returned') {
        return (
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => onAction('viewFeedback', req)}>
            <MessageSquare size={16} className="mr-1" /> View Feedback
          </Button>
        );
      }
      if (req.status === 'Approved') {
        return (
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onAction('viewDetails', req)}>
            <FileText size={16} className="mr-1" /> View Details
          </Button>
        );
      }
      return (
        <Button size="sm" variant="secondary" onClick={() => onAction('view', req)}>
          <Eye size={16} className="mr-1" /> View
        </Button>
      );
    }

    if (role === 'requester') {
      return (
        <button onClick={() => onAction('delete', req)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
          <Trash2 size={18} />
        </button>
      );
    }

    if (role === 'manager' && req.status === 'Pending with Manager') {
      return (
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onAction('approve', req)}>
            <Check size={16} />
          </Button>
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => onAction('return', req)}>
            <CornerUpLeft size={16} />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onAction('reject', req)}>
            <X size={16} />
          </Button>
        </div>
      );
    }
    
    if (role === 'md' && req.status === 'Pending with MD') {
      return (
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onAction('approve', req)}>
            <Check size={16} />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onAction('reject', req)}>
            <X size={16} />
          </Button>
        </div>
      );
    }

    return (
      <Button size="sm" variant="secondary" onClick={() => onAction('view', req)}>
        <Eye size={16} className="mr-1" /> View
      </Button>
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const formattedHours = hours.toString().padStart(2, '0');
    return `${day}-${month}-${year} | ${formattedHours}:${minutes} ${ampm}`;
  };

  const getRequesterActions = (req) => {
    const isHandled = req.handledBy && req.handledBy.includes(currentUser?.id);
    const roleName = currentUser?.role === 'md' ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
    let requiresMyAction = false;
    if (req.status === `Pending with ${roleName}`) {
      if (!req.forwardedTo || req.forwardedTo.length === 0) {
        requiresMyAction = true;
      } else {
        requiresMyAction = (Array.isArray(req.forwardedTo) ? req.forwardedTo : [req.forwardedTo]).some(n => {
          const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
          return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
        });
      }
    }
    
    if (requiresMyAction && !isHandled) {
      return (
        <div className="flex items-center justify-end space-x-2">
          <button onClick={() => onAction('approve', req)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Approve">
            <Check size={18} />
          </button>
          <button onClick={() => onAction('reject', req)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Decline">
            <X size={18} />
          </button>
          <button onClick={() => onAction('return', req)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Return">
            <CornerUpLeft size={18} />
          </button>
        </div>
      );
    }
    
    if (isHandled) {
      return (
        <div className="flex items-center justify-end">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
            <Check size={12} /> Handled
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-end">
        <Button size="sm" variant="secondary" onClick={() => onAction && onAction('viewDetailsModal', req)}>
          <Eye size={16} className="mr-1" /> View
        </Button>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            {variant === 'my-requests' ? (
              <tr>
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Date and Time</th>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Description</th>
                {currentUser?.role !== 'incharge' && currentUser?.role !== 'user' && (
                  <th className="px-6 py-4 font-medium">Status</th>
                )}
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRequests.map((req, index) => (
              <tr 
                key={req.id} 
                className={`hover:bg-slate-50/50 transition-colors cursor-pointer hover:bg-slate-50`}
                onClick={(e) => {
                  if (onAction) {
                    // Don't trigger if they clicked an action button (icons)
                    if (!e.target.closest('button')) {
                      onAction('viewDetailsModal', req);
                    }
                  }
                }}
              >
                <td className="px-6 py-4 text-slate-500 font-medium">
                  {(((currentPage - 1) * itemsPerPage) + index + 1).toString().padStart(2, '0')}
                </td>
                {variant === 'my-requests' ? (
                  <>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(req.createdAt)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.id}</td>
                    <td className="px-6 py-4 text-slate-600">{req.category}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium max-w-[150px] truncate">{req.item}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">{req.justification || 'No description provided'}</td>
                    {currentUser?.role !== 'incharge' && currentUser?.role !== 'user' && (
                      <td className="px-6 py-4">
                        {(() => {
                           if (req.requestedBy === currentUser?.id) {
                             return <StatusBadge status={req.status} />;
                           }
                           
                           const vote = req.votes && req.votes[currentUser?.id];
                           if (vote === 'approve') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle size={14} /> Approved</span>;
                           if (vote === 'reject') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={14} /> Rejected</span>;
                           if (vote === 'return') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><RotateCcw size={14} /> Returned</span>;
                           
                           return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><Clock size={14} /> Pending</span>;
                        })()}
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.id}</td>
                    <td className="px-6 py-4 text-slate-600">{req.category}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {req.item}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        if (req.requestedBy === currentUser?.id) {
                          return <StatusBadge status={req.status} />;
                        }
                        const vote = req.votes && req.votes[currentUser?.id];
                        if (vote === 'approve') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle size={14} /> Approved</span>;
                        if (vote === 'reject') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={14} /> Rejected</span>;
                        if (vote === 'return') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><RotateCcw size={14} /> Returned</span>;
                        
                        return <StatusBadge status={req.status} />;
                      })()}
                    </td>
                    <td className="px-6 py-4 flex justify-end">
                      {getActions(req)}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {paginatedRequests.length === 0 && (
              <tr>
                <td colSpan={variant === 'my-requests' ? (currentUser?.role !== 'incharge' && currentUser?.role !== 'user' ? "8" : "7") : "7"} className="px-6 py-12 text-center text-slate-500">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {requests.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, requests.length)}</span> of <span className="font-medium text-slate-700">{requests.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum 
                          ? 'bg-brand-50 text-brand-600 border border-brand-200' 
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className="text-slate-400 px-1">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestTable;
