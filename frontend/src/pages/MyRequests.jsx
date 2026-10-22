import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import RequestTable from '../components/RequestTable';
import StatCard from '../components/StatCard';
import RequestDetailsModal from '../components/RequestDetailsModal';
import NewRequestModal from '../components/NewRequestModal';
import api from '../utils/api';
import { Package, CheckCircle, Clock, RotateCcw, XCircle, ShieldAlert, Search, ChevronDown, Check, Download, CalendarDays } from 'lucide-react';
import { RangeCalendar } from "@heroui/react";
import {
  parseDate,
  getLocalTimeZone,
} from "@internationalized/date";

const MyRequests = () => {
  const { currentUser, requests, setRequests, users } = useContext(AppContext);
  const isCurrentUserMD = currentUser?.role?.toLowerCase() === 'md' ||
    currentUser?.departmentRole?.toLowerCase() === 'md' ||
    currentUser?.empCode?.toLowerCase() === 'md' ||
    currentUser?.name?.toLowerCase() === 'managing director';

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('Assigned');
  const [statusFilters, setStatusFilters] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [isAssignmentFilterOpen, setIsAssignmentFilterOpen] = useState(false);
  const assignmentFilterRef = useRef(null);

  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const dateFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setIsDateFilterOpen(false);
      }
      if (assignmentFilterRef.current && !assignmentFilterRef.current.contains(event.target)) {
        setIsAssignmentFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions = ['Approved', 'Pending', 'Returned', 'Rejected'];
  const toggleFilter = (option) => {
    setStatusFilters(prev => 
      prev.includes(option) ? prev.filter(f => f !== option) : [...prev, option]
    );
  };

  const isAssignedToCurrentMD = (request) => {
    if (!request) return false;

    const currentUserName = (currentUser?.name || '').toLowerCase().trim();
    const hasMyAction = (request.commentsHistory || []).some(comment =>
      (comment.name || '').toLowerCase().trim() === currentUserName &&
      ['approve', 'reject', 'return'].includes(comment.action)
    );
    const hasMyVote = (request.handledBy || []).some(id => String(id) === String(currentUser?.id));
    if (hasMyAction || hasMyVote) return true;

    if (!request.status?.includes('Pending')) return false;

    if (request.approvalSequence?.length) {
      const currentStep = request.approvalSequence[(Number(request.currentStep) || 1) - 1];
      if (!currentStep || currentStep.status === 'approved' || currentStep.status === 'rejected' || currentStep.role?.toLowerCase() !== 'md') {
        return false;
      }
      const hasCurrentMDId = (currentStep.approverIds || []).some(id => String(id) === String(currentUser?.id));
      const hasCurrentMDName = (currentStep.approvers || []).some(approver => {
        const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
        return name?.toLowerCase().trim() === currentUserName;
      });
      return hasCurrentMDId || hasCurrentMDName;
    }

    if (request.status !== 'Pending with MD') return false;
    if (!request.forwardedTo || request.forwardedTo.length === 0) return true;
    return (Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).some(approver => {
      const name = typeof approver === 'object' ? approver.value || approver.label : String(approver);
      return name?.toLowerCase().trim() === currentUserName;
    });
  };

  const requestsForCurrentRole = requests.filter(r => {
    if (!r) return false;
    if (r.requestedBy === currentUser?.id) return r.status === 'Returned';

    // Keep request in the list if current user took an action (approve, reject, return)
    const hasMyAction = (r.commentsHistory || []).some(c =>
      (c.name || '').toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim() &&
      ['approve', 'reject', 'return'].includes(c.action)
    );
    if (hasMyAction) return true;

    if (r.handledBy && r.handledBy.includes(currentUser?.id)) return true;

    const isMD = currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md';
    const roleName = isMD ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');

    // Check if user is an approver in approval sequence (Strict sequential approval: only active step approver sees pending request)
    if (r.approvalSequence && r.approvalSequence.length > 0) {
      if (r.status?.includes('Pending')) {
        const curStepIdx = (r.currentStep || 1) - 1;
        const curStep = r.approvalSequence[curStepIdx];
        if (curStep && curStep.status !== 'approved' && curStep.status !== 'rejected') {
          const isMDStep = curStep.role?.toLowerCase() === 'md' && isMD;
          const isApproverInCurrentStep = isMDStep || (curStep.approvers || []).some(n => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          });
          if (isApproverInCurrentStep) return true;
        }
      }
      return false;
    }

    // Legacy requests without approvalSequence:
    if (r.forwardedTo && (Array.isArray(r.forwardedTo) ? r.forwardedTo.length > 0 : true)) {
      const hasForwardedToMe = (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
      if (hasForwardedToMe) return true;
      if (r.status === 'Pending with MD' && isMD) return true;
      return false;
    }

    if (r.status === `Pending with ${roleName}` || (r.status === 'Pending with MD' && isMD)) {
      const requester = users.find(u => u.id === r.requestedBy);
      const isDeptHeadOfRequester = (currentUser?.role?.toLowerCase() === 'head' || currentUser?.departmentRole?.toLowerCase() === 'head') &&
        currentUser?.department && requester?.department && currentUser.department.toLowerCase() === requester.department.toLowerCase();

      if (!r.forwardedTo || r.forwardedTo.length === 0) {
        if (currentUser?.role?.toLowerCase() === 'head') {
          return isDeptHeadOfRequester;
        }
        return true;
      }
    }
    
    return false;
  });

  const myRequests = isCurrentUserMD
    ? requests.filter(request => {
        if (!request) return false;
        const isOwnReturnedRequest =
          String(request.requestedBy) === String(currentUser?.id) && request.status === 'Returned';
        const assignedToMD = isAssignedToCurrentMD(request);

        if (assignmentFilter === 'Assigned') return assignedToMD || isOwnReturnedRequest;
        if (String(request.requestedBy) === String(currentUser?.id) || assignedToMD) return false;

        const requester = users.find(user => String(user.id) === String(request.requestedBy));
        const requesterRole = (requester?.role || '').toLowerCase();
        const requesterDepartmentRole = (requester?.departmentRole || '').toLowerCase();
        return requesterRole === 'user' || requesterDepartmentRole === 'user' ||
          requesterRole === 'head' || requesterDepartmentRole === 'head';
      })
    : requestsForCurrentRole;

  const getDisplayStatus = (r) => {
    if (!r) return '';

    // If I acted on this request and I am not the requester, show the exact action I clicked: Approved / Rejected / Returned
    if (r.requestedBy !== currentUser?.id) {
      const myLastAction = [...(r.commentsHistory || [])].reverse().find(c =>
        (c.name || '').toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim() &&
        ['approve', 'reject', 'return'].includes(c.action)
      );
      if (myLastAction) {
        if (myLastAction.action === 'approve') return 'Approved';
        if (myLastAction.action === 'reject') return 'Rejected';
        if (myLastAction.action === 'return') return 'Returned';
      }
    }

    const isMD = currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md';
    const roleName = isMD ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
    const requester = users.find(u => u.id === r.requestedBy);
    const isDeptHeadOfRequester = (currentUser?.role?.toLowerCase() === 'head' || currentUser?.departmentRole?.toLowerCase() === 'head') &&
      currentUser?.department && requester?.department && currentUser.department.toLowerCase() === requester.department.toLowerCase();

    let isCurrentlyPendingWithMe = false;
    if (r.status?.includes('Pending')) {
      if (r.approvalSequence && r.approvalSequence.length > 0) {
        const curStepIdx = (r.currentStep || 1) - 1;
        const curStep = r.approvalSequence[curStepIdx];
        if (curStep && curStep.status !== 'approved' && curStep.status !== 'rejected') {
          const isMDStep = curStep.role?.toLowerCase() === 'md' && isMD;
          isCurrentlyPendingWithMe = isMDStep || (curStep.approvers || []).some(n => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          });
        }
      } else if (r.status === `Pending with ${roleName}` || (r.status === 'Pending with MD' && isMD)) {
        if (!r.forwardedTo || r.forwardedTo.length === 0) {
          if (currentUser?.role?.toLowerCase() === 'head') {
            isCurrentlyPendingWithMe = isDeptHeadOfRequester;
          } else {
            isCurrentlyPendingWithMe = true;
          }
        } else {
          isCurrentlyPendingWithMe = (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          }) || (r.status === 'Pending with MD' && isMD);
        }
      }

      // If I already voted, it's not pending for me anymore
      if (r.handledBy && r.handledBy.includes(currentUser?.id)) {
        isCurrentlyPendingWithMe = false;
      }
    }

    if (isCurrentlyPendingWithMe) return r.status || '';

    if (r.commentsHistory && r.commentsHistory.length > 0) {
      const lastAction = r.commentsHistory[r.commentsHistory.length - 1];
      if (lastAction.action === 'return' && r.requestedBy === currentUser?.id) {
        return 'Returned';
      }
    }
    return r.status || '';
  };

  const isForwardedToMe = (r) => {
    if (!r || !r.status?.includes('Pending')) return false;
    const isMD = currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md';
    if (r.approvalSequence && r.approvalSequence.length > 0) {
      const curStepIdx = (r.currentStep || 1) - 1;
      const curStep = r.approvalSequence[curStepIdx];
      if (!curStep || curStep.status === 'approved' || curStep.status === 'rejected') return false;
      if (curStep.role?.toLowerCase() === 'md' && isMD) return true;
      return (curStep.approvers || []).some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
    }
    if (r.forwardedTo && r.forwardedTo.length > 0) {
      const hasForwardedToMe = (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
        const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
        return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
      });
      if (hasForwardedToMe) return true;
      if (r.status === 'Pending with MD' && isMD) return true;
      return false;
    }
    const roleName = isMD ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
    return r.status === `Pending with ${roleName}` || (r.status === 'Pending with MD' && isMD);
  };

  const stats = [
    {
      title: 'Total Request',
      value: myRequests.length,
      icon: <Package size={24} />,
      colorClass: 'text-brand-600',
    },
    {
      title: 'Approved Request',
      value: myRequests.filter(r => {
        const ds = getDisplayStatus(r);
        if (ds === 'Approved') return true;
        if (r.handledBy && r.handledBy.includes(currentUser?.id) && ds !== 'Rejected' && ds !== 'Returned') {
           // I handled it, and the request is not rejected/returned overall
           return true;
        }
        return false;
      }).length,
      icon: <CheckCircle size={24} />,
      colorClass: 'text-emerald-500',
    },
    {
      title: 'Pending Request',
      value: myRequests.filter(r => {
        const ds = getDisplayStatus(r);
        if (!ds?.includes('Pending')) return false;
        
        const hasVoted = r.handledBy && r.handledBy.includes(currentUser?.id);
        if (hasVoted) return false;
        
        if (isForwardedToMe(r)) return true;
        
        const isMD = currentUser?.role?.toLowerCase() === 'md' || currentUser?.departmentRole?.toLowerCase() === 'md';
        const roleName = isMD ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
        if ((r.status === `Pending with ${roleName}` || (r.status === 'Pending with MD' && isMD)) && (!r.forwardedTo || r.forwardedTo.length === 0)) return true;
        
        return false;
      }).length,
      icon: <Clock size={24} />,
      colorClass: 'text-blue-500',
    },
    {
      title: 'Rejected',
      value: myRequests.filter(r => getDisplayStatus(r) === 'Rejected').length,
      icon: <XCircle size={24} />,
      colorClass: 'text-red-600',
    },
  ];

  const handleAction = async (action, req, remarks, selectedApprovers, selectedReportingRole) => {
    if (action === 'viewDetailsModal' || action === 'view') {
      setSelectedRequest(req);
      setIsModalOpen(true);
    } else if (action === 'edit') {
      setEditRequest(req);
      setIsNewRequestModalOpen(true);
    } else if (['approve', 'reject', 'return'].includes(action)) {
      try {
        const response = await api.put(`/asset-requests/${req.id}/action`, {
          action: action,
          remarks: remarks,
          selectedApprovers: selectedApprovers,
          selectedReportingRole: selectedReportingRole,
          userId: currentUser?.id
        });
        setRequests(prev => prev.map(r => r.id === req.id ? response.data : r));
      } catch (error) {
        console.error("Action failed", error);
      }
    } else if (action === 'delete') {
      try {
        await api.delete(`/asset-requests/${req.id}`);
        setRequests(requests.filter(r => r.id !== req.id));
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    }
  };

  const handleAddRequest = async (data) => {
    try {
      const selectedPerson = data.selectedReportingTo;
      const forwardTo = selectedPerson
        ? (Array.isArray(selectedPerson) ? selectedPerson : [selectedPerson])
        : (Array.isArray(currentUser?.reportingTo) ? currentUser.reportingTo : currentUser?.reportingTo ? [currentUser.reportingTo] : []);

      const payload = {
        assetType: data.assetType,
        otherAssetType: data.otherAssetType || '',
        description: data.description,
        justification: data.justification,
        selectedReportingTo: forwardTo,
        selectedReportingRole: data.selectedReportingRole || '',
        requestedBy: currentUser?.id || 1,
        attachments: data.attachments || [],
        approvalSequence: data.approvalSequence || null,
        returnReply: data.returnReply || ''
      };
      
      if (editRequest) {
        const response = await api.put(`/asset-requests/${editRequest.id}`, payload);
        setRequests(requests.map(r => r.id === editRequest.id ? response.data : r));
      } else {
        const response = await api.post('/asset-requests', payload);
        setRequests([response.data, ...requests]);
      }
      setEditRequest(null);
      setIsNewRequestModalOpen(false);
    } catch (error) {
      console.error('Failed to update asset request:', error);
      throw error;
    }
  };

  const filteredRequests = myRequests.filter(r => {
    const displayStatus = (() => {
      return getDisplayStatus(r);
    })();

    const matchesSearch = !searchQuery ? true : (() => {
      const lowerQuery = searchQuery.toLowerCase();
      return (
        r?.id?.toString()?.toLowerCase().includes(lowerQuery) ||
        r?.item?.toLowerCase().includes(lowerQuery) ||
        r?.category?.toLowerCase().includes(lowerQuery)
      );
    })();
    
    const matchesDate = (() => {
      if (!dateFilter.startDate && !dateFilter.endDate) return true;
      if (!r.createdAt) return false;
      
      const reqDate = new Date(r.createdAt);
      if (isNaN(reqDate.getTime())) return true;
      
      reqDate.setHours(0, 0, 0, 0);
      
      if (dateFilter.startDate) {
        const start = new Date(dateFilter.startDate.getTime());
        start.setHours(0, 0, 0, 0);
        if (reqDate < start) return false;
      }
      if (dateFilter.endDate) {
        const end = new Date(dateFilter.endDate.getTime());
        end.setHours(23, 59, 59, 999);
        if (reqDate > end) return false;
      }
      
      return true;
    })();

    const matchesFilter = statusFilters.length === 0 ? true : statusFilters.some(f => 
      f === 'Pending' ? displayStatus.includes('Pending') : displayStatus === f
    );
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  const handleDownloadData = () => {
    if (filteredRequests.length === 0) return;
    
    // Format headers
    const headers = ['Request ID', 'Date', 'Category', 'Subject', 'Description', 'Status'];
    
    // Escape string for CSV
    const escapeCSV = (str) => {
      if (!str) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = filteredRequests.map(r => {
      const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';
      
      let displayStatus = r.status;

      return [
        escapeCSV(r.id),
        escapeCSV(date),
        escapeCSV(r.category),
        escapeCSV(r.item),
        escapeCSV(r.justification || ''),
        escapeCSV(displayStatus)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Requests_Data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Requests</h1>
        <p className="text-slate-500 mt-1 text-sm">Requests requiring your attention and requests returned for updates.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center px-5 py-3.5 w-full lg:max-w-2xl hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/50">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 placeholder:text-slate-400 text-base"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {isCurrentUserMD && (
            <div className="relative" ref={assignmentFilterRef}>
              <button
                type="button"
                aria-label="Assignment filter"
                aria-haspopup="listbox"
                aria-expanded={isAssignmentFilterOpen}
                onClick={() => setIsAssignmentFilterOpen(open => !open)}
                className={`inline-flex h-[42px] min-w-[150px] items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  isAssignmentFilterOpen
                    ? 'border-brand-300 bg-brand-50/40 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{assignmentFilter}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isAssignmentFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAssignmentFilterOpen && (
                <div role="listbox" aria-label="Assignment filter options" className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  {['Assigned', 'Not Assigned'].map(option => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={assignmentFilter === option}
                      onClick={() => {
                        setAssignmentFilter(option);
                        setIsAssignmentFilterOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        assignmentFilter === option
                          ? 'bg-emerald-50 font-medium text-emerald-700'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleDownloadData}
            disabled={filteredRequests.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download Excel</span>
          </button>

          <div className="relative" ref={dateFilterRef}>
            <div className="relative flex items-center bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm px-4 py-2 hover:bg-slate-50 transition-colors focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 gap-2">
              <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
              <button
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className="bg-transparent border-none focus:outline-none text-[13px] text-slate-700 font-medium cursor-pointer p-0 m-0 text-left whitespace-nowrap"
              >
                {dateFilter.startDate && dateFilter.endDate 
                  ? `${dateFilter.startDate.toLocaleDateString()} - ${dateFilter.endDate.toLocaleDateString()}` 
                  : <span className="text-slate-400">Select date range</span>}
              </button>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  onClick={() => setDateFilter({ startDate: null, endDate: null })}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 ml-auto"
                  title="Clear date filter"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {isDateFilterOpen && (
              <div className="absolute right-0 mt-2 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-10 animate-in fade-in slide-in-from-top-2 p-2 scale-90 origin-top-right text-sm green-calendar">
                <RangeCalendar
                  aria-label="Trip dates"
                  firstDayOfWeek="mon"
                  value={
                    dateFilter.startDate && dateFilter.endDate
                      ? {
                          start: parseDate(
                            `${dateFilter.startDate.getFullYear()}-${String(
                              dateFilter.startDate.getMonth() + 1
                            ).padStart(2, "0")}-${String(
                              dateFilter.startDate.getDate()
                            ).padStart(2, "0")}`
                          ),
                          end: parseDate(
                            `${dateFilter.endDate.getFullYear()}-${String(
                              dateFilter.endDate.getMonth() + 1
                            ).padStart(2, "0")}-${String(
                              dateFilter.endDate.getDate()
                            ).padStart(2, "0")}`
                          ),
                        }
                      : null
                  }
                  onChange={(range) => {
                    setDateFilter({
                      startDate: range?.start
                        ? range.start.toDate(getLocalTimeZone())
                        : null,
                      endDate: range?.end
                        ? range.end.toDate(getLocalTimeZone())
                        : null,
                    });
                    if (range?.start && range?.end) {
                      setIsDateFilterOpen(false);
                    }
                  }}
                >
                  <RangeCalendar.Header>
                    <RangeCalendar.Heading />
                    <RangeCalendar.NavButton slot="previous" />
                    <RangeCalendar.NavButton slot="next" />
                  </RangeCalendar.Header>

                  <RangeCalendar.Grid>
                    <RangeCalendar.GridHeader>
                      {(day) => (
                        <RangeCalendar.HeaderCell>
                          {day}
                        </RangeCalendar.HeaderCell>
                      )}
                    </RangeCalendar.GridHeader>

                    <RangeCalendar.GridBody>
                      {(date) => (
                        <RangeCalendar.Cell date={date} />
                      )}
                    </RangeCalendar.GridBody>
                  </RangeCalendar.Grid>
                </RangeCalendar>
              </div>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all shadow-sm ${
                statusFilters.length > 0 
                  ? 'bg-brand-50 border-brand-200 text-brand-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              Status
              {statusFilters.length > 0 && (
                <span className="flex items-center justify-center bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full ml-1">
                  {statusFilters.length}
                </span>
              )}
              <ChevronDown size={16} className={`ml-1 text-slate-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-10 animate-in fade-in slide-in-from-top-2 p-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Filter by Status</span>
                  {statusFilters.length > 0 && (
                    <button onClick={() => setStatusFilters([])} className="text-brand-600 hover:text-brand-700 normal-case text-xs">Clear</button>
                  )}
                </div>
                {filterOptions.map(option => (
                  <label key={option} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={statusFilters.includes(option)} 
                      onChange={() => toggleFilter(option)} 
                    />
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${statusFilters.includes(option) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {statusFilters.includes(option) && <Check size={14} />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <RequestTable 
        requests={filteredRequests} 
        role="requester" 
        variant="my-requests" 
        onAction={handleAction} 
      />


      <RequestDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        onAction={handleAction}
      />
      
      <NewRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => {
          setIsNewRequestModalOpen(false);
          setEditRequest(null);
        }} 
        onAdd={handleAddRequest}
        editRequest={editRequest}
      />
    </div>
  );
};

export default MyRequests;
