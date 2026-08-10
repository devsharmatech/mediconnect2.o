"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Key, Save, Loader2, ShieldCheck, ShieldOff, Info } from "lucide-react";

export default function StaffPermissionsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.data.staff);
        const perms = data.data.permissions || [];
        setPermissions(perms);

        // Build overrides map from current state
        const map = {};
        perms.forEach((p) => {
          if (p.override) {
            map[p.id] = { ...p.override };
          }
        });
        setOverrides(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOverride = (permId, action) => {
    setOverrides((prev) => {
      const current = prev[permId] || { can_view: false, can_create: false, can_update: false, can_delete: false };
      return {
        ...prev,
        [permId]: { ...current, [action]: !current[action] },
      };
    });
  };

  const removeOverride = (permId) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[permId];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = Object.entries(overrides).map(([permId, actions]) => ({
        permission_id: permId,
        ...actions,
      }));

      const res = await fetch(`/api/admin/staff/${id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: payload }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: "success", text: "Permissions saved successfully!" });
      } else {
        setStatus({ type: "error", text: data.message || "Failed to save" });
      }
    } catch (err) {
      setStatus({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const grouped = {};
  permissions.forEach((p) => {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm shadow-teal-500/20">
                <Key className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Permissions</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{staff?.full_name} • {staff?.staff_roles?.name || "No Role"}</p>
              </div>
            </div>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-lg shadow-sm shadow-teal-500/25 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Permissions"}
            </motion.button>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          className="mb-6 flex items-start gap-3 p-4 bg-teal-50 dark:bg-[#003358]/20 border border-teal-200 dark:border-teal-800 rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Info className="w-5 h-5 text-[#0067A1] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#0067A1] dark:text-teal-300">
            <p className="font-semibold">Override Priority</p>
            <p className="mt-1">Custom overrides below take priority over the role-based permissions. Check the boxes to grant access or leave unchecked to deny. Use "Remove Override" to fall back to role permissions.</p>
          </div>
        </motion.div>

        {status && (
          <div className={`mb-6 rounded-xl p-4 ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>{status.text}</div>
        )}

        {/* Permissions Grid */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([module, perms], i) => (
            <motion.div
              key={module}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider capitalize">
                  {module.replace(/_/g, " ")}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {perms.map((p) => {
                  const hasOverride = !!overrides[p.id];
                  const actions = overrides[p.id] || { can_view: false, can_create: false, can_update: false, can_delete: false };

                  return (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.has_role_permission
                                ? "bg-teal-100 text-[#004F7C] dark:bg-[#003358]/30 dark:text-teal-300"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {p.has_role_permission ? "✓ From Role" : "✗ Not in Role"}
                            </span>
                            {hasOverride && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                Override Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {["can_view", "can_create", "can_update", "can_delete"].map((action) => (
                            <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasOverride ? actions[action] : false}
                                onChange={() => {
                                  if (!hasOverride) {
                                    setOverrides((prev) => ({
                                      ...prev,
                                      [p.id]: { can_view: false, can_create: false, can_update: false, can_delete: false, [action]: true },
                                    }));
                                  } else {
                                    toggleOverride(p.id, action);
                                  }
                                }}
                                className="w-4 h-4 text-[#0067A1] rounded focus:ring-[#0067A1]"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{action.replace("can_", "")}</span>
                            </label>
                          ))}
                          {hasOverride && (
                            <button
                              onClick={() => removeOverride(p.id)}
                              className="text-xs text-red-500 hover:text-red-700 ml-2"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
