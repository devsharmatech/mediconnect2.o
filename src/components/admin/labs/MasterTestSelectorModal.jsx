"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Database,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

export default function MasterTestSelectorModal({
  isOpen,
  onClose,
  labId = null,
  labName = "Lab",
  onAssigned = null,
  onSelectionConfirmed = null, // for onboarding modal before lab is created
  initialSelectedCodes = [],
}) {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCodes, setSelectedCodes] = useState(new Set(initialSelectedCodes || []));

  useEffect(() => {
    if (!isOpen) return;
    const fetchMasterTests = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          all: "true",
          ...(labId && { lab_id: labId }),
        });
        const res = await fetch(`/api/admin/master-tests?${params}`);
        const json = await res.json();
        if (json.success && json.data) {
          setTests(json.data.tests || []);
          setCategories(json.data.categories || []);
        } else {
          toast.error(json.error || "Failed to load master tests");
        }
      } catch (err) {
        console.error("Master tests fetch error:", err);
        toast.error("Error loading master catalog");
      } finally {
        setLoading(false);
      }
    };

    fetchMasterTests();
  }, [isOpen, labId]);

  // Filtered tests based on search and category
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesCat =
        selectedCategory === "all" ||
        t.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        t.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.test_code?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [tests, selectedCategory, searchQuery]);

  // Unassigned tests in current filtered view
  const selectableFilteredTests = useMemo(() => {
    return filteredTests.filter((t) => !t.is_assigned);
  }, [filteredTests]);

  // Total selectable across all tests
  const totalSelectable = useMemo(() => {
    return tests.filter((t) => !t.is_assigned);
  }, [tests]);

  // Toggle single test
  const handleToggleCode = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Select all in current filtered view
  const handleSelectAllFiltered = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      selectableFilteredTests.forEach((t) => next.add(t.test_code));
      return next;
    });
  };

  // Select ALL 1,974 tests in master catalog
  const handleSelectAllMaster = () => {
    const next = new Set();
    totalSelectable.forEach((t) => next.add(t.test_code));
    setSelectedCodes(next);
    toast.success(`Selected all ${totalSelectable.length} master tests`);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedCodes(new Set());
  };

  // Submit assignment
  const handleAssign = async () => {
    if (selectedCodes.size === 0) {
      toast.error("Please select at least one test to add.");
      return;
    }

    // If using in-memory mode (e.g. before lab creation)
    if (onSelectionConfirmed) {
      onSelectionConfirmed(Array.from(selectedCodes));
      onClose();
      return;
    }

    if (!labId) {
      toast.error("Lab ID is missing");
      return;
    }

    try {
      setSubmitting(true);
      const isAll = selectedCodes.size === totalSelectable.length && totalSelectable.length > 0;
      const res = await fetch("/api/admin/master-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: labId,
          assign_all: isAll,
          test_codes: Array.from(selectedCodes),
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to assign tests");

      toast.success(json.message || `Assigned ${selectedCodes.size} tests successfully!`);
      if (onAssigned) onAssigned(json.data);
      onClose();
    } catch (err) {
      console.error("Assign tests error:", err);
      toast.error(err.message || "Failed to assign tests");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full border border-gray-200 dark:border-gray-700 flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Master Test Catalog ({tests.length || "1,974"} Tests)
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Assign tests to <span className="font-semibold text-gray-700 dark:text-gray-200">{labName}</span>. Choose specific tests or select all.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-semibold p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search master tests by name or test code..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-1.5 px-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
              >
                <option value="all">All Categories ({tests.length})</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllMaster}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 cursor-pointer"
              >
                <CheckSquare className="w-3 h-3" />
                <span>Select All ({totalSelectable.length})</span>
              </button>

              {filteredTests.length !== tests.length && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-md hover:bg-sky-100 cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>Select Filtered ({selectableFilteredTests.length})</span>
                </button>
              )}

              {selectedCodes.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 font-mono">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {selectedCodes.size}
              </span>{" "}
              of {tests.length} selected
            </div>
          </div>
        </div>

        {/* Tests List Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <span className="text-xs">Loading master diagnostic tests catalog...</span>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-xs">No tests found matching your criteria</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-2.5 px-3">Test Code</th>
                  <th className="py-2.5 px-3">Test Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Sample Type</th>
                  <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTests.map((t) => {
                  const isChecked = selectedCodes.has(t.test_code);
                  const isAssigned = !!t.is_assigned;

                  return (
                    <tr
                      key={t.test_code || t.id}
                      onClick={() => !isAssigned && handleToggleCode(t.test_code)}
                      className={`transition-colors ${
                        isAssigned
                          ? "bg-gray-50/50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed"
                          : isChecked
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                      }`}
                    >
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isAssigned ? (
                          <CheckCircle2 className="w-4 h-4 text-gray-400 mx-auto" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCode(t.test_code)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-[11px] text-gray-700 dark:text-gray-300">
                        {t.test_code || "—"}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                        {t.test_name}
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                          {t.category || "General"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-[11px]">
                        {t.sample_type || "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        ₹{Number(t.mrp || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isAssigned ? (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            In Lab
                          </span>
                        ) : isChecked ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 rounded-b-xl">
          <div className="text-xs text-gray-500">
            {selectedCodes.size > 0 ? (
              <span>
                Ready to add <strong className="text-gray-900 dark:text-white">{selectedCodes.size}</strong> tests to {labName}
              </span>
            ) : (
              <span>Select tests or click Select All</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={submitting || selectedCodes.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{submitting ? "Adding..." : `Add Tests (${selectedCodes.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
