import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search, Filter, Check, ChevronDown, Plus, Trash2, Bell, X, Package, CheckCircle, Download } from 'lucide-react';
import StatCard from '../components/StatCard';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import NewRequestModal from '../components/NewRequestModal';
import RequestDetailsModal from '../components/RequestDetailsModal';
import { AppContext } from '../context/AppContext';

const NewRequest = () => {
  const navigate = useNavigate();
  const { currentUser, requests, setRequests, users, roles } = useContext(AppContext);
  const user = currentUser;
  
  const maxRoleLevel = roles && roles.length > 0 ? Math.max(...roles.map(r => r.level || 1)) : 0;
  const currentUserRoleObj = roles?.find(r => r.name === user?.role);
  const isLastLevel = currentUserRoleObj && currentUserRoleObj.level === maxRoleLevel;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [editRequestForModal, setEditRequestForModal] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const filterRef = useRef(null);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const pendingRequestsForMe = requests.filter(r => {
    if (user?.role === 'admin') return r.status?.includes('Pending');
    
    if (r.requestedBy === user?.id) {
       return r.status === 'Returned';
    }
    
    const requester = users.find(u => u.id === r.requestedBy);
    if (!requester) return false;
    
    const isForwardedToMe = (() => {
      if (r.forwardedTo && r.forwardedTo.length > 0) {
        return (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
          const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
          return nameStr?.toLowerCase()?.trim() === user?.name?.toLowerCase()?.trim();
        });
      }
      return false;
    })();

    const isReportingToMe = (() => {
      if (r.routedTo) {
        return Array.isArray(r.routedTo) ? r.routedTo.includes(user?.name) : r.routedTo === user?.name;
      }
      return Array.isArray(requester.reportingTo)
        ? requester.reportingTo.includes(user?.name)
        : requester.reportingTo === user?.name;
    })();

    if (!r.status?.includes('Pending')) return false;

    if (isForwardedToMe) return true;

    const hasVoted = r.handledBy && r.handledBy.includes(user?.id);
    const roleName = user?.role === 'md' ? 'MD' : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : '');
    
    if (r.status === `Pending with ${roleName}` && (!r.forwardedTo || r.forwardedTo.length === 0) && isReportingToMe && !hasVoted) {
      return true;
    }
    
    return false;
  });

  const prevPendingCount = useRef(pendingRequestsForMe.length);

  useEffect(() => {
    if (pendingRequestsForMe.length > prevPendingCount.current) {
      setIsNotificationOpen(true);
    }
    prevPendingCount.current = pendingRequestsForMe.length;
  }, [pendingRequestsForMe.length]);

  const getRequesterName = (id) => {
    const found = users.find(u => u.id === id);
    return found ? found.name : 'Unknown User';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const toggleFilter = (option) => {
    setStatusFilters(prev => 
      prev.includes(option) ? prev.filter(f => f !== option) : [...prev, option]
    );
  };
  const handleAction = async (action, req, remarks, selectedApprovers, selectedReportingRole) => {
    if (action === 'delete') {
      setRequestToDelete(req);
    } else if (action === 'viewDetailsModal' || action === 'view') {
      setSelectedRequestForModal(req);
      setIsDetailsModalOpen(true);
    } else if (action === 'edit') {
      setEditRequestForModal(req);
      setIsNewRequestModalOpen(true);
    } else if (['approve', 'reject', 'return'].includes(action)) {
      try {
        const response = await api.put(`/asset-requests/${req.id}/action`, {
          action: action,
          remarks: remarks,
          selectedApprovers: selectedApprovers,
          selectedReportingRole: selectedReportingRole,
          userId: user?.id
        });
        setRequests(prev => prev.map(r => r.id === req.id ? response.data : r));
      } catch (error) {
        console.error("Action failed", error);
      }
    }
  };

  const confirmDelete = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/asset-requests/${requestToDelete.id}`);
        setRequests(requests.filter(r => r.id !== requestToDelete.id));
        setRequestToDelete(null);
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
        : (Array.isArray(user?.reportingTo) ? user.reportingTo : user?.reportingTo ? [user.reportingTo] : []);

      const payload = {
        assetType: data.assetType,
        otherAssetType: data.otherAssetType || '',
        description: data.description,
        justification: data.justification,
        selectedReportingTo: forwardTo,
        selectedReportingRole: data.selectedReportingRole || '',
        requestedBy: user?.id || 1,
        attachments: data.attachments || []
      };
      
      if (editRequestForModal) {
        const response = await api.put(`/asset-requests/${editRequestForModal.id}`, payload);
        setRequests(requests.map(r => r.id === editRequestForModal.id ? response.data : r));
      } else {
        const response = await api.post('/asset-requests', payload);
        setRequests([response.data, ...requests]);
      }
      setEditRequestForModal(null);
    } catch (error) {
      console.error('Failed to create asset request:', error);
      alert('Failed to create request. Please try again.');
    }
  };
  const myOwnRequests = requests.filter(r => r.requestedBy === currentUser?.id);

  const filterOptions = ['Approved', 'Pending', 'Returned', 'Rejected'];
  if (myOwnRequests.some(r => r.status === 'Hold')) {
    filterOptions.push('Hold');
  }

  const stats = [
    { title: 'Total Request', value: myOwnRequests.length },
    { 
      title: 'Approved Request', 
      value: myOwnRequests.filter(r => r.status === 'Approved').length 
    },
    { 
      title: 'Pending Request', 
      value: myOwnRequests.filter(r => r.status?.includes('Pending')).length 
    },
    { title: 'Rejected', value: myOwnRequests.filter(r => r.status === 'Rejected').length }
  ];

  const filteredRequests = myOwnRequests.filter(r => {
    const matchesSearch = r?.id?.toString()?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      r?.item?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      r?.category?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      r?.status?.toLowerCase()?.includes(searchQuery.toLowerCase());
      
    if (statusFilters.length === 0) return matchesSearch;
    
    const matchesFilter = statusFilters.some(f => 
      f === 'Pending' ? r.status?.includes('Pending') : r.status === f
    );
    
    return matchesSearch && matchesFilter;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            New Request
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Submit a new request for an asset and track your request history.</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 hover:border-brand-200 transition-all shadow-sm relative focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <Bell size={20} />
            {pendingRequestsForMe.length > 0 && (
              <span className="absolute top-0 right-0 min-w-[22px] h-[22px] bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white px-1.5 border-2 border-white shadow-sm -translate-y-1/4 translate-x-1/4">
                {pendingRequestsForMe.length}
              </span>
            )}
          </button>
          
          {isNotificationOpen && (
            <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Notifications</span>
                  {pendingRequestsForMe.length > 0 && <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{pendingRequestsForMe.length} New</span>}
                </div>
                <button onClick={() => setIsNotificationOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200/50">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[190px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {pendingRequestsForMe.length > 0 ? (
                  <div className="flex flex-col">
                    {pendingRequestsForMe.map((req, idx) => (
                      <div key={req.id} onClick={() => { setIsNotificationOpen(false); navigate(isLastLevel ? '/app/new-request' : '/app/my-requests'); }} className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${idx !== pendingRequestsForMe.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Package size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800">{req.id}</p>
                            <p className="text-sm text-slate-600 mt-1 leading-snug">
                              {req.status === 'Returned' || (req.commentsHistory && req.commentsHistory.length > 0 && req.commentsHistory[req.commentsHistory.length - 1].action === 'return') 
                                ? <>Returned Request from <span className="font-semibold text-brand-600 capitalize">{getRequesterName(req.requestedBy)}</span></>
                                : <>New Request from <span className="font-semibold text-brand-600 capitalize">{getRequesterName(req.requestedBy)}</span></>}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{formatDateTime(req.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <CheckCircle size={32} className="text-slate-200 mb-2" />
                    <p className="text-sm font-medium text-slate-600">All caught up!</p>
                    <p className="text-xs mt-1">No pending requests for you.</p>
                  </div>
                )}
              </div>
              
              {/* View All Button */}
              {pendingRequestsForMe.length > 0 && (
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                  <button 
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors" 
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate(isLastLevel ? '/app/new-request' : '/app/my-requests');
                    }}
                  >
                    View All Requests
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

        <Button 
          variant="primary" 
          size="lg" 
          className="shadow-md shadow-brand-500/20 whitespace-nowrap flex-shrink-0" 
          onClick={() => setIsNewRequestModalOpen(true)}
        >
          <Plus size={20} className="mr-2" /> New Request
        </Button>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Requests</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadData}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download Excel</span>
            </button>
            <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
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
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-10 animate-in fade-in slide-in-from-top-2 p-2">
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
        <RequestTable requests={filteredRequests} role="requester" onAction={handleAction} />
      </div>

      <RequestDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        request={selectedRequestForModal}
        onAction={handleAction}
      />

      <NewRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => {
          setIsNewRequestModalOpen(false);
          setEditRequestForModal(null);
        }} 
        onAdd={handleAddRequest}
        editRequest={editRequestForModal}
      />

      {requestToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Request?</h3>
              <p className="text-slate-500 mb-6">
                Are you sure you want to delete this request ({requestToDelete.id})? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setRequestToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" onClick={confirmDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRequest;
