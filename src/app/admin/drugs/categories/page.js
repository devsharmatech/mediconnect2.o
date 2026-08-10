"use client";

import React, { useState, useEffect } from "react";
import {
  Filter, Plus, Edit2, Trash2, XCircle, Tag, Info
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";

export default function DrugCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const adminId = getLoggedInUser("admin")?.id;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/drugs/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) {
      toast.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!adminId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const method = currentCategory ? "PATCH" : "POST";
    const payload = { ...formData, admin_id: adminId };
    if (currentCategory) payload.id = currentCategory.id;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/drugs/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(currentCategory ? "Category updated" : "Category added");
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deleting a category might affect clinical safety engine rules. Proceed?")) return;
    const res = await fetch(`/api/admin/drugs/categories?id=${id}&admin_id=${adminId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Category deleted");
      fetchCategories();
    } else {
      toast.error(data.error);
    }
  };

  return (
    <main className="p-4 mt-10 w-full mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-[#0067A1] rounded-2xl shadow-sm shadow-[#0067A1]/20">
              <Filter className="w-8 h-8 text-white" />
            </div>
            Safety Categories
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Define clinical safety groups for automated prescription auditing</p>
        </div>
        <button
          onClick={() => {
            setCurrentCategory(null);
            setFormData({ name: "", description: "" });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm"
        >
          <Plus size={18} /> New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-3xl"></div>)
        ) : categories.map((cat, index) => (
          <div key={cat.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl relative">
                  <span className="absolute -top-2 -left-2 bg-[#0067A1] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                    {index + 1}
                  </span>
                  <Tag className="w-6 h-6 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{cat.name}</h3>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  setCurrentCategory(cat);
                  setFormData({ name: cat.name, description: cat.description });
                  setIsModalOpen(true);
                }} className="p-2 text-[#0067A1] hover:bg-[#0067A1]/10 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-start gap-3">
              <Info className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{cat.description || "No description provided."}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
              {currentCategory ? "Edit Category" : "New Safety Category"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 capitalize tracking-widest block mb-1">Category Code</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Prohibited"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 capitalize tracking-widest block mb-1">Description / Clinical Rules</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain what this category enforces..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#0067A1] font-medium text-base"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold capitalize text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-3 bg-[#0067A1] text-white rounded-2xl font-bold capitalize text-sm tracking-widest shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : (currentCategory ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
