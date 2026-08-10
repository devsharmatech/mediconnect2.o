"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Search, Thermometer, Microscope, Dna, Syringe, Biohazard, Bone, Activity as ActivityIcon, Droplet, Users, FileText, TestTube, Eye, Upload, Download, CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { getLoggedInUser } from "@/lib/authHelpers";
import LabOtpModal from "./LabOtpModal";

// Icon components mapping
const ICON_MAP = {
    Microscope, Thermometer, Dna, Syringe, Biohazard, Bone, Activity: ActivityIcon, Droplet, Users, FileText
};

export default function LabTestCatalogPage() {
    const [tests, setTests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [labId, setLabId] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingTest, setViewingTest] = useState(null);

    // OTP Consent State
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [hasConsentSession, setHasConsentSession] = useState(false);

    // Bulk Upload State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);
    const [csvFileName, setCsvFileName] = useState("");
    const [bulkUploading, setBulkUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        test_code: "",
        test_name: "",
        category_id: "",
        price: "",
        specimen_type: "",
        specimen_type_custom: "",
        container: "",
        temperature: "",
        remarks: "",
        schedule: "",
        reporting_schedule: "",
        clinical_history_required: false,
        turnaround_time: "",
        is_active: true,
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const user = getLoggedInUser("lab");
        if (user?.id) {
            setLabId(user.id);
            fetchCategories();
            fetchTests(user.id);
        } else {
            setLoading(false);
            toast.error("Lab authentication required.");
        }
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/lab/categories");
            const result = await response.json();
            if (result.success) {
                setCategories(result.data || []);
            }
        } catch (error) {
            console.error("Failed to load categories", error);
        }
    };

    const fetchTests = async (lid) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/lab/tests?lab_id=${lid}`);
            const result = await response.json();
            if (result.success) {
                setTests(result.data || []);
            } else {
                toast.error(result.message || "Failed to fetch tests");
            }
        } catch (error) {
            toast.error("An error occurred loading tests");
        } finally {
            setLoading(false);
        }
    };

    const SAMPLE_TYPE_OPTIONS = [
        "Blood", "Serum", "Plasma", "Urine", "Stool", "Sputum",
        "CSF", "Synovial Fluid", "Body Fluid", "Tissue", "Swab",
        "EDTA Blood", "Citrate Blood", "Heparin Blood", "Nasal Swab",
        "Throat Swab", "Pus", "Aspirate", "Bone Marrow", "Hair", "Nail"
    ];

    const handleOpenModal = (testItem = null) => {
        if (testItem) {
            const isCustomSpecimen = testItem.specimen_type && !SAMPLE_TYPE_OPTIONS.includes(testItem.specimen_type);
            setFormData({
                test_code: testItem.test_code || "",
                test_name: testItem.test_name,
                category_id: testItem.category_id || "",
                price: testItem.price,
                specimen_type: isCustomSpecimen ? "Other" : (testItem.specimen_type || ""),
                specimen_type_custom: isCustomSpecimen ? testItem.specimen_type : "",
                container: testItem.container || "",
                temperature: testItem.temperature || "",
                remarks: testItem.remarks || "",
                schedule: testItem.schedule || "",
                reporting_schedule: testItem.reporting_schedule || "",
                clinical_history_required: testItem.clinical_history_required || false,
                turnaround_time: testItem.turnaround_time || "",
                is_active: testItem.is_active,
            });
            setEditingId(testItem.id);
        } else {
            setFormData({
                test_code: "",
                test_name: "",
                category_id: "",
                price: "",
                specimen_type: "",
                specimen_type_custom: "",
                container: "",
                temperature: "",
                remarks: "",
                schedule: "",
                reporting_schedule: "",
                clinical_history_required: false,
                turnaround_time: "",
                is_active: true,
            });
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.test_name || formData.price === "") {
            toast.error("Test Name and Price are required");
            return;
        }

        setSaving(true);
        const url = editingId
            ? `/api/lab/tests/${editingId}`
            : "/api/lab/tests";

        const method = editingId ? "PUT" : "POST";

        try {
            const finalSpecimen = formData.specimen_type === "Other" ? formData.specimen_type_custom : formData.specimen_type;
            const { specimen_type_custom, ...rest } = formData;
            const payload = { ...rest, specimen_type: finalSpecimen, lab_id: labId };
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (response.status === 403 && result.error?.code === "CONSENT_REQUIRED") {
                setPendingAction(() => () => handleSubmit(e));
                setIsOtpModalOpen(true);
                return;
            }

            if (result.success) {
                toast.success(editingId ? "Test updated!" : "Test created!");
                setIsModalOpen(false);
                fetchTests(labId);
            } else {
                toast.error(result.message || "Operation failed");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this test?")) return;

        try {
            const response = await fetch(`/api/lab/tests/${id}?lab_id=${labId}`, { method: "DELETE" });
            const result = await response.json();

            if (response.status === 403 && result.error?.code === "CONSENT_REQUIRED") {
                setPendingAction(() => () => handleDelete(id));
                setIsOtpModalOpen(true);
                return;
            }

            if (result.success) {
                toast.success("Test deleted");
                fetchTests(labId);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Failed to delete test");
        }
    };

    const filteredTests = tests.filter(t =>
        t.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.test_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ─── CSV Bulk Upload Functions ────────────────────────────────

    const CSV_HEADERS = [
        "Test Name", "Price", "Category", "Sample Type", "Container",
        "Temperature", "Turnaround Time", "Schedule", "Reporting Schedule",
        "Remarks", "Clinical History Required", "Active"
    ];

    const downloadTemplate = () => {
        const sampleRows = [
            [
                "Complete Blood Count", "450", "Hematology", "EDTA Blood", "EDTA Tube",
                "Room Temp", "Same Day", "Daily by 3 PM", "Same day by 6 PM",
                "12 hrs fasting required", "No", "Yes"
            ],
            [
                "Thyroid Profile", "850", "Endocrinology", "Serum", "Red top/Plain",
                "2-8°C", "Next Working Day", "Mon-Sat by 11 AM", "Next day by 5 PM",
                "", "Yes", "Yes"
            ],
        ];
        const csvContent = [CSV_HEADERS.join(","), ...sampleRows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "lab_tests_template.csv";
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleCsvFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFileName(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = [];
                const errs = [];

                results.data.forEach((row, idx) => {
                    const testName = (row["Test Name"] || "").trim();
                    const price = (row["Price"] || "").trim();
                    const catName = (row["Category"] || "").trim();

                    // Find category ID by name (case-insensitive)
                    const matchedCat = categories.find(
                        c => c.name.toLowerCase() === catName.toLowerCase()
                    );

                    const rowErrors = [];
                    if (!testName) rowErrors.push("Missing Test Name");
                    if (!price || isNaN(parseFloat(price))) rowErrors.push("Invalid Price");

                    const parsed = {
                        test_name: testName,
                        price: price,
                        category_id: matchedCat?.id || null,
                        category_name: matchedCat?.name || catName || "—",
                        specimen_type: (row["Sample Type"] || "").trim() || null,
                        container: (row["Container"] || "").trim() || null,
                        temperature: (row["Temperature"] || "").trim() || null,
                        turnaround_time: (row["Turnaround Time"] || "").trim() || null,
                        schedule: (row["Schedule"] || "").trim() || null,
                        reporting_schedule: (row["Reporting Schedule"] || "").trim() || null,
                        remarks: (row["Remarks"] || "").trim() || null,
                        clinical_history_required: ["yes", "true", "1"].includes((row["Clinical History Required"] || "").trim().toLowerCase()),
                        is_active: !["no", "false", "0"].includes((row["Active"] || "").trim().toLowerCase()),
                        _errors: rowErrors,
                        _rowNum: idx + 2, // +2 because header=1, 0-indexed
                    };

                    if (rowErrors.length > 0) {
                        errs.push(parsed);
                    }
                    rows.push(parsed);
                });

                setCsvData(rows);
                setCsvErrors(errs);
            },
            error: () => {
                toast.error("Failed to parse CSV file");
            }
        });

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCsvRowEdit = (index, field, value) => {
        const updatedData = [...csvData];
        const row = updatedData[index];
        row[field] = value;
        
        // Re-validate
        const rowErrors = [];
        if (!row.test_name?.trim()) rowErrors.push("Missing Test Name");
        if (!row.price || isNaN(parseFloat(row.price))) rowErrors.push("Invalid Price");
        
        row._errors = rowErrors;
        
        setCsvData(updatedData);
        setCsvErrors(updatedData.filter(r => r._errors.length > 0));
    };

    const handleCsvRowRemove = (index) => {
        const updatedData = [...csvData];
        updatedData.splice(index, 1);
        setCsvData(updatedData);
        setCsvErrors(updatedData.filter(r => r._errors.length > 0));
    };

    const handleBulkUpload = async () => {
        const validRows = csvData.filter(r => r._errors.length === 0);
        if (validRows.length === 0) {
            toast.error("No valid rows to upload");
            return;
        }

        setBulkUploading(true);
        try {
            const payload = validRows.map(({ _errors, _rowNum, ...rest }) => rest);
            const response = await fetch("/api/lab/tests/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lab_id: labId, tests: payload }),
            });
            const result = await response.json();

            if (response.status === 403 && result.error?.code === "CONSENT_REQUIRED") {
                setPendingAction(() => () => handleBulkUpload());
                setIsOtpModalOpen(true);
                return;
            }

            if (result.success) {
                toast.success(result.message || `${validRows.length} tests imported!`);
                setIsBulkModalOpen(false);
                setCsvData([]);
                setCsvErrors([]);
                setCsvFileName("");
                fetchTests(labId);
            } else {
                toast.error(result.message || "Bulk upload failed");
            }
        } catch (error) {
            toast.error("An error occurred during bulk upload");
        } finally {
            setBulkUploading(false);
        }
    };

    const closeBulkModal = () => {
        setIsBulkModalOpen(false);
        setCsvData([]);
        setCsvErrors([]);
        setCsvFileName("");
    };

    const exportToCsv = () => {
        if (!hasConsentSession) {
            setPendingAction(() => () => exportToCsv());
            setIsOtpModalOpen(true);
            return;
        }

        if (tests.length === 0) {
            toast.error("No tests to export.");
            return;
        }

        const dataToExport = tests.map(t => ({
            "Test Code": t.test_code || "",
            "Test Name": t.test_name || "",
            "Price": t.price || "",
            "Category": t.category?.name || "Uncategorized",
            "Sample Type": t.specimen_type || "",
            "Container": t.container || "",
            "Temperature": t.temperature || "",
            "Turnaround Time": t.turnaround_time || "",
            "Schedule": t.schedule || "",
            "Reporting Schedule": t.reporting_schedule || "",
            "Remarks": t.remarks || "",
            "Clinical History Required": t.clinical_history_required ? "Yes" : "No",
            "Active": t.is_active ? "Yes" : "No"
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const labNameClean = tests[0]?.lab_details?.lab_name || "lab";
        link.download = `${labNameClean.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_test_catalog.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Test catalog exported successfully!");
    };

    const getCategoryIcon = (iconName) => {
        if (iconName && iconName.startsWith('http')) {
            return <img src={iconName} alt="Category" className="w-5 h-5 mr-1.5 object-cover rounded-sm border border-gray-200" />;
        }
        const IconCmp = ICON_MAP[iconName] || Microscope;
        return <IconCmp className="w-4 h-4 mr-1.5" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
            <div className="mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#0067A1] to-emerald-700 dark:from-[#0067A1] dark:to-[#004F7C] text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <TestTube size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                                My Test Catalog
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                                Manage your available diagnostic tests and pricing
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mr-2 hidden sm:block">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{tests.length}</p>
                        </div>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Upload size={18} />
                            <span className="hidden sm:inline">Bulk Upload CSV</span>
                        </button>
                        <button
                            onClick={exportToCsv}
                            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg flex items-center shadow-emerald-500/20"
                        >
                            <Plus size={18} className="mr-2" />
                            Add New Test
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 md:p-6 mb-8">
                    <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by test name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Test Details</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Price (₹)</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Status</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-gray-500">
                                                No tests found in your catalog. Add a test to start receiving patients!
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTests.map((test) => (
                                            <tr key={test.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 dark:text-white">{test.test_name}</span>
                                                        {test.test_code && (
                                                            <span className="text-xs font-mono text-gray-500 mt-0.5">{test.test_code}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm">
                                                    {test.category ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-[#0067A1] dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">
                                                            {getCategoryIcon(test.category.icon)}
                                                            {test.category.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Uncategorized</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-gray-800 dark:text-gray-200">
                                                    ₹{test.price}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${test.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {test.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewingTest(test)}
                                                            className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(test)}
                                                            className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                            title="Edit Test"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(test.id)}
                                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete Test"
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

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 shrink-0">
                                <h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                                    <Microscope className="w-5 h-5 mr-2 text-[#0067A1]" />
                                    {editingId ? "Edit Diagnostic Test" : "Add New Test"}
                                </h2>
                            </div>

                            <form id="lab-test-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                                {/* Row 1 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className={!editingId ? "md:col-span-2" : ""}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Test Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.test_name}
                                            onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                                            placeholder="e.g. Complete Blood Count"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    {editingId && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Test Code
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.test_code}
                                                disabled
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 focus:outline-none transition-all font-mono text-sm cursor-not-allowed"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Row 2 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Category *
                                        </label>
                                        <select
                                            required
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white appearance-none"
                                        >
                                            <option value="" disabled>Select a Category...</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Price (INR) *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                placeholder="Pricing for patient"
                                                className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white font-medium text-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3 — Sample Type (select+other) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Sample Type
                                        </label>
                                        <select
                                            value={formData.specimen_type}
                                            onChange={(e) => setFormData({ ...formData, specimen_type: e.target.value, specimen_type_custom: e.target.value === "Other" ? formData.specimen_type_custom : "" })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white appearance-none"
                                        >
                                            <option value="">Select Sample Type...</option>
                                            {SAMPLE_TYPE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                            <option value="Other">Other (Custom)</option>
                                        </select>
                                        {formData.specimen_type === "Other" && (
                                            <input
                                                type="text"
                                                value={formData.specimen_type_custom}
                                                onChange={(e) => setFormData({ ...formData, specimen_type_custom: e.target.value })}
                                                placeholder="Enter custom sample type..."
                                                className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Container
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.container}
                                            onChange={(e) => setFormData({ ...formData, container: e.target.value })}
                                            placeholder="e.g. Red top/Plain, EDTA, SST - Yellow top"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Row 4 — Temperature & Turnaround Time */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Temperature (Storage/Transport)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.temperature}
                                            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                            placeholder="e.g. Room Temp, 2-8°C, Frozen"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Turnaround Time (TAT)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.turnaround_time}
                                            onChange={(e) => setFormData({ ...formData, turnaround_time: e.target.value })}
                                            placeholder="e.g. 4th working day, Same day by 3 PM"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Row 5 — Schedule & Reporting Schedule */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Schedule
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.schedule}
                                            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                            placeholder="e.g. Daily by 3:00 PM, Mon-Fri by 11 AM"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Reporting Schedule
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reporting_schedule}
                                            onChange={(e) => setFormData({ ...formData, reporting_schedule: e.target.value })}
                                            placeholder="e.g. Same day, Next day by 5 PM"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Row 6 — Remarks */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        placeholder="Any special instructions, fasting requirements, patient preparation notes..."
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all dark:text-white resize-none"
                                    />
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-col gap-4 py-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <label className="inline-flex items-center cursor-pointer gap-3">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.clinical_history_required}
                                                onChange={(e) => setFormData({ ...formData, clinical_history_required: e.target.checked })}
                                            />
                                            <div
                                                className="w-11 h-6 rounded-full transition-colors duration-200"
                                                style={{ backgroundColor: formData.clinical_history_required ? '#d97706' : '#d1d5db' }}
                                            ></div>
                                            <div
                                                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                                                style={{ transform: formData.clinical_history_required ? 'translateX(20px)' : 'translateX(0)' }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            Clinical History Mandatory
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">Check this if the test requires the patient&apos;s specialized clinical history.</span>
                                        </span>
                                    </label>

                                    <div className="h-px w-full bg-gray-200 dark:bg-gray-600"></div>

                                    <label className="inline-flex items-center cursor-pointer gap-3">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            />
                                            <div
                                                className="w-11 h-6 rounded-full transition-colors duration-200"
                                                style={{ backgroundColor: formData.is_active ? '#0067A1' : '#d1d5db' }}
                                            ></div>
                                            <div
                                                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                                                style={{ transform: formData.is_active ? 'translateX(20px)' : 'translateX(0)' }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            Test Active (Visible to Patients)
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">Patients can search and book this test online.</span>
                                        </span>
                                    </label>
                                </div>

                            </form>

                            {/* Fixed Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium w-full sm:w-auto text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); document.getElementById('lab-test-form').requestSubmit(); }}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-emerald-400 text-white rounded-lg transition-colors font-semibold shadow-md shadow-emerald-500/20 w-full sm:w-auto text-center flex justify-center items-center"
                                >
                                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Test"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Details Modal */}
                {viewingTest && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 shrink-0">
                                <h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                                    <Eye className="w-5 h-5 mr-2 text-[#0067A1]" />
                                    Test Details
                                </h2>
                                <button
                                    onClick={() => setViewingTest(null)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 transition-colors"
                                >
                                    <Trash2 size={16} className="opacity-0" /> {/* Spacer */}
                                    <span className="absolute top-4 right-4 text-2xl font-light cursor-pointer">×</span>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* Header Info */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewingTest.test_name}</h3>
                                        {viewingTest.test_code && (
                                            <p className="text-sm font-mono text-gray-500 mt-1">{viewingTest.test_code}</p>
                                        )}
                                    </div>
                                    <span className="text-lg font-bold text-[#0067A1] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                                        ₹{viewingTest.price}
                                    </span>
                                </div>

                                <div className="h-px bg-gray-100 dark:bg-gray-700/50 w-full" />

                                {/* Grid of details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                                    {viewingTest.category && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                                {viewingTest.category.name}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.specimen_type && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sample Type</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <Droplet className="w-4 h-4 text-[#0067A1]" />
                                                {viewingTest.specimen_type}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.container && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Container</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <Syringe className="w-4 h-4 text-purple-500" />
                                                {viewingTest.container}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.temperature && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <Thermometer className="w-4 h-4 text-orange-500" />
                                                {viewingTest.temperature}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.turnaround_time && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Turnaround Time</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <ActivityIcon className="w-4 h-4 text-[#0067A1]" />
                                                {viewingTest.turnaround_time}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.schedule && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collection Schedule</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                {viewingTest.schedule}
                                            </p>
                                        </div>
                                    )}

                                    {viewingTest.reporting_schedule && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reporting Schedule</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                <FileText className="w-4 h-4 text-cyan-500" />
                                                {viewingTest.reporting_schedule}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Remarks & Flags */}
                                {(viewingTest.remarks || viewingTest.clinical_history_required || !viewingTest.is_active) && (
                                    <>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700/50 w-full" />
                                        <div className="space-y-4">
                                            {viewingTest.remarks && (
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remarks / Instructions</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                                        {viewingTest.remarks}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2">
                                                {viewingTest.clinical_history_required && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-500">
                                                        Clinical History Required
                                                    </span>
                                                )}
                                                {!viewingTest.is_active && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">
                                                        Currently Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0 flex justify-end">
                                <button
                                    onClick={() => setViewingTest(null)}
                                    className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium shadow-sm w-full sm:w-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Upload Modal */}
                {isBulkModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col h-full max-h-[96vh] sm:max-h-[92vh]">
                            {/* Header */}
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 shrink-0">
                                <h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                                    <Upload className="w-5 h-5 mr-2 text-[#0067A1]" />
                                    Bulk Upload Tests via CSV
                                </h2>
                                <button onClick={closeBulkModal} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Instructions Panel */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4 space-y-3">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Instructions
                                    </h3>
                                    <ul className="text-sm text-[#004F7C] dark:text-blue-300/90 space-y-1.5 list-disc pl-5">
                                        <li>Download the <strong>template CSV</strong> below and fill it with your test data.</li>
                                        <li><strong>Test Name</strong> and <strong>Price</strong> are mandatory fields. Other fields are optional.</li>
                                        <li>The <strong>Category</strong> column will automatically create new categories if they don&apos;t exist yet.</li>
                                        <li><strong>Clinical History Required</strong> accepts: Yes/No, True/False.</li>
                                        <li><strong>Active</strong> column defaults to Yes if left empty.</li>
                                        <li>Test codes will be auto-generated (MGR format) for all imported tests.</li>
                                        <li>Duplicate test names are allowed — the system will not check for existing entries.</li>
                                    </ul>
                                </div>

                                {/* Template Download + File Upload */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-[#0067A1] dark:text-emerald-300 rounded-xl font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                    >
                                        <Download size={18} />
                                        Download Template CSV
                                    </button>

                                    <label className="flex-1 flex flex-col items-center justify-center gap-2 px-5 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-[#0067A1] dark:hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all group">
                                        <Upload size={24} className="text-gray-400 group-hover:text-[#0067A1] transition-colors" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 text-center">
                                            {csvFileName ? (
                                                <span className="font-semibold text-[#0067A1] dark:text-emerald-400">{csvFileName}</span>
                                            ) : (
                                                "Click to select your CSV file"
                                            )}
                                        </span>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={handleCsvFile}
                                        />
                                    </label>
                                </div>

                                {/* CSV Preview Table */}
                                {csvData.length > 0 && (
                                    <div className="space-y-3">
                                        {/* Summary badges */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                                                Total Rows: {csvData.length}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
                                                <CheckCircle2 size={14} />
                                                Valid: {csvData.filter(r => r._errors.length === 0).length}
                                            </span>
                                            {csvErrors.length > 0 && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
                                                    <XCircle size={14} />
                                                    Errors: {csvErrors.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Preview Table */}
                                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                                            <table className="w-full text-left text-sm min-w-[800px]">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center w-10">#</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300 w-10 text-center">Status</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">Test Name *</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300 w-28">Price *</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">Sample</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">TAT</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300 w-24">Issues</th>
                                                        <th className="px-3 py-3 font-semibold text-gray-600 dark:text-gray-300 w-12 text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvData.map((row, i) => (
                                                        <tr
                                                            key={i}
                                                            className={`border-b border-gray-100 dark:border-gray-700/50 ${row._errors.length > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'}`}
                                                        >
                                                            <td className="px-3 py-2 text-center text-xs text-gray-400 font-mono">{row._rowNum}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                {row._errors.length === 0 ? (
                                                                    <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                                                                ) : (
                                                                    <XCircle size={18} className="text-red-500 mx-auto" title={row._errors.join(", ")} />
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.test_name} 
                                                                    onChange={(e) => handleCsvRowEdit(i, 'test_name', e.target.value)}
                                                                    className={`w-full px-2 py-1.5 text-sm bg-transparent border-b outline-none transition-colors ${row._errors.includes("Missing Test Name") ? 'border-red-400 focus:border-red-600 text-red-900 dark:text-red-300' : 'border-transparent hover:border-gray-300 focus:border-emerald-500 text-gray-900 dark:text-gray-100'}`}
                                                                    placeholder="Test Name"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                                                    <input 
                                                                        type="number" 
                                                                        value={row.price} 
                                                                        onChange={(e) => handleCsvRowEdit(i, 'price', e.target.value)}
                                                                        className={`w-full pl-6 pr-2 py-1.5 text-sm bg-transparent border-b outline-none transition-colors ${row._errors.includes("Invalid Price") ? 'border-red-400 focus:border-red-600 text-red-900 dark:text-red-300' : 'border-transparent hover:border-gray-300 focus:border-emerald-500 text-gray-900 dark:text-gray-100'}`}
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.category_name} 
                                                                    onChange={(e) => handleCsvRowEdit(i, 'category_name', e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 text-gray-700 dark:text-gray-300 outline-none transition-colors"
                                                                    placeholder="Category"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.specimen_type || ""} 
                                                                    onChange={(e) => handleCsvRowEdit(i, 'specimen_type', e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 text-gray-700 dark:text-gray-300 outline-none transition-colors"
                                                                    placeholder="Sample"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.turnaround_time || ""} 
                                                                    onChange={(e) => handleCsvRowEdit(i, 'turnaround_time', e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 text-gray-700 dark:text-gray-300 outline-none transition-colors"
                                                                    placeholder="TAT"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                {row._errors.length > 0 && (
                                                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                                        {row._errors.join(", ")}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 text-center">
                                                                <button 
                                                                    onClick={() => handleCsvRowRemove(i)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Remove Row"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0 flex gap-3 justify-end items-center">
                                <button
                                    onClick={closeBulkModal}
                                    className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                {csvData.length > 0 && (
                                    <button
                                        onClick={handleBulkUpload}
                                        disabled={bulkUploading || csvData.filter(r => r._errors.length === 0).length === 0}
                                        className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-emerald-400 text-white rounded-lg transition-colors font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        {bulkUploading ? (
                                            <>Uploading...</>
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                Upload {csvData.filter(r => r._errors.length === 0).length} Tests
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <LabOtpModal 
                isOpen={isOtpModalOpen} 
                onClose={() => {
                    setIsOtpModalOpen(false);
                    setPendingAction(null);
                }} 
                labId={labId} 
                onVerified={() => {
                    setHasConsentSession(true);
                    setIsOtpModalOpen(false);
                    if (pendingAction) {
                        pendingAction();
                        setPendingAction(null);
                    }
                }} 
            />
        </div>
    );
}
