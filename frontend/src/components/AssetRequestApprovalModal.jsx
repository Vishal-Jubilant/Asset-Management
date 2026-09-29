import React, { useState } from 'react';
import {
  X,
  Check,
  Clock,
  User,
  Hash,
  Tag,
  ChevronDown,
  ChevronRight,
  Monitor,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

const mockData = {
  id: "REQ-2023-089",
  title: "MacBook Pro M2 Max 64GB",
  date: "Oct 24, 2023 at 10:30 AM",
  status: "pending",
  category: "Hardware",
  requester: {
    name: "Sarah Jenkins",
    role: "Senior Designer",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  description: "My current machine is struggling with the new 3D rendering workflow. Requesting an upgrade to handle the upcoming Q4 campaigns efficiently.",
  levels: [
    {
      id: "admin",
      label: "IT Administration",
      status: "approved",
      approvers: [
        {
          id: "a1",
          name: "Mike Chen",
          role: "IT Specialist",
          avatar: "https://i.pravatar.cc/150?u=mike",
          status: "approved",
          comment: "Checked inventory. We have one in stock.",
          sentTo: "IT Support Queue",
          receivedAt: "Oct 24, 2023, 10:35 AM",
          actionAt: "Oct 24, 2023, 11:15 AM"
        }
      ]
    },
    {
      id: "md",
      label: "Managing Director",
      status: "pending",
      approvers: [
        {
          id: "m1",
          name: "Alex Rivera",
          role: "Design Director",
          avatar: "https://i.pravatar.cc/150?u=alex",
          status: "pending",
          comment: "",
          sentTo: "Direct Line Manager",
          receivedAt: "Oct 24, 2023, 11:15 AM",
          actionAt: null
        }
      ]
    },
    {
      id: "manager",
      label: "Finance Manager",
      status: "awaiting",
      approvers: [
        {
          id: "f1",
          name: "David Kim",
          role: "VP Finance",
          avatar: "https://i.pravatar.cc/150?u=david",
          status: "awaiting",
          comment: "",
          sentTo: "Finance Dept",
          receivedAt: null,
          actionAt: null
        }
      ]
    }
  ]
};

// Reusable components for styling consistency
const Label = ({ children }) => (
  <span className="block text-[11px] font-semibold tracking-[0.05em] uppercase text-slate-500 mb-1.5">
    {children}
  </span>
);

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const TimelineNode = ({ status, isLast }) => {
  let icon;
  let bgClass;
  
  if (status === 'approved') {
    icon = <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />;
    bgClass = "bg-emerald-500 ring-4 ring-white";
  } else if (status === 'pending') {
    icon = <Clock className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />;
    bgClass = "bg-amber-500 ring-4 ring-white";
  } else if (status === 'declined') {
    icon = <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />;
    bgClass = "bg-rose-500 ring-4 ring-white";
  } else {
    // Awaiting / default
    icon = <div className="w-2 h-2 bg-slate-300 rounded-full" />;
    bgClass = "bg-white border-2 border-slate-200";
  }

  return (
    <div className="absolute left-0 w-6 flex justify-center -translate-x-[11px]">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${bgClass}`}>
        {icon}
      </div>
    </div>
  );
};

const LevelGroup = ({ level, isLastLevel }) => {
  const [isExpanded, setIsExpanded] = useState(level.status !== 'approved');

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
            <h4 className="text-sm font-semibold text-slate-800">{level.label}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {level.approvers.length} Approver{level.approvers.length !== 1 && 's'}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {level.approvers.map((approver, idx) => (
              <div key={approver.id} className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
                <TimelineNode status={approver.status} />
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={approver.avatar} 
                      alt={approver.name}
                      className={`w-9 h-9 rounded-full ring-2 ${
                        approver.status === 'approved' ? 'ring-emerald-100' :
                        approver.status === 'pending' ? 'ring-amber-100' :
                        approver.status === 'declined' ? 'ring-rose-100' :
                        'ring-slate-100'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-900">{approver.name}</span>
                        <span className="text-[12px] text-slate-500">• {approver.role}</span>
                      </div>
                      <div className="mt-0.5">
                        <Badge 
                          variant={
                            approver.status === 'approved' ? 'green' : 
                            approver.status === 'pending' ? 'amber' : 
                            approver.status === 'declined' ? 'red' : 'default'
                          }
                        >
                          {approver.status.charAt(0).toUpperCase() + approver.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100 mb-3">
                  {approver.comment ? (
                    <span className="text-slate-700">"{approver.comment}"</span>
                  ) : (
                    <span className="italic text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> No comments provided
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Sent to:</span>
                    <span>{approver.sentTo}</span>
                  </div>
                  <div className="text-right space-y-1">
                    {approver.receivedAt && (
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Received:</span>
                        <span className="font-medium text-slate-700">{approver.receivedAt}</span>
                      </div>
                    )}
                    {approver.actionAt && (
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Responded:</span>
                        <span className="font-medium text-slate-700">{approver.actionAt}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AssetRequestApprovalModal({ isOpen = true, onClose }) {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header - Subtle gradient top */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-slate-900">{mockData.title}</h2>
            <Badge variant="amber">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Pending Approval
              </span>
            </Badge>
          </div>
          <p className="text-sm text-slate-500">Requested on {mockData.date}</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8F9FB] p-4 rounded-[12px] border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <Label>Requested By</Label>
                <div className="flex items-center gap-2">
                  <img src={mockData.requester.avatar} alt="" className="w-5 h-5 rounded-full ring-1 ring-slate-200" />
                  <span className="text-[14px] font-medium text-slate-900">{mockData.requester.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                <Hash className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <Label>Request ID</Label>
                <span className="text-[14px] font-medium text-slate-900 font-mono">{mockData.id}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                <Monitor className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <Label>Category</Label>
                <span className="text-[14px] font-medium text-slate-900">{mockData.category}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900 mb-3">Request Details</h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-[14px] text-slate-700 leading-relaxed">
              {mockData.description}
            </div>
          </div>

          {/* Approval Timeline */}
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900 mb-5">Approval Workflow</h3>
            <div className="pl-3">
              {mockData.levels.map((level, idx) => (
                <LevelGroup 
                  key={level.id} 
                  level={level} 
                  isLastLevel={idx === mockData.levels.length - 1} 
                />
              ))}
            </div>
          </div>

          {/* Reviewer Input */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <Label>Your Comments (Optional)</Label>
              <span className="text-[11px] text-slate-400">{comment.length}/500</span>
            </div>
            <textarea
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              rows={3}
              placeholder="Add your reasoning for approval, return, or decline..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          <button className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">
            Return for edits
          </button>
          
          <div className="flex gap-3">
            <button className="px-5 py-2.5 text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-colors focus:ring-2 focus:ring-rose-500/20">
              Decline
            </button>
            <button className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all focus:ring-2 focus:ring-blue-600/30 flex items-center gap-2">
              <Check className="w-4 h-4" /> Approve Request
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
