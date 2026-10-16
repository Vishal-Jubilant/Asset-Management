import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete User",
  message = "Are you sure you want to delete this user?",
  user = null,
  confirmText = "Delete User",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-md overflow-hidden border border-slate-200/80 animate-slide-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* Card Content */}
        <div className="p-6 sm:p-7 text-center">
          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4 shadow-xs">
            <Trash2 size={26} className="text-red-600" />
          </div>

          {/* Title & Message */}
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            {message}
          </p>

          {/* User Details Preview Box */}
          {user && (
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 text-left mb-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm truncate capitalize">
                      {user.name}
                    </span>
                    {user.department && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200/70 text-slate-700">
                        {user.department}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {user.mailid}
                  </p>
                </div>
                {user.empCode && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] font-mono font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {user.empCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning banner */}
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-3.5 py-2.5 text-xs text-amber-800 text-left mb-6 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              This action cannot be undone. All associated requests will also be removed.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
