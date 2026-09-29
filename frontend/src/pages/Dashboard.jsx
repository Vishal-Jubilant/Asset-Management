import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  Package, Clock, CheckCircle, RotateCcw, ShieldAlert,
  Plus, FileText, Search, BookOpen, ArrowRight, XCircle, Bell, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, subWeeks, subMonths, startOfWeek, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import StatCard from '../components/StatCard';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import NewRequestModal from '../components/NewRequestModal';
import { AppContext } from '../context/AppContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, requests, setRequests, users } = useContext(AppContext);
  const user = currentUser;
  
  const dashboardRequests = requests;

  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [createdFilter, setCreatedFilter] = useState('Monthly');
  const [receivedFilter, setReceivedFilter] = useState('Monthly');

  const generateChartData = (reqs, filterType) => {
    const data = [];
    const now = new Date();

    if (filterType === 'Daily') {
      for (let i = 6; i >= 0; i--) {
        const targetDate = subDays(now, i);
        const label = format(targetDate, 'dd MMM');
        const slice = reqs.filter(r => r.createdAt && isSameDay(new Date(r.createdAt), targetDate));
        data.push({
          name: label,
          Approved: slice.filter(r => r.status === 'Approved').length,
          Pending: slice.filter(r => r.status?.includes('Pending')).length,
          Returned: slice.filter(r => r.status === 'Returned').length,
          Rejected: slice.filter(r => r.status === 'Rejected').length,
        });
      }
    } else if (filterType === 'Weekly') {
      for (let i = 5; i >= 0; i--) {
        const targetDate = subWeeks(now, i);
        const label = `Week of ${format(startOfWeek(targetDate), 'dd MMM')}`;
        const slice = reqs.filter(r => r.createdAt && isSameWeek(new Date(r.createdAt), targetDate));
        data.push({
          name: label,
          Approved: slice.filter(r => r.status === 'Approved').length,
          Pending: slice.filter(r => r.status?.includes('Pending')).length,
          Returned: slice.filter(r => r.status === 'Returned').length,
          Rejected: slice.filter(r => r.status === 'Rejected').length,
        });
      }
    } else if (filterType === 'Monthly') {
      for (let i = 11; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const label = format(targetDate, 'MMM yyyy');
        const slice = reqs.filter(r => r.createdAt && isSameMonth(new Date(r.createdAt), targetDate));
        data.push({
          name: label,
          Approved: slice.filter(r => r.status === 'Approved').length,
          Pending: slice.filter(r => r.status?.includes('Pending')).length,
          Returned: slice.filter(r => r.status === 'Returned').length,
          Rejected: slice.filter(r => r.status === 'Rejected').length,
        });
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
        data.push({
          name: yearStr,
          Approved: slice.filter(r => r.status === 'Approved').length,
          Pending: slice.filter(r => r.status?.includes('Pending')).length,
          Returned: slice.filter(r => r.status === 'Returned').length,
          Rejected: slice.filter(r => r.status === 'Rejected').length,
        });
      });
    }
    return data;
  };

  const pendingRequestsForMe = requests.filter(r => {
    if (user?.role === 'admin') return r.status?.includes('Pending');
    
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
      
    return r.status?.includes('Pending') && isReportingToMe;
  });

  const [isNotificationOpen, setIsNotificationOpen] = useState(pendingRequestsForMe.length > 0);

  const prevPendingCount = useRef(pendingRequestsForMe.length);
  
  useEffect(() => {
    if (pendingRequestsForMe.length > prevPendingCount.current) {
      setIsNotificationOpen(true);
    }
    prevPendingCount.current = pendingRequestsForMe.length;
  }, [pendingRequestsForMe.length]);

  const handleAction = async (action, req, remarks, selectedApprovers) => {
    if (['approve', 'reject', 'return'].includes(action)) {
      try {
        const response = await api.put(`/asset-requests/${req.id}/action`, {
          action: action,
          remarks: remarks,
          selectedApprovers: selectedApprovers,
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
  const myCreatedData = generateChartData(myCreatedRequestsRaw, createdFilter);

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
  
  const myReceivedData = generateChartData(myReceivedRequestsRaw, receivedFilter);

  // Pie Chart Data (Category Distribution)
  const categoryCounts = myCreatedRequestsRaw.reduce((acc, req) => {
    const cat = req.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.keys(categoryCounts).map(key => ({ name: key, value: categoryCounts[key] }));
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

  // Recent Messages (Latest 5 requests overall)
  const recentMessages = [...requests]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
            Welcome, {user?.name?.split(' ')[0]} <span className="ml-2 origin-bottom-right hover:animate-waving-hand inline-block">👋</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Welcome to your dashboard.</p>
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
                      <div key={req.id} onClick={() => { setIsNotificationOpen(false); navigate('/app/my-requests'); }} className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${idx !== pendingRequestsForMe.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Package size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800">{req.id}</p>
                            <p className="text-sm text-slate-600 mt-1 leading-snug">
                              New Asset Request from <span className="font-semibold text-brand-600">{getRequesterName(req.requestedBy)}</span>
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
                      navigate('/app/my-requests');
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Requests I Created */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-brand-500 rounded-full mr-3"></div>
              New Request
            </h2>
            <select 
              value={createdFilter} 
              onChange={(e) => setCreatedFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer shadow-sm relative"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <div className="h-96 w-full mt-2 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={myCreatedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={15} 
                  interval={0}
                  angle={createdFilter === 'Monthly' || createdFilter === 'Daily' || createdFilter === 'Weekly' ? -35 : 0}
                  textAnchor={createdFilter === 'Monthly' || createdFilter === 'Daily' || createdFilter === 'Weekly' ? 'end' : 'middle'}
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '500' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="Approved" stackId="a" fill="#10b981">
                  <LabelList dataKey="Approved" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b">
                  <LabelList dataKey="Pending" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Returned" stackId="a" fill="#8b5cf6">
                  <LabelList dataKey="Returned" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Rejected" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Rejected" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Requests Assigned to Me */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></div>
              My Request
            </h2>
            <select 
              value={receivedFilter} 
              onChange={(e) => setReceivedFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm relative"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <div className="h-96 w-full mt-2 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={myReceivedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={15} 
                  interval={0}
                  angle={receivedFilter === 'Monthly' || receivedFilter === 'Daily' || receivedFilter === 'Weekly' ? -35 : 0}
                  textAnchor={receivedFilter === 'Monthly' || receivedFilter === 'Daily' || receivedFilter === 'Weekly' ? 'end' : 'middle'}
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '500' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="Approved" stackId="a" fill="#10b981">
                  <LabelList dataKey="Approved" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b">
                  <LabelList dataKey="Pending" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Returned" stackId="a" fill="#8b5cf6">
                  <LabelList dataKey="Returned" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Rejected" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Rejected" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Second Row: Pie Chart & Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 flex items-center mb-6">
            <div className="w-2 h-6 bg-pink-500 rounded-full mr-3"></div>
            Category Breakdown
          </h2>
          <div className="flex-1 flex items-center justify-center min-h-[320px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '500' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '500', color: '#475569' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 font-medium">No category data available.</p>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-2 h-6 bg-sky-500 rounded-full mr-3"></div>
              Recent Activity
            </h2>
            <button onClick={() => navigate('/app/my-requests')} className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {recentMessages.length > 0 ? (
              <div className="space-y-4">
                {recentMessages.map((msg, i) => (
                  <div key={msg.id || i} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] cursor-pointer hover:-translate-y-0.5" onClick={() => navigate('/app/my-requests')}>
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-500">
                      <Bell size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-[13px] font-bold text-slate-800">{msg.id || 'New Request'}</p>
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatDateTime(msg.createdAt).split(' | ')[0]}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        <span className="font-semibold text-slate-800">{getRequesterName(msg.requestedBy)}</span> requested a <span className="font-semibold text-slate-800">{msg.category || 'Asset'}</span>.
                        {msg.justification && <span className="text-slate-500 italic"> "{msg.justification}"</span>}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          msg.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                          msg.status?.includes('Pending') ? 'bg-amber-100 text-amber-700' :
                          msg.status === 'Returned' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Package size={32} className="mb-3 opacity-30" />
                <p className="font-medium text-sm">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
