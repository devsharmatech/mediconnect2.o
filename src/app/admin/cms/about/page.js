"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Users } from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";

export default function AboutCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Team State
  const [activeTab, setActiveTab] = useState("content"); // 'content' | 'team'
  const [teamItems, setTeamItems] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamUploading, setTeamUploading] = useState(false);

  // Section Header State
  const [headerData, setHeaderData] = useState({ title: "", heading: "", subheading: "" });
  const [savingHeader, setSavingHeader] = useState(false);

  useEffect(() => {
    fetchData();
    fetchHeader();
    fetchTeam();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=about");
      const result = await res.json();
      if (result.success && result.data) {
        setHeaderData({
          title: result.data.title || "",
          heading: result.data.heading || "",
          subheading: result.data.subheading || ""
        });
      }
    } catch (err) { console.error("Failed to load header"); }
  };

  const saveHeader = async (e) => {
    e.preventDefault();
    setSavingHeader(true);
    try {
      const res = await fetch("/api/cms/section-headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_identifier: "about", ...headerData })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Page headers updated!");
    } catch (err) { toast.error(err.message); }
    finally { setSavingHeader(false); }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/about");
      const result = await res.json();
      if (result.success) setItems(result.data || []);
    } catch (err) { toast.error("Failed to load about sections"); }
    finally { setLoading(false); }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/cms/team");
      const result = await res.json();
      if (result.success) setTeamItems(result.data || []);
    } catch (err) { toast.error("Failed to load team members"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem.id ? "PUT" : "POST";
      const res = await fetch("/api/cms/about", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(editingItem.id ? "Updated successfully!" : "Added successfully!");
      setIsModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      const res = await fetch(`/api/cms/about?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setEditingItem({ ...editingItem, image: result.url });
      toast.success("Image uploaded");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setUploading(false); }
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    try {
      const method = editingTeam.id ? "PUT" : "POST";
      const res = await fetch("/api/cms/team", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTeam)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(editingTeam.id ? "Team member updated!" : "Team member added!");
      setIsTeamModalOpen(false);
      fetchTeam();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteTeam = async (id) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;
    try {
      const res = await fetch(`/api/cms/team?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchTeam();
    } catch (err) { toast.error(err.message); }
  };

  const handleTeamImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeamUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setEditingTeam({ ...editingTeam, image: result.url });
      toast.success("Image uploaded");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setTeamUploading(false); }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">About Page CMS</h2>
            <p className="text-gray-500 mt-2">Manage content sections and team members of the About page.</p>
          </div>
          {activeTab === "content" ? (
            <button onClick={() => { setEditingItem({ section_key: "", title: "", content: "", image: "", display_order: 0 }); setIsModalOpen(true); }} className="bg-[#0067A1] text-white px-4 py-2 rounded-lg flex items-center shadow pointer transition hover:scale-105">
              <Plus size={18} className="mr-2" /> Add Section
            </button>
          ) : (
            <button onClick={() => { setEditingTeam({ name: "", role: "", expertise: "", image: "", display_order: 0, category: "top_management" }); setIsTeamModalOpen(true); }} className="bg-[#0067A1] text-white px-4 py-2 rounded-lg flex items-center shadow pointer transition hover:scale-105">
              <Plus size={18} className="mr-2" /> Add Team Member
            </button>
          )}
        </div>

        <div className="flex space-x-4 mb-6 border-b dark:border-gray-700">
          <button onClick={() => setActiveTab("content")} className={`pb-2 px-1 font-medium text-sm transition ${activeTab === "content" ? "border-b-2 border-[#0067A1] text-[#0067A1] dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pointer"}`}>Content Sections</button>
          <button onClick={() => setActiveTab("team")} className={`pb-2 px-1 font-medium text-sm transition ${activeTab === "team" ? "border-b-2 border-[#0067A1] text-[#0067A1] dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pointer"}`}>Team Members</button>
        </div>

        {/* --- PAGE HEADER SETTINGS --- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Page Header Settings</h3>
          <form onSubmit={saveHeader} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Small Title (Eyebrow)</label>
                <input type="text" value={headerData.title} onChange={e => setHeaderData({ ...headerData, title: e.target.value })} placeholder="e.g. ABOUT US" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Main Heading</label>
                <input type="text" value={headerData.heading} onChange={e => setHeaderData({ ...headerData, heading: e.target.value })} placeholder="e.g. Our Journey & Mission" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subheading (Description)</label>
                <textarea value={headerData.subheading} onChange={e => setHeaderData({ ...headerData, subheading: e.target.value })} placeholder="e.g. Learn more about Mediconnect..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="2" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingHeader} className="bg-[#0067A1] hover:bg-[#073834] text-white px-4 py-2 rounded-lg flex items-center shadow pointer disabled:opacity-50 transition">
                <Save size={18} className="mr-2" /> {savingHeader ? "Saving..." : "Save Headers"}
              </button>
            </div>
          </form>
        </div>
        {/* --------------------------- */}

        {activeTab === "content" && (
          <>
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 mt-3">Loading about sections...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 relative hover:shadow-lg transition">
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 pointer"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex flex-col md:flex-row mb-4 max-w-4xl">
                      {item.image && <img src={item.image} alt="" className="h-24 w-40 object-cover rounded mr-6 mb-4 md:mb-0" />}
                      <div>
                        <h3 className="font-bold text-xl dark:text-white pr-16">{item.title}</h3>
                        <p className="inline-block mt-1 mb-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded font-mono border dark:border-gray-600">Key: {item.section_key}</p>
                        <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: item.content }}></div>
                        <p className="text-xs text-gray-400 mt-2">Display Order: {item.display_order}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "team" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teamItems.map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border dark:border-gray-700 relative flex flex-col items-center text-center hover:shadow-lg transition">
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button onClick={() => { setEditingTeam(item); setIsTeamModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteTeam(item.id)} className="text-red-500 hover:text-red-700 pointer"><Trash2 size={16} /></button>
                  </div>

                  <div className="relative mb-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-24 w-24 rounded-full object-cover border-2 border-[#0067A1]/20" />
                    ) : (
                      <div className="h-24 w-24 rounded-full border border-[#0067A1]/20 bg-[#0067A1]/5 flex items-center justify-center">
                        <Users className="h-10 w-10 text-[#0067A1]" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                  <p className="text-sm font-medium text-[#0067A1] mb-2">{item.role}</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-2">
                    <p className="text-[10px] px-2 py-0.5 bg-[#0067A1]/5 text-[#0067A1] rounded-full font-semibold border border-[#0067A1]/10">
                      {item.category === 'executive_management' ? 'Executive' : 'Top Management'}
                    </p>
                    <p className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{item.expertise}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Order: {item.display_order}</p>
                </div>
              ))}
            </div>
            {teamItems.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Users className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No team members added yet.</p>
              </div>
            )}
          </>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit Section" : "Add Section"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Section Key (Unique)</label>
                      <input required type="text" value={editingItem.section_key} disabled={!!editingItem.id} onChange={e => setEditingItem({ ...editingItem, section_key: e.target.value })} placeholder="e.g. mission" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 placeholder-gray-400" />
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium leading-relaxed">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Required Keys for Layout Mapping:</span><br />
                        Use <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-gray-800 dark:text-amber-100">opening</code>, <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-gray-800 dark:text-amber-100">vision</code>, <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-gray-800 dark:text-amber-100">mission</code>, <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-gray-800 dark:text-amber-100">differentiators</code>, or <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-gray-800 dark:text-amber-100">founders_message</code>.
                      </p>
                    </div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-white">Title</label><input required type="text" value={editingItem.title} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} placeholder="e.g. Our Mission" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Content</label>
                    <RichTextEditor value={editingItem.content || ""} onChange={content => setEditingItem({ ...editingItem, content })} placeholder="Enter the section content here..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Image</label>
                      <div className="flex items-center space-x-4">
                        {editingItem.image && <img src={editingItem.image} className="h-10 w-16 object-cover rounded" alt="" />}
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm flex items-center transition dark:text-white">
                          <ImageIcon className="w-4 h-4 mr-1" /> {uploading ? "..." : "Upload Image"}
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label><input type="number" value={editingItem.display_order} onChange={e => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) })} placeholder="e.g. 1" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  </div>

                  <button type="submit" className="w-full bg-[#0067A1] hover:bg-[#073834] text-white py-2 rounded font-medium mt-4 pointer transition">Save Section</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isTeamModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingTeam.id ? "Edit Team Member" : "Add Team Member"}</h3>
                <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSaveTeam} className="space-y-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Name</label>
                      <input required type="text" value={editingTeam.name} onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })} placeholder="e.g. Dr. Pooja Sharma" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Role</label>
                      <input required type="text" value={editingTeam.role} onChange={e => setEditingTeam({ ...editingTeam, role: e.target.value })} placeholder="e.g. Clinical Lead" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Expertise / Label</label>
                      <input type="text" value={editingTeam.expertise} onChange={e => setEditingTeam({ ...editingTeam, expertise: e.target.value })} placeholder="e.g. Patient Care" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label>
                      <input type="number" value={editingTeam.display_order} onChange={e => setEditingTeam({ ...editingTeam, display_order: parseInt(e.target.value) })} placeholder="0" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 dark:text-white">Management Category</label>
                      <select
                        value={editingTeam.category || "top_management"}
                        onChange={e => setEditingTeam({ ...editingTeam, category: e.target.value })}
                        className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="top_management">Top Management</option>
                        <option value="executive_management">Executive Management</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-white">Profile Picture</label>
                    <div className="flex items-center space-x-4">
                      {editingTeam.image ? (
                        <img src={editingTeam.image} className="h-20 w-20 object-cover rounded-full border border-gray-200" alt="" />
                      ) : (
                        <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition dark:text-white shadow-sm border dark:border-none">
                        <ImageIcon className="w-4 h-4 mr-2" /> {teamUploading ? "Uploading..." : "Upload Photo"}
                        <input type="file" className="hidden" accept="image/*" onChange={handleTeamImageUpload} disabled={teamUploading} />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t dark:border-gray-700">
                    <button type="submit" disabled={teamUploading} className="w-full bg-[#0067A1] hover:bg-[#073834] text-white py-2.5 rounded-lg font-medium pointer transition shadow disabled:opacity-50">
                      {teamUploading ? "Please wait..." : "Save Team Member"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
