import React, { useState, useEffect, useRef, useContext } from 'react';

import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  Package, Clock, CheckCircle, RotateCcw, ShieldAlert,
  Plus, FileText, Search, BookOpen, ArrowRight, XCircle, Bell, X, Check, Calendar, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { format, subDays, subWeeks, subMonths, startOfWeek, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import StatCard from '../components/StatCard';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import NewRequestModal from '../components/NewRequestModal';
import { AppContext } from '../context/AppContext';

const CustomBarShape = (props) => {
  const { x, y, width, height, fill, payload, dataKey } = props;
  
  // Find the top-most key that has a value greater than 0
  const keys = ['Approved', 'Pending', 'Returned', 'Rejected'];
  let topKey = null;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (payload[keys[i]] > 0) {
      topKey = keys[i];
      break;
    }
  }

  const isTop = dataKey === topKey;

  if (!height || height === 0) return null;

  const radius = isTop ? 6 : 0;
  
  const getPath = (x, y, width, height, radius) => {
    if (radius === 0) return `M ${x},${y} h ${width} v ${height} h -${width} Z`;
    
    const r = Math.min(radius, width / 2, height);
    return `
      M ${x},${y + height}
      L ${x},${y + r}
      A ${r},${r} 0 0,1 ${x + r},${y}
      L ${x + width - r},${y}
      A ${r},${r} 0 0,1 ${x + width},${y + r}
      L ${x + width},${y + height}
      Z
    `;
  };

  return <path d={getPath(x, y, width, height, radius)} fill={fill} />;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, requests, setRequests, users, roles } = useContext(AppContext);
  const user = currentUser;

  const maxRoleLevel = roles && roles.length > 0 ? Math.max(...roles.map(r => r.level || 1)) : 0;
  const currentUserRoleObj = roles?.find(r => r.name === user?.role);
  const isLastLevel = currentUserRoleObj && currentUserRoleObj.level === maxRoleLevel;
  
  const dashboardRequests = requests;

  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [chartFilter, setChartFilter] = useState('Monthly');
  const [isChartFilterOpen, setIsChartFilterOpen] = useState(false);
  const [pieCategory, setPieCategory] = useState('New Request');
  const [pieMonthOffset, setPieMonthOffset] = useState(0);
  const [isPieCategoryOpen, setIsPieCategoryOpen] = useState(false);
  const [isPieMonthOpen, setIsPieMonthOpen] = useState(false);
  const pieCategoryRef = useRef(null);
  const pieMonthRef = useRef(null);

  const generateChartData = (reqs, filterType, isReceived = false) => {
    const data = [];
    const now = new Date();

    const getDisplayStatus = (r) => {
      const roleName = currentUser?.role === 'md' ? 'MD' : (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : '');
      let isCurrentlyPendingWithMe = false;
      if (r.status === `Pending with ${roleName}`) {
        if (!r.forwardedTo || r.forwardedTo.length === 0) {
          isCurrentlyPendingWithMe = true;
        } else {
          isCurrentlyPendingWithMe = (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          });
        }
      }

      if (isCurrentlyPendingWithMe) return r.status || '';

      if (r.requestedBy !== currentUser?.id && r.handledBy && r.handledBy.includes(currentUser?.id)) {
        const myLastAction = [...(r.commentsHistory || [])].reverse().find(c => c.name === currentUser?.name);
        if (myLastAction) {
          if (myLastAction.action === 'approve') return 'Approved';
          if (myLastAction.action === 'reject') return 'Rejected';
          if (myLastAction.action === 'return') return 'Returned';
        }
        return 'Handled';
      }

      if (r.commentsHistory && r.commentsHistory.length > 0) {
        const lastAction = r.commentsHistory[r.commentsHistory.length - 1];
        if (lastAction.action === 'return' && r.requestedBy === currentUser?.id) {
          return 'Returned';
        }
      }
      return r.status || '';
    };

    const getStatusForCreated = (r) => {
      return getDisplayStatus(r);
    };

    const getStatusForReceived = (r) => {
      let status = getDisplayStatus(r);
      if (status.includes('Pending')) return 'Pending';
      return status;
    };

    const getCounts = (slice, isReceived = false) => {
      const fn = isReceived ? getStatusForReceived : getStatusForCreated;
      return {
        Approved: slice.filter(r => fn(r) === 'Approved').length,
        Pending: slice.filter(r => fn(r).includes('Pending')).length,
        Returned: slice.filter(r => fn(r) === 'Returned').length,
        Rejected: slice.filter(r => fn(r) === 'Rejected').length,
      };
    };

    if (filterType === 'Daily') {
      for (let i = 6; i >= 0; i--) {
        const targetDate = subDays(now, i);
        const label = format(targetDate, 'dd MMM');
        const slice = reqs.filter(r => r.createdAt && isSameDay(new Date(r.createdAt), targetDate));
        data.push({ name: label, ...getCounts(slice, isReceived) });
      }
    } else if (filterType === 'Weekly') {
      for (let i = 5; i >= 0; i--) {
        const targetDate = subWeeks(now, i);
        const label = `Week of ${format(startOfWeek(targetDate), 'dd MMM')}`;
        const slice = reqs.filter(r => r.createdAt && isSameWeek(new Date(r.createdAt), targetDate));
        data.push({ name: label, ...getCounts(slice, isReceived) });
      }
    } else if (filterType === 'Monthly') {
      for (let i = 11; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const label = format(targetDate, 'MMM yyyy');
        const slice = reqs.filter(r => r.createdAt && isSameMonth(new Date(r.createdAt), targetDate));
        data.push({ name: label, ...getCounts(slice, isReceived) });
      }
    } else {
      // Yearly
      const years = new Set();
      reqs.forEach(r => {
        if (r.createdAt) years.add(format(new Date(r.createdAt), 'yyyy'));
      });
      years.add(format(now, 'yyyy'));
      const sortedYears = Array.from(years).sort();
      sortedYears.forEach(yearStr => {
        const slice = reqs.filter(r => r.createdAt && format(new Date(r.createdAt), 'yyyy') === yearStr);
        data.push({ name: yearStr, ...getCounts(slice) });
      });
    }
    return data;
  };

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

    const hasVoted = r.handledBy && r.handledBy.includes(user?.id);
    if (hasVoted) return false;

    if (isForwardedToMe) return true;
    const roleName = user?.role === 'md' ? 'MD' : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : '');
    
    if (r.status === `Pending with ${roleName}` && (!r.forwardedTo || r.forwardedTo.length === 0) && isReportingToMe && !hasVoted) {
      return true;
    }
    
    return false;
  });

  const [isNotificationOpen, setIsNotificationOpen] = useState(pendingRequestsForMe.length > 0);

  const prevPendingCount = useRef(pendingRequestsForMe.length);
  
  useEffect(() => {
    if (pendingRequestsForMe.length > prevPendingCount.current) {
      setIsNotificationOpen(true);
    }
    prevPendingCount.current = pendingRequestsForMe.length;
  }, [pendingRequestsForMe.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pieCategoryRef.current && !pieCategoryRef.current.contains(event.target)) {
        setIsPieCategoryOpen(false);
      }
      if (pieMonthRef.current && !pieMonthRef.current.contains(event.target)) {
        setIsPieMonthOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action, req, remarks, selectedApprovers, selectedReportingRole) => {
    if (['approve', 'reject', 'return'].includes(action)) {
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

  const handleAddRequest = async (data) => {
    try {
      const payload = {
        assetType: data.assetType,
        otherAssetType: data.otherAssetType || '',
        description: data.description,
        justification: data.justification,
        selectedReportingTo: data.selectedReportingTo || (Array.isArray(user?.reportingTo) ? user.reportingTo : user?.reportingTo ? [user.reportingTo] : []),
        requestedBy: user?.id || 1
      };
      
      const response = await api.post('/asset-requests', payload);
      setRequests([response.data, ...requests]);
    } catch (error) {
      console.error('Failed to create asset request:', error);
      alert('Failed to create request. Please try again.');
    }
  };

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

  // Data for Chart 1: Requests I Created
  const myCreatedRequestsRaw = requests.filter(r => r.requestedBy === user?.id);
  const myCreatedData = generateChartData(myCreatedRequestsRaw, chartFilter);

  // Logic for Requests Received (Assigned to Me)
  const myReceivedRequestsRaw = requests.filter(r => {
    // Optionally exclude my own requests from "received"
    if (r.requestedBy === user?.id) return false;
    
    if (user?.role?.toLowerCase() === 'admin') return true;
    
    const requester = users.find(u => u.id === r.requestedBy);
    if (!requester) return false;
    
    const isReportingToMe = (() => {
      if (r.forwardedTo && r.forwardedTo.length > 0) {
        return (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {
          const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
          return nameStr?.toLowerCase()?.trim() === user?.name?.toLowerCase()?.trim();
        });
      }
      if (r.routedTo) {
        return Array.isArray(r.routedTo) ? r.routedTo.includes(user?.name) : r.routedTo === user?.name;
      }
      return Array.isArray(requester.reportingTo)
        ? requester.reportingTo.includes(user?.name)
        : requester.reportingTo === user?.name;
    })();
      
    return isReportingToMe || r.handledBy?.includes(user?.id);
  });
  
  const myReceivedData = generateChartData(myReceivedRequestsRaw, chartFilter, true);

  // Pie Chart Data (Category Distribution for Selected Category & Month)
  const targetMonth = subMonths(new Date(), pieMonthOffset);
  const baseReqsForPie = pieCategory === 'New Request' ? myCreatedRequestsRaw : myReceivedRequestsRaw;
  const filteredPieReqs = baseReqsForPie.filter(r => {
    return r.createdAt && isSameMonth(new Date(r.createdAt), targetMonth);
  });

  const categoryCounts = filteredPieReqs.reduce((acc, req) => {
    const cat = req.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  // Base colors for categories
  const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
  
  const pieData = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]) // sort by count descending
    .map(([name, value], index) => ({
      name,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  
  const PIE_COLORS = pieData.map(d => d.color);

  // Recent Messages (Latest 5 requests created by me)
  const recentMessages = Array.from(new Set([...myCreatedRequestsRaw]))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const getTimelineSteps = (req) => {
    const requester = users.find(u => u.id === req.requestedBy);
    const steps = [{ label: 'Submitted', status: 'completed' }];
    const chain = [];
    
    // Build chain dynamically from forwardedTo or routedTo
    let routeList = req.forwardedTo || req.routedTo || [];
    if (!Array.isArray(routeList)) {
        routeList = [routeList];
    }
    
    if (routeList.length > 0) {
        routeList.forEach(n => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            const match = nameStr.match(/\((.*?)\)/);
            if (match) {
                const role = match[1].toUpperCase() === 'MD' ? 'MD' : match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                chain.push(role);
            } else {
                chain.push(nameStr.trim());
            }
        });
    } else {
        // Fallback to requester's default reportingTo
        let defaultRep = requester?.reportingTo || [];
        if (!Array.isArray(defaultRep)) defaultRep = [defaultRep];
        defaultRep.forEach(nameStr => {
            const match = nameStr.match(/\((.*?)\)/);
            if (match) {
                const role = match[1].toUpperCase() === 'MD' ? 'MD' : match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                chain.push(role);
            } else {
                chain.push(nameStr.trim());
            }
        });
    }

    // Fallback if still empty
    if (chain.length === 0) {
        if (requester?.role === 'user') {
           chain.push('Manager', 'MD');
        } else if (requester?.role === 'incharge' || requester?.role === 'manager') {
           chain.push('MD');
        }
    }

    // Deduplicate consecutive same roles
    const uniqueChain = chain.filter((item, pos, arr) => pos === 0 || item !== arr[pos-1]);

    let reachedFailedState = false;

    uniqueChain.forEach(role => {
       let stepStatus = 'pending';
       
       if (req.status === 'Approved') {
           stepStatus = 'completed';
       } else if (req.status?.toLowerCase().includes(`pending with ${role.toLowerCase()}`)) {
           stepStatus = 'current';
       } else if (req.status === 'Rejected' || req.status === 'Returned') {
           const roleVoted = Object.entries(req.votes || {}).some(([uid, vote]) => {
               const u = users.find(u => String(u.id) === String(uid));
               const uRole = u?.role?.toLowerCase() === 'incharge' ? 'Incharge' : u?.role; // Use Incharge or Manager
               return (uRole?.toLowerCase() === role.toLowerCase() || (uRole === 'Incharge' && role === 'Manager')) && (vote === 'reject' || vote === 'return');
           });
           
           if (roleVoted) {
               stepStatus = req.status.toLowerCase();
               reachedFailedState = true;
           } else if (reachedFailedState) {
               stepStatus = 'pending';
           } else {
               stepStatus = 'completed';
           }
       } else {
           const currentPendingIndex = uniqueChain.findIndex(r => req.status?.toLowerCase().includes(`pending with ${r.toLowerCase()}`));
           const thisIndex = uniqueChain.indexOf(role);
           
           // Check explicit approval from votes for ANY user matching this name/role
           const usersWithRoleOrName = users.filter(u => u.name?.toLowerCase().trim() === role.toLowerCase().trim() || u.role?.toLowerCase().trim() === role.toLowerCase().trim() || (u.role?.toLowerCase() === 'incharge' && role.toLowerCase() === 'manager'));
           const hasApproved = req.votes && usersWithRoleOrName.some(u => req.votes[u.id] === 'approve' || req.votes[String(u.id)] === 'approve');
           
           if (hasApproved) {
               stepStatus = 'completed';
           } else if (currentPendingIndex !== -1 && thisIndex < currentPendingIndex) {
               stepStatus = 'completed';
           }
       }
       
       steps.push({ label: role, status: stepStatus });
    });

    steps.push({ 
      label: 'Done', 
      status: req.status === 'Approved' ? 'completed' : 'pending' 
    });

    return steps;
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">
            Welcome, {user?.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 hover:border-brand-200 transition-all shadow-sm relative focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                                {(() => {
                                  const hasReturnOrEdit = req.commentsHistory && req.commentsHistory.some(c => c.action === 'edit' || c.action === 'return');
                                  const lastActor = req.commentsHistory && req.commentsHistory.length > 0 ? req.commentsHistory[req.commentsHistory.length - 1].name : getRequesterName(req.requestedBy);
                                  
                                  if (hasReturnOrEdit) {
                                    return <>Updated Request from <span className="font-semibold text-brand-600 capitalize">{lastActor}</span></>;
                                  } else {
                                    return <>New Request from <span className="font-semibold text-brand-600 capitalize">{getRequesterName(req.requestedBy)}</span></>;
                                  }
                                })()}
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
      </div>

      {/* Charts Section */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1 text-sm">Overview of your asset requests and track their current statuses.</p>
          </div>
        {/* Monthly Button */}
        <div className="relative z-20">
          <button 
            onClick={() => setIsChartFilterOpen(!isChartFilterOpen)}
            onBlur={() => setTimeout(() => setIsChartFilterOpen(false), 200)}
            className="flex items-center justify-between min-w-[110px] gap-2 text-sm border border-slate-200 rounded-full px-4 h-11 bg-white text-slate-700 font-bold focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm hover:bg-slate-50"
          >
            <span>{chartFilter}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isChartFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isChartFilterOpen && (
            <div className="absolute right-0 mt-2 w-full min-w-[130px] bg-white rounded-xl shadow-lg border border-slate-100 z-30 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
              {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setChartFilter(option);
                    setIsChartFilterOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${chartFilter === option ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Requests I Created */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
              New Request
            </h2>
          </div>
          <div className="h-72 w-full mt-2 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={myCreatedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={28} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={15} 
                  interval={0}
                  angle={chartFilter === 'Monthly' || chartFilter === 'Daily' || chartFilter === 'Weekly' ? -35 : 0}
                  textAnchor={chartFilter === 'Monthly' || chartFilter === 'Daily' || chartFilter === 'Weekly' ? 'end' : 'middle'}
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59,130,246,0.04)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: '500', padding: '8px 12px', fontSize: '13px' }}
                  itemStyle={{ padding: '2px 0', fontSize: '13px' }}
                  labelStyle={{ fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="Approved" stackId="a" fill="#005400" shape={(props) => <CustomBarShape {...props} dataKey="Approved" />} />
                <Bar dataKey="Pending" stackId="a" fill="#007816" shape={(props) => <CustomBarShape {...props} dataKey="Pending" />} />
                <Bar dataKey="Returned" stackId="a" fill="#009E3B" shape={(props) => <CustomBarShape {...props} dataKey="Returned" />} />
                <Bar dataKey="Rejected" stackId="a" fill="#22C55E" shape={(props) => <CustomBarShape {...props} dataKey="Rejected" />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Requests Assigned to Me */}
        {!isLastLevel && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
              My Request
            </h2>
          </div>
          <div className="h-72 w-full mt-2 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={myReceivedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={28} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={15} 
                  interval={0}
                  angle={chartFilter === 'Monthly' || chartFilter === 'Daily' || chartFilter === 'Weekly' ? -35 : 0}
                  textAnchor={chartFilter === 'Monthly' || chartFilter === 'Daily' || chartFilter === 'Weekly' ? 'end' : 'middle'}
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59,130,246,0.04)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: '500', padding: '8px 12px', fontSize: '13px' }}
                  itemStyle={{ padding: '2px 0', fontSize: '13px' }}
                  labelStyle={{ fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="Approved" stackId="a" fill="#005400" shape={(props) => <CustomBarShape {...props} dataKey="Approved" />} />
                <Bar dataKey="Pending" stackId="a" fill="#007816" shape={(props) => <CustomBarShape {...props} dataKey="Pending" />} />
                <Bar dataKey="Returned" stackId="a" fill="#009E3B" shape={(props) => <CustomBarShape {...props} dataKey="Returned" />} />
                <Bar dataKey="Rejected" stackId="a" fill="#22C55E" shape={(props) => <CustomBarShape {...props} dataKey="Rejected" />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

      </div>
      </div>

      {/* Second Row: Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
              Category Distribution
            </h2>
            <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200">
              {/* Category Dropdown */}
              <div className="relative" ref={pieCategoryRef}>
                <button 
                  onClick={() => setIsPieCategoryOpen(!isPieCategoryOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all bg-white text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 border-none mr-1"
                >
                  {pieCategory}
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                {isPieCategoryOpen && (
                  <div className="absolute right-0 mt-1 bg-white border border-slate-200/60 rounded-xl shadow-lg z-20 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2">
                    {['New Request', ...(isLastLevel ? [] : ['My Request'])].map((cat) => (
                      <button
                        key={cat}
                        className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors ${pieCategory === cat ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        onClick={() => {
                          setPieCategory(cat);
                          setIsPieCategoryOpen(false);
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Month Dropdown */}
              <div className="relative" ref={pieMonthRef}>
                <button 
                  onClick={() => setIsPieMonthOpen(!isPieMonthOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all bg-white text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 border-none"
                >
                  {format(subMonths(new Date(), pieMonthOffset), 'MMM yyyy')}
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                {isPieMonthOpen && (
                  <div className="absolute right-0 mt-1 bg-white border border-slate-200/60 rounded-xl shadow-lg z-20 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2">
                    {[0, 1, 2, 3, 4, 5].map(offset => {
                      const monthStr = format(subMonths(new Date(), offset), 'MMM yyyy');
                      return (
                        <button
                          key={offset}
                          className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors ${pieMonthOffset === offset ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          onClick={() => {
                            setPieMonthOffset(offset);
                            setIsPieMonthOpen(false);
                          }}
                        >
                          {monthStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="h-72 w-full mt-2 relative z-0 flex items-center justify-center overflow-hidden">
            {pieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full px-4">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip 
                        cursor={{ fill: 'rgba(59,130,246,0.04)' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '500' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                      />
                      <Pie
                        data={pieData}
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text (Total count) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-800">
                      {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Total
                    </span>
                  </div>
                </div>

                {/* Custom Legend for Category Distribution */}
                <div className="flex flex-col gap-3 w-full max-w-[200px]">
                  {pieData.map((item, idx) => {
                    const totalPie = pieData.reduce((acc, curr) => acc + curr.value, 0);
                    return (
                      <div key={item.name} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2.5 w-24">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                          <span className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</span>
                        </div>
                        <div className="flex items-center justify-end gap-4 flex-1">
                          <span className="font-bold text-slate-900">{item.value}</span>
                          <span className="w-9 text-right text-slate-400 font-medium text-[12px]">
                            {totalPie > 0 ? Math.round((item.value / totalPie) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 font-medium text-sm">No data available</div>
            )}
          </div>
        </div>




      </div>



    </div>
  );
};

export default Dashboard;
