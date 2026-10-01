import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const UserTable = ({ users, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 if the users list changes (e.g., from search)
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const totalPages = Math.max(1, Math.ceil(users.length / itemsPerPage));
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium w-16">#</th>
              <th className="px-6 py-4 font-medium">Username</th>
              <th className="px-6 py-4 font-medium">Mail ID</th>
              <th className="px-6 py-4 font-medium">Emp Code</th>
              <th className="px-6 py-4 font-medium">Mobile</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.map((user, index) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-slate-500 font-medium w-16">
                  {((currentPage - 1) * itemsPerPage) + index + 1}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <span className="truncate capitalize">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {user.mailid}
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">
                  {user.empCode}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {user.mobile}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-widest border border-slate-200">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-2 text-slate-400">
                  <button onClick={() => onEdit && onEdit(user)} className="p-1.5 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors" title="Edit">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => onDelete && onDelete(user.id)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, users.length)}</span> of <span className="font-medium text-slate-700">{users.length}</span> results
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
                // Simple logic to show current, first, last, and adjacent pages
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

export default UserTable;
