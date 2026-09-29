import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = () => {
  return (
    <div className="flex items-center text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
      <Search size={18} className="mr-2 text-slate-400" />
      <input 
        type="text" 
        placeholder="Search requests..." 
        className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-slate-400"
      />
    </div>
  );
};

export default SearchBar;
