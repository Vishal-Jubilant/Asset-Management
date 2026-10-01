import React, { useContext, useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import Button from '../components/Button';
import api from '../utils/api';

const Settings = () => {
  const { categories, setCategories } = useContext(AppContext);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const value = newCategory.trim();
    // Don't add if it already exists (case-insensitive)
    if (categories.some(c => c.value.toLowerCase() === value.toLowerCase())) {
      return;
    }
    try {
      const res = await api.post('/categories', { value: value, label: value });
      setCategories([...categories, res.data]);
      setNewCategory('');
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleRemoveCategory = async (valToRemove) => {
    try {
      await api.delete(`/categories/${valToRemove}`);
      setCategories(categories.filter(c => c.value !== valToRemove));
    } catch (error) {
      console.error("Error removing category:", error);
    }
  };

  const handleUpdateCategory = async (index) => {
    if (editingIndex === null) return;
    
    const value = editValue.trim();
    if (!value) {
      setEditingIndex(null);
      return;
    }
    
    // Check if duplicate (excluding itself)
    const isDuplicate = categories.some((c, i) => i !== index && c.value.toLowerCase() === value.toLowerCase());
    if (isDuplicate) {
      setEditingIndex(null);
      return;
    }
    
    try {
      const oldCategoryValue = categories[index].value;
      const res = await api.put(`/categories/${oldCategoryValue}`, { value: value, label: value });
      const updated = [...categories];
      updated[index] = res.data;
      setCategories(updated);
    } catch (error) {
      console.error("Error updating category:", error);
    } finally {
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your application preferences and system settings.</p>
      </div>
      <div>
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Manage Categories</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Add New Category</label>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="e.g. Server, Mobile Device..."
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm shadow-sm"
                />
                <Button variant="primary" onClick={handleAddCategory} className="flex-shrink-0 flex items-center gap-2">
                  <Plus size={16} /> Add Category
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Available Categories</label>
              <div className="flex flex-wrap items-start content-start gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[120px]">
                {categories.map((category, index) => (
                  <div key={index} className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-medium text-slate-700 group transition-all hover:border-brand-300 hover:shadow focus-within:ring-2 focus-within:ring-brand-500/20">
                    {editingIndex === index ? (
                      <input 
                        type="text" 
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleUpdateCategory(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory(index);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        autoFocus
                        className="bg-transparent border-none focus:outline-none w-auto min-w-[60px] p-0 m-0 text-sm font-medium text-brand-700"
                        style={{ width: `${Math.max(editValue.length + 1, 4)}ch` }}
                      />
                    ) : (
                      <span 
                        className="cursor-text hover:text-brand-600 transition-colors"
                        onClick={() => {
                          setEditingIndex(index);
                          setEditValue(category.label);
                        }}
                        title="Click to edit"
                      >
                        {category.label}
                      </span>
                    )}
                    <button 
                      onClick={() => handleRemoveCategory(category.value)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ml-1"
                      title="Remove Category"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <span className="text-slate-400 text-sm flex items-center justify-center w-full h-full">No categories available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
