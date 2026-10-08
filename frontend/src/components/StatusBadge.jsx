import React from 'react';

const Badge = ({ status }) => {
  const isPending = status && status.startsWith('Pending');
  const displayStatus = isPending ? 'Pending' : status;

  const getStatusStyles = () => {
    if (isPending) return 'bg-blue-100 text-blue-800 border-blue-200';
    switch (displayStatus) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Returned':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      {displayStatus}
    </span>
  );
};

export default Badge;
