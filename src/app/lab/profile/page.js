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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0067A1] dark:text-emerald-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading lab profile...</p>
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
              <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <ImagePlus className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No services added yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Add services that your lab provides</p>
                <button
                  onClick={addService}
                  className="px-6 py-2 text-[#0067A1] dark:text-emerald-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  Add your first service
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {services.map((srv, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Service #{index + 1}</span>
                        {(!srv.service_name || srv.service_name.trim() === "") && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">Name required</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeService(index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remove service"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          Service Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Complete Blood Count"
                          value={srv.service_name || ""}
                          onChange={(e) => updateService(index, "service_name", e.target.value)}
                          className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                          <input
                            type="number"
                            placeholder="e.g., 500"
                            value={srv.price || ""}
                            onChange={(e) => updateService(index, "price", e.target.value)}
                            className="w-full p-2.5 pl-8 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Category</label>
                        <input
                          type="text"
                          placeholder="e.g., Blood Test, Urine Test"
                          value={srv.category || ""}
                          onChange={(e) => updateService(index, "category", e.target.value)}
                          className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Description (Optional)</label>
                      <textarea
                        placeholder="Brief description of the service, sample requirements, etc."
                        value={srv.description || ""}
                        onChange={(e) => updateService(index, "description", e.target.value)}
                        className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>* Required fields. Services without names will not be saved.</p>
            </div>
          </div>
        );

      case "hours":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Opening Hours</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Set your lab's operating schedule</p>
              </div>
              <button
                onClick={() => setEditingOpeningHours(!editingOpeningHours)}
                className="px-4 py-2 text-[#0067A1] dark:text-emerald-400 border border-blue-600 dark:border-blue-400 rounded-lg flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors whitespace-nowrap"
              >
                {editingOpeningHours ? <X size={18} /> : <Edit2 size={18} />}
                {editingOpeningHours ? "Cancel Edit" : "Edit Hours"}
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {Object.entries(openingHours).map(([day, hours]) => {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                return (
                  <div key={day} className={`flex items-center justify-between p-4 border-b dark:border-gray-700 last:border-b-0 ${hours.closed ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-800 dark:text-gray-200 w-24">{dayName}</span>
                      {editingOpeningHours ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`${day}-open`}
                              checked={!hours.closed}
                              onChange={(e) => updateOpeningHour(day, "closed", !e.target.checked)}
                              className="w-4 h-4 text-[#0067A1] dark:text-emerald-400 rounded focus:ring-emerald-500 dark:focus:ring-emerald-400"
                            />
                            <label htmlFor={`${day}-open`} className="text-sm text-gray-700 dark:text-gray-300">
                              {hours.closed ? "Closed" : "Open"}
                            </label>
                          </div>
                          {!hours.closed && (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={hours.open || "09:00"}
                                onChange={(e) => updateOpeningHour(day, "open", e.target.value)}
                                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
                              />
                              <span className="text-gray-500 dark:text-gray-400">to</span>
                              <input
                                type="time"
                                value={hours.close || "18:00"}
                                onChange={(e) => updateOpeningHour(day, "close", e.target.value)}
                                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">
                          {hours.closed ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">Closed</span>
                          ) : (
                            <span className="font-medium">{hours.open || "09:00"} - {hours.close || "18:00"}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {hours.closed && !editingOpeningHours && (
                      <span className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full font-medium">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            {!editingOpeningHours && (
              <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p>Click "Edit Hours" to change your lab's operating schedule.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors duration-200">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-emerald-500">Lab Profile Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your lab information, services, and operating hours</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-[#0067A1] to-[#004F7C] dark:from-[#0067A1] dark:to-[#004F7C] rounded-2xl shadow-lg text-white p-6 mb-8 transition-colors duration-200">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-36 h-36 rounded-xl overflow-hidden border-4 border-white dark:border-emerald-300 shadow-xl bg-white dark:bg-gray-800">
                <img
                  src={preview}
                  alt="Lab Profile"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              
              <button
                className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 text-[#0067A1] dark:text-emerald-400 p-3 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                title={uploading ? "Uploading..." : "Change profile picture"}
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera size={20} />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) uploadImage(file);
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {profile.lab_name || "Your Lab Name"}
              </h1>
              <div className="space-y-2 opacity-95">
                <p className="flex items-center gap-2 justify-center md:justify-start">
                  <Mail size={18} /> 
                  <span className="truncate">{profile.email || "No email provided"}</span>
                </p>
                <p className="flex items-center gap-2 justify-center md:justify-start">
                  <Phone size={18} /> 
                  <span>{profile.phone_number || "No phone number"}</span>
                </p>
                {profile.address && (
                  <p className="flex items-start gap-2 justify-center md:justify-start">
                    <LocationIcon size={18} className="mt-0.5 flex-shrink-0" />
                    <span className="text-left line-clamp-2">{profile.address}</span>
                  </p>
                )}
              </div>
              
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {profile.license_number && (
                  <div className="bg-white/20 dark:bg-emerald-300/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                    License: {profile.license_number}
                  </div>
                )}
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${profile.accepts_home_collection ? 'bg-green-500/30 dark:bg-green-400/30' : 'bg-red-500/30 dark:bg-red-400/30'}`}>
                  {profile.accepts_home_collection ? "✓ Home Collection" : "✗ No Home Collection"}
                </div>
                {profile.rating > 0 && (
                  <div className="bg-yellow-500/30 dark:bg-yellow-400/30 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5">
                    <span className="text-yellow-200 dark:text-yellow-300">★</span>
                    <span>{Number(profile.rating || 0).toFixed(1)}</span>
                    <span className="opacity-90">({profile.total_reviews || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden transition-colors duration-200">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: "basic", label: "Basic Information", icon: <Building2 size={18} /> },
                { id: "services", label: "Services & Pricing", icon: <ImagePlus size={18} /> },
                { id: "hours", label: "Opening Hours", icon: <Clock size={18} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? "text-[#0067A1] dark:text-emerald-400 border-b-2 border-blue-600 dark:border-blue-400 bg-emerald-50 dark:bg-emerald-900/20"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
          <div className="p-6">
            {renderTabContent()}
            
            {/* Save Button */}
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={activeTab === "services" ? saveServices : saveProfile}
                disabled={saving}
                className="px-8 py-3.5 bg-[#0067A1] dark:bg-[#004F7C] text-white rounded-xl font-semibold flex items-center gap-3 hover:bg-[#004F7C] dark:hover:bg-[#0067A1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save {activeTab === "services" ? "Services" : "Profile Changes"}</span>
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {activeTab === "services" 
                  ? "Click save to update your lab services and pricing."
                  : "Click save to update your lab profile information."}
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-300 text-lg">Profile Status</h4>
                <p className="text-green-700 dark:text-green-400 mt-1">
                  {profile.onboarding_status === "approved" 
                    ? "✅ Your lab profile is approved and visible to patients"
                    : "⏳ Your profile is under review. Please complete all details."}
                </p>
                {profile.approved_at && (
                  <p className="text-green-600 dark:text-green-500 text-sm mt-2">
                    Approved on: {new Date(profile.approved_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-[#003358]/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full">
                <FileText className="text-[#0067A1] dark:text-emerald-400" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-[#0067A1] dark:text-emerald-300 text-lg">Document Status</h4>
                <p className="text-[#0067A1] dark:text-emerald-400 mt-1">
                  {profile.document_verified 
                    ? "✅ All documents are verified"
                    : "📋 Document verification pending"}
                </p>
                {profile.document_verified_at && (
                  <p className="text-[#0067A1] dark:text-emerald-500 text-sm mt-2">
                    Verified on: {new Date(profile.document_verified_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
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
      <label className="font-medium text-gray-700 dark:text-gray-300 block mb-2">
        {label}
        {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-emerald-500 dark:focus-within:ring-emerald-400 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 transition-all">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <input
          type={type}
          className="bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
