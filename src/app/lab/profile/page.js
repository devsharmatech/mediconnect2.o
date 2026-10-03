"use client";

import { useEffect, useState, useRef } from "react";
import {
  User,
  Building2,
  Phone,
  MapPin,
  Mail,
  Clock,
  Save,
  Plus,
  Trash2,
  Loader2,
  Upload,
  ImagePlus,
  Briefcase,
  Tag,
  MapPin as LocationIcon,
  FileText,
  CheckCircle,
  Edit2,
  X,
  Camera,
  Sun,
  Moon
} from "lucide-react";
import toast from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";

export default function LabProfilePage() {
  const [labId, setLabId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    lab_name: "",
    owner_name: "",
    email: "",
    license_number: "",
    address: "",
    phone_number: "",
    contact_person: "",
    registration_number: "",
    gst_number: "",
    pan_number: "",
    general_turnaround: "",
    accepts_home_collection: false,
    opening_hours: {},
    latitude: null,
    longitude: null,
    rating: 0,
    total_reviews: 0,
    user: {}
  });
  
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [editingOpeningHours, setEditingOpeningHours] = useState(false);
  const [openingHours, setOpeningHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "14:00", closed: false },
    sunday: { open: "", close: "", closed: true }
  });

  const fileInputRef = useRef();

  useEffect(() => {
    const u = getLoggedInUser("lab");
    if (u) {
      setLabId(u.id);
      fetchProfile(u.id);
    }
  }, []);

  const fetchProfile = async (id) => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/profile/get", {
        method: "POST",
        body: JSON.stringify({ lab_id: id }),
      });

      const json = await res.json();

      if (json.status) {
        const data = json.data;
        setProfile({
          ...data,
          user: data.user || {}
        });
        setServices(data.services || []);
        setPreview(data.user?.profile_picture || '/default-lab.svg');
        
        // Initialize opening hours
        if (data.opening_hours && typeof data.opening_hours === 'object') {
          setOpeningHours({
            ...openingHours,
            ...data.opening_hours
          });
        }
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to load profile");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save profile function
  const saveProfile = async () => {
    if (!labId) {
      toast.error("Lab ID not found");
      return;
    }

    setSaving(true);
    try {
      const updates = {
        lab_name: profile.lab_name,
        owner_name: profile.owner_name,
        email: profile.email,
        license_number: profile.license_number,
        address: profile.address,
        phone_number: profile.phone_number,
        contact_person: profile.contact_person,
        registration_number: profile.registration_number,
        gst_number: profile.gst_number,
        pan_number: profile.pan_number,
        general_turnaround: profile.general_turnaround,
        accepts_home_collection: profile.accepts_home_collection,
        opening_hours: openingHours,
        updated_at: new Date().toISOString()
      };

      const res = await fetch("/api/lab/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lab_id: labId,
          ...updates,
        }),
      });

      const json = await res.json();
      if (json.status) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(json.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Upload profile image
  const uploadImage = async (file) => {
    if (!file || !labId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("lab_id", labId);
      formData.append("file", file);

      const res = await fetch("/api/lab/profile/picture", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.status) {
        toast.success("Profile picture updated successfully");
        setPreview(json.profile_picture);
        // Update local profile
        setProfile(prev => ({
          ...prev,
          user: {
            ...prev.user,
            profile_picture: json.profile_picture
          }
        }));
      } else {
        toast.error(json.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  // Services management
  const addService = () => {
    setServices([...services, { service_name: "", price: "", description: "", category: "" }]);
  };

  const updateService = (idx, key, value) => {
    const updated = [...services];
    updated[idx][key] = key === "price" ? Number(value) || "" : value;
    setServices(updated);
  };

  const removeService = (idx) => {
    if (window.confirm("Are you sure you want to remove this service?")) {
      setServices(services.filter((_, i) => i !== idx));
    }
  };

  const saveServices = async () => {
    if (!labId) return;

    setSaving(true);
    try {
      const validServices = services
        .filter(s => s.service_name && s.service_name.trim() !== "")
        .map(s => ({
          service_name: s.service_name.trim(),
          price: s.price ? Number(s.price) : null,
          description: s.description?.trim() || "",
          category: s.category?.trim() || ""
        }));

      const res = await fetch("/api/lab/services/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          lab_id: labId, 
          services: validServices 
        }),
      });

      const json = await res.json();

      if (json.status) {
        toast.success("Services saved successfully");
        setServices(validServices);
      } else {
        toast.error(json.message || "Failed to save services");
      }
    } catch (error) {
      console.error("Services save error:", error);
      toast.error("Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  // Handle opening hours changes
  const updateOpeningHour = (day, field, value) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Handle image error
  const handleImageError = (e) => {
    e.target.src = '/default-lab.svg';
    e.target.onerror = null; // Prevent infinite loop
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Loading Lab Profile...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Fetching your laboratory details</p>
        </div>
      </div>
    );
  }

  // Tabs content
  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Lab Name *" 
                value={profile.lab_name || ""} 
                onChange={(v) => setProfile({ ...profile, lab_name: v })} 
                icon={<Building2 size={18} />} 
                required
                placeholder="Enter lab name"
              />
              <Input 
                label="Owner Name" 
                value={profile.owner_name || ""} 
                onChange={(v) => setProfile({ ...profile, owner_name: v })} 
                icon={<User size={18} />} 
                placeholder="Enter owner name"
              />
              <Input 
                label="Email" 
                type="email"
                value={profile.email || ""} 
                onChange={(v) => setProfile({ ...profile, email: v })} 
                icon={<Mail size={18} />} 
                placeholder="lab@example.com"
              />
              <Input 
                label="Phone Number" 
                value={profile.phone_number || ""} 
                onChange={(v) => setProfile({ ...profile, phone_number: v })} 
                icon={<Phone size={18} />} 
                placeholder="+91 9876543210"
              />
              <Input 
                label="Contact Person" 
                value={profile.contact_person || ""} 
                onChange={(v) => setProfile({ ...profile, contact_person: v })} 
                icon={<User size={18} />} 
                placeholder="Person to contact"
              />
              <Input 
                label="License Number" 
                value={profile.license_number || ""} 
                onChange={(v) => setProfile({ ...profile, license_number: v })} 
                icon={<FileText size={18} />} 
                placeholder="Lab license number"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300">Address</label>
              <div className="flex items-start gap-2 px-3 py-2 mt-1 border rounded-lg bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 mt-1"><MapPin size={18} /></span>
                <textarea
                  className="bg-transparent flex-1 outline-none min-h-[100px] resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  value={profile.address || ""}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Enter full address with landmark"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Registration Number" 
                value={profile.registration_number || ""} 
                onChange={(v) => setProfile({ ...profile, registration_number: v })} 
                icon={<FileText size={18} />} 
                placeholder="Business registration number"
              />
              <Input 
                label="GST Number" 
                value={profile.gst_number || ""} 
                onChange={(v) => setProfile({ ...profile, gst_number: v })} 
                icon={<Tag size={18} />} 
                placeholder="GSTIN number"
              />
              <Input 
                label="PAN Number" 
                value={profile.pan_number || ""} 
                onChange={(v) => setProfile({ ...profile, pan_number: v })} 
                icon={<Briefcase size={18} />} 
                placeholder="PAN card number"
              />
              <Input 
                label="General Turnaround Time" 
                value={profile.general_turnaround || ""} 
                onChange={(v) => setProfile({ ...profile, general_turnaround: v })} 
                icon={<Clock size={18} />} 
                placeholder="e.g., 24-48 hours, Same day"
              />
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="checkbox"
                id="home_collection"
                checked={profile.accepts_home_collection || false}
                onChange={(e) => setProfile({ ...profile, accepts_home_collection: e.target.checked })}
                className="w-5 h-5 text-[#0067A1] dark:text-emerald-500 rounded focus:ring-emerald-500 dark:focus:ring-emerald-400"
              />
              <label htmlFor="home_collection" className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Accept Home Collection (Sample collection at patient's home)
              </label>
            </div>
          </div>
        );

      case "services":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Manage Services</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add or edit the services your lab offers</p>
              </div>
              <button
                onClick={addService}
                className="px-4 py-2 bg-[#0067A1] dark:bg-[#004F7C] text-white rounded-lg flex items-center gap-2 hover:bg-[#004F7C] dark:hover:bg-[#0067A1] transition-colors whitespace-nowrap"
              >
                <Plus size={18} /> Add Service
              </button>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                <div className="w-14 h-14 bg-[#0067A1]/10 dark:bg-[#0067A1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ImagePlus className="w-7 h-7 text-[#0067A1] dark:text-sky-400" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-base mb-1">No services added yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">Add the diagnostic services your lab provides</p>
                <button
                  onClick={addService}
                  className="px-5 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
                >
                  Add your first service
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((srv, index) => (
                  <div key={index} className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0067A1]/30 dark:hover:border-sky-700/40 transition-colors space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service #{index + 1}</span>
                        {(!srv.service_name || srv.service_name.trim() === "") && (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-semibold">Name required</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeService(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                        title="Remove service"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Service Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Complete Blood Count"
                          value={srv.service_name || ""}
                          onChange={(e) => updateService(index, "service_name", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition-all"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <input
                            type="number"
                            placeholder="500"
                            value={srv.price || ""}
                            onChange={(e) => updateService(index, "price", e.target.value)}
                            className="w-full px-3.5 py-2.5 pl-8 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition-all"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Category</label>
                        <input
                          type="text"
                          placeholder="e.g., Blood Test, Urine Test"
                          value={srv.category || ""}
                          onChange={(e) => updateService(index, "category", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Description (Optional)</label>
                      <textarea
                        placeholder="Brief description of the service, sample requirements, turnaround time..."
                        value={srv.description || ""}
                        onChange={(e) => updateService(index, "description", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition-all min-h-[70px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-slate-400 dark:text-slate-500">
              * Required fields. Services without a name will not be saved.
            </p>
          </div>
        );

      case "hours":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Opening Hours</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Set your lab's weekly operating schedule</p>
              </div>
              <button
                onClick={() => setEditingOpeningHours(!editingOpeningHours)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all whitespace-nowrap border ${
                  editingOpeningHours
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                    : "bg-white dark:bg-slate-800 text-[#0067A1] dark:text-sky-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {editingOpeningHours ? <X size={15} /> : <Edit2 size={15} />}
                {editingOpeningHours ? "Cancel" : "Edit Hours"}
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60">
              {Object.entries(openingHours).map(([day, hours]) => {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                return (
                  <div key={day} className={`flex items-center justify-between px-5 py-3.5 ${
                    hours.closed ? "bg-slate-50 dark:bg-slate-900/60" : "bg-white dark:bg-slate-800/30"
                  }`}>
                    <div className="flex items-center gap-4 flex-1">
                      <span className={`text-xs font-bold w-24 ${
                        hours.closed ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"
                      }`}>{dayName}</span>
                      {editingOpeningHours ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`${day}-open`}
                              checked={!hours.closed}
                              onChange={(e) => updateOpeningHour(day, "closed", !e.target.checked)}
                              className="w-4 h-4 text-[#0067A1] rounded focus:ring-[#0067A1]/30 accent-[#0067A1]"
                            />
                            <label htmlFor={`${day}-open`} className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              {hours.closed ? "Closed" : "Open"}
                            </label>
                          </div>
                          {!hours.closed && (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={hours.open || "09:00"}
                                onChange={(e) => updateOpeningHour(day, "open", e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none"
                              />
                              <span className="text-slate-400 dark:text-slate-500 text-xs">to</span>
                              <input
                                type="time"
                                value={hours.close || "18:00"}
                                onChange={(e) => updateOpeningHour(day, "close", e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs">
                          {hours.closed ? (
                            <span className="text-rose-500 dark:text-rose-400 font-semibold">Closed</span>
                          ) : (
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{hours.open || "09:00"} – {hours.close || "18:00"}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {!hours.closed && !editingOpeningHours && (
                      <span className="px-2.5 py-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold border border-emerald-100 dark:border-emerald-800">Open</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            {!editingOpeningHours && (
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Clock size={12} />
                Click "Edit Hours" to update your lab's weekly schedule.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Laboratory Profile & Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your diagnostic center credentials, address, and operational timings
          </p>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl p-6 sm:p-8 text-white shadow-sm">
        {/* Subtle decorative geometry */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-28 -mt-28 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full -mb-24 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Profile Image */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg bg-white/10 flex items-center justify-center">
              <img
                src={preview}
                alt="Lab Profile"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            
            <button
              className="absolute -bottom-2 -right-2 bg-white text-[#0067A1] p-2.5 rounded-xl shadow-md hover:bg-slate-100 transition-all cursor-pointer border border-slate-200"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title={uploading ? "Uploading..." : "Change profile picture"}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera size={16} />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Diagnostic Center</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile.lab_name || "Diagnostic Laboratory"}
            </h2>

            <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-4 text-xs text-white/80">
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-white/60" />
                  <span>{profile.email}</span>
                </span>
              )}
              {profile.phone_number && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} className="text-white/60" />
                  <span>{profile.phone_number}</span>
                </span>
              )}
              {profile.address && (
                <span className="flex items-center gap-1.5 max-w-md truncate">
                  <LocationIcon size={14} className="text-white/60 shrink-0" />
                  <span className="truncate">{profile.address}</span>
                </span>
              )}
            </div>
            
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2">
              {profile.license_number && (
                <div className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold border border-white/20">
                  License: {profile.license_number}
                </div>
              )}
              <div className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold border border-white/20">
                {profile.accepts_home_collection ? "✓ Home Collection Available" : "✗ In-Lab Visits Only"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3">
          <div className="flex overflow-x-auto gap-2">
            {[
              { id: "basic", label: "Basic Information", icon: <Building2 size={16} /> },
              { id: "services", label: "Services & Pricing", icon: <ImagePlus size={16} /> },
              { id: "hours", label: "Opening Hours", icon: <Clock size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-3.5 text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "text-[#0067A1] dark:text-sky-400 border-[#0067A1] bg-white dark:bg-slate-800 shadow-xs rounded-t-xl"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6">
          {renderTabContent()}
          
          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === "services" 
                ? "Changes to diagnostic tests and pricing are saved immediately across the portal."
                : "Your laboratory profile is synchronized in real-time with doctor and patient order flows."}
            </p>

            <button
              onClick={activeTab === "services" ? saveServices : saveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save {activeTab === "services" ? "Services" : "Profile Changes"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Verification Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Onboarding Status</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.onboarding_status === "approved" 
                ? "Approved • Active on patient and doctor referral directory"
                : "Under verification review by MediConnect compliance"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0067A1] dark:text-sky-300 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Compliance & Certification</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.document_verified 
                ? "All diagnostic credentials & statutory licenses verified"
                : "Standard DPDP & clinical establishment compliance active"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Input Component
function Input({ label, value, onChange, icon, type = "text", placeholder = "", required = false, ...props }) {
  return (
    <div>
      <label className="font-semibold text-xs text-slate-700 dark:text-slate-300 block mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus-within:ring-2 focus-within:ring-[#0067A1]/20 focus-within:border-[#0067A1] transition-all">
        <span className="text-slate-400">{icon}</span>
        <input
          type={type}
          className="bg-transparent flex-1 outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      </div>
    </div>
  );
}
