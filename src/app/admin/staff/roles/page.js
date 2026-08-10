"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Plus, Edit, Trash2, Key, ChevronDown, ChevronRight,
  Save, Loader2, X, AlertCircle, Users, RefreshCw
} from "lucide-react";

export default function RolesPermissionsPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState({});
  const [saving, setSaving] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (rolesData.success) setRoles(rolesData.data || []);
      if (permsData.success) {
        setAllPermissions(permsData.data.permissions || []);
        setGroupedPermissions(permsData.data.grouped || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleDetail = async (roleId) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`);
      const data = await res.json();
      if (data.success) {
        const permIds = (data.data.staff_role_permissions || []).map((rp) => rp.permission_id);
        setRolePermissions((prev) => ({ ...prev, [roleId]: new Set(permIds) }));
        setExpandedRole(roleId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePermForRole = (roleId, permId) => {
    setRolePermissions((prev) => {
      const set = new Set(prev[roleId] || []);
      if (set.has(permId)) set.delete(permId);
      else set.add(permId);
      return { ...prev, [roleId]: set };
    });
  };

  const saveRolePermissions = async (roleId) => {
    setSaving(roleId);
    try {
      const permIds = Array.from(rolePermissions[roleId] || []);
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_ids: permIds }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: "success", text: "Role permissions saved!" });
        loadData();
      }
    } catch (err) {
      setStatus({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewRole({ name: "", description: "" });
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error(err);
    }
    setConfirmDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm shadow-teal-500/20">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage access control roles and their permissions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadData}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-xl shadow-sm shadow-teal-500/25"
              >
                <Plus className="w-5 h-5" />
                Create Role
              </motion.button>
            </div>
          </div>
        </motion.div>

        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-xl p-4 ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status.text}
          </motion.div>
        )}

        {/* Roles List */}
        <div className="space-y-4">
          {roles.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No roles created yet</p>
            </div>
          ) : (
            roles.map((role, i) => (
              <motion.div
                key={role.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Role Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => loadRoleDetail(role.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#0067A1]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{role.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{role.description || "No description"} • {role.permission_count} permissions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(role); }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedRole === role.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Permissions */}
                <AnimatePresence>
                  {expandedRole === role.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 dark:border-gray-800"
                    >
                      <div className="p-6">
                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                          <div key={module} className="mb-4 last:mb-0">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 capitalize">
                              {module.replace(/_/g, " ")}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {perms.map((p) => {
                                const checked = rolePermissions[role.id]?.has(p.id) || false;
                                return (
                                  <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                    checked
                                      ? "border-teal-300 bg-teal-50 dark:bg-[#003358]/20 text-[#004F7C] dark:text-teal-300"
                                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                                  }`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePermForRole(role.id, p.id)}
                                      className="w-4 h-4 text-[#0067A1] rounded focus:ring-[#0067A1]"
                                    />
                                    {p.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end mt-6">
                          <motion.button
                            onClick={() => saveRolePermissions(role.id)}
                            disabled={saving === role.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-xl shadow-sm shadow-teal-500/25 disabled:opacity-50"
                          >
                            {saving === role.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving === role.id ? "Saving..." : "Save Permissions"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Role</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role Name *</label>
                  <input
                    value={newRole.name}
                    onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Billing Staff"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="Brief description of this role"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#0067A1] focus:border-transparent resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={createLoading || !newRole.name.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Role</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{confirmDelete.name}</strong>? Staff assigned this role will lose their role-based permissions.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleDeleteRole(confirmDelete.id)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
