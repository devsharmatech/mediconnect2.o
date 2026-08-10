"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ImageIcon, Upload } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLabCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        icon: null, // string URL
        status: true,
    });

    // File state
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/labs/categories");
            const result = await response.json();
            if (result.success) {
                setCategories(result.data || []);
            } else {
                toast.error(result.message || "Failed to fetch categories");
            }
        } catch (error) {
            toast.error("An error occurred loading categories");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category = null) => {
        setSelectedFile(null);
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || "",
                icon: category.icon || null,
                status: category.status,
            });
            setPreviewUrl(category.icon?.startsWith('http') ? category.icon : null);
            setEditingId(category.id);
        } else {
            setFormData({
                name: "",
                description: "",
                icon: null,
                status: true,
            });
            setPreviewUrl(null);
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type (SVG, PNG, JPG)
            if (!file.type.match('image/(jpeg|png|svg\\+xml)')) {
                toast.error("Only SVG, PNG, or JPG images are allowed");
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Category name is required");
            return;
        }

        setSaving(true);
        const url = editingId
            ? `/api/admin/labs/categories/${editingId}`
            : "/api/admin/labs/categories";

        const method = editingId ? "PUT" : "POST";

        // Build FormData payload
        const payload = new FormData();
        payload.append("name", formData.name);
        payload.append("description", formData.description);
        payload.append("status", formData.status);

        if (selectedFile) {
            payload.append("icon_file", selectedFile);
        } else if (formData.icon) {
            payload.append("icon", formData.icon); // preserve existing string if no new file
        }

        try {
            const response = await fetch(url, {
                method,
                body: payload, // Using FormData, no required headers (browser sets multipart/form-data boundary automatically)
            });
            const result = await response.json();

            if (result.success) {
                toast.success(editingId ? "Category updated!" : "Category created!");
                setIsModalOpen(false);
                fetchCategories();
            } else {
                toast.error(result.message || "Operation failed");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this category? Tests linked to this category will have their category removed. The image will also be deleted.")) return;

        try {
            const response = await fetch(`/api/admin/labs/categories/${id}`, { method: "DELETE" });
            const result = await response.json();
            if (result.success) {
                toast.success("Category deleted");
                fetchCategories();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Failed to delete category");
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Lab Test Categories
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage global categories that labs can assign to their tests.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md flex items-center shadow-emerald-900/20"
                >
                    <Plus size={18} className="mr-2" />
                    Add Category
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0067A1] transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                                    <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Slug</th>
                                    <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Status</th>
                                    <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-gray-500">
                                            No categories found. Add one to get started!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCategories.map((cat) => (
                                        <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 overflow-hidden text-[#0067A1] dark:bg-gray-800 dark:border-gray-600">
                                                        {cat.icon && cat.icon.startsWith('http') ? (
                                                            <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="w-6 h-6 opacity-30" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{cat.name}</p>
                                                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{cat.description || "No description"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                {cat.slug}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${cat.status
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {cat.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(cat)}
                                                        className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cat.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 shrink-0">
                            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                                {editingId ? "Edit Category" : "Add New Category"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Category Image Upload */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-700 relative cursor-pointer hover:border-[#0067A1] transition-colors">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-gray-400 flex flex-col items-center">
                                                <ImageIcon className="w-8 h-8 mb-1" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Image</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/svg+xml"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0px]"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">SVG or PNG required</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Blood Tests"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#0067A1] focus:outline-none transition-all dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this test category..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#0067A1] focus:outline-none transition-all dark:text-white"
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0067A1]/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0067A1]"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {formData.status ? "Active (Visible to Labs)" : "Inactive (Hidden)"}
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700 mt-6 shrink-0 bg-white dark:bg-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-[#0067A1]/50 text-white rounded-lg transition-colors font-medium flex items-center"
                                >
                                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
