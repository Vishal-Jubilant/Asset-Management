import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const StatCard = ({ title, value, icon, trend }) => {
  return (
    <div className="group bg-white border border-slate-200/60 hover:bg-brand-800 rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.03)] hover:shadow-lg hover:shadow-brand-900/20 p-6 flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer">
      
      {/* Decorative background shapes (Visible on hover) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-400/20 rounded-full blur-xl -translate-x-10 translate-y-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10 flex justify-between items-start mb-6">
        <p className="font-semibold text-slate-800 group-hover:text-white/90 transition-colors duration-300">
          {title}
        </p>
        <div className="w-8 h-8 rounded-full border border-slate-200 group-hover:border-transparent group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-brand-900 flex-shrink-0 transition-all duration-300">
           <ArrowUpRight size={18} strokeWidth={2} className="group-hover:stroke-[2.5px]" />
        </div>
      </div>
      
      <div className="relative z-10 mt-auto">
        <h3 className="text-4xl font-bold text-slate-900 group-hover:text-white mb-2 transition-colors duration-300">
          {value}
        </h3>
      </div>
      
    </div>
  );
};

export default StatCard;
