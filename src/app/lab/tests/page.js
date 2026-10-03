"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Search, Thermometer, Microscope, Dna, Syringe, Biohazard, Bone, Activity as ActivityIcon, Droplet, Users, FileText, TestTube, Eye, Upload, Download, CheckCircle2, XCircle, AlertTriangle, X, Home, RefreshCw, FileSpreadsheet, HelpCircle, ShieldCheck, ChevronDown, ChevronUp, Info, Lock, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Filter } from "lucide-react";
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
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedCollection, setSelectedCollection] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
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
    const [showColumnGuide, setShowColumnGuide] = useState(false);
    const [skipExistingDuplicates, setSkipExistingDuplicates] = useState(true);
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        test_code: "",
        test_name: "",
        category_id: "",
        price: "",
        collection_type: "lab",
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
                collection_type: testItem.collection_type || "lab",
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
                collection_type: "lab",
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

    const handleQuickCycleCollectionType = async (test, e) => {
        if (e) e.stopPropagation();
        const cycle = { 'lab': 'home', 'home': 'both', 'both': 'lab' };
        const nextType = cycle[test.collection_type || 'lab'] || 'lab';

        try {
            const res = await fetch(`/api/lab/tests/${test.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lab_id: labId,
                    collection_type: nextType
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Collection set to: ${nextType === 'home' ? 'Home Collection' : nextType === 'both' ? 'Both (Home & Lab)' : 'Lab Visit'}`);
                setTests(prev => prev.map(t => t.id === test.id ? { ...t, collection_type: nextType } : t));
            } else if (res.status === 403 && data.error?.code === "CONSENT_REQUIRED") {
                setPendingAction(() => () => handleQuickCycleCollectionType(test, e));
                setIsOtpModalOpen(true);
            } else {
                toast.error(data.message || "Failed to update collection type");
            }
        } catch {
            toast.error("Network error updating collection type");
        }
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

    const filteredTests = tests.filter(t => {
        // Search query (test_name, test_code, category name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesName = t.test_name?.toLowerCase().includes(query);
            const matchesCode = t.test_code?.toLowerCase().includes(query);
            const matchesCategory = t.category?.name?.toLowerCase().includes(query);
            if (!matchesName && !matchesCode && !matchesCategory) return false;
        }

        // Category filter
        if (selectedCategory !== "all") {
            if (selectedCategory === "uncategorized") {
                if (t.category_id || t.category) return false;
            } else {
                if (String(t.category_id) !== String(selectedCategory) && t.category?.name !== selectedCategory) {
                    return false;
                }
            }
        }

        // Collection type filter
        if (selectedCollection !== "all") {
            if (t.collection_type !== selectedCollection) return false;
        }

        // Status filter
        if (selectedStatus !== "all") {
            const isActive = selectedStatus === "active";
            if (Boolean(t.is_active) !== isActive) return false;
        }

        return true;
    }).sort((a, b) => {
        if (sortBy === "name_asc") return (a.test_name || "").localeCompare(b.test_name || "");
        if (sortBy === "name_desc") return (b.test_name || "").localeCompare(a.test_name || "");
        if (sortBy === "price_asc") return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        if (sortBy === "price_desc") return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        if (sortBy === "code_asc") return (a.test_code || "").localeCompare(b.test_code || "");
        // "newest" (default)
        return (new Date(b.created_at || 0)) - (new Date(a.created_at || 0));
    });

    const totalPages = Math.ceil(filteredTests.length / pageSize) || 1;
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTests.length);
    const paginatedTests = filteredTests.slice(startIndex, endIndex);

    const getPageNumbers = (current, total) => {
        if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        if (current <= 4) {
            return [1, 2, 3, 4, 5, "...", total];
        }
        if (current >= total - 3) {
            return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
        }
        return [1, "...", current - 1, current, current + 1, "...", total];
    };

    // ─── CSV Bulk Upload & Download Functions ──────────────────

    const CSV_HEADERS = [
        "Test Name", "Price", "Category", "Collection Type", "Sample Type", "Container",
        "Temperature", "Turnaround Time", "Schedule", "Reporting Schedule",
        "Remarks", "Clinical History Required", "Active"
    ];

    const COLUMN_GUIDE = [
        { name: "Test Name", required: true, format: "Text (2-200 characters)", example: "Complete Blood Count (CBC)", desc: "Primary investigation name" },
        { name: "Price", required: true, format: "Positive number in ₹", example: "350", desc: "Patient test fee" },
        { name: "Category", required: false, format: "Category name", example: "Hematology", desc: "Auto-creates category if new" },
        { name: "Collection Type", required: false, format: "both | lab | home", example: "both", desc: "Defaults to 'lab' if empty" },
        { name: "Sample Type", required: false, format: "Text", example: "EDTA Whole Blood", desc: "Biological specimen required" },
        { name: "Container", required: false, format: "Text", example: "Purple Top (EDTA)", desc: "Vial or collection tube" },
        { name: "Temperature", required: false, format: "Text", example: "2-8°C / Room Temp", desc: "Transport and storage temp" },
        { name: "Turnaround Time", required: false, format: "Text", example: "Same Day (4 Hours)", desc: "Estimated result delivery time" },
        { name: "Schedule", required: false, format: "Text", example: "Daily 7 AM - 6 PM", desc: "Sample acceptance cutoff" },
        { name: "Reporting Schedule", required: false, format: "Text", example: "Same day by 7 PM", desc: "When reports are generated" },
        { name: "Remarks", required: false, format: "Text", example: "12 hrs fasting required", desc: "Patient preparation instructions" },
        { name: "Clinical History Required", required: false, format: "Yes | No", example: "No", desc: "Requires doctor prescription/notes" },
        { name: "Active", required: false, format: "Yes | No", example: "Yes", desc: "Show in active test catalog" },
    ];

    // Download Sample CSV with 6 realistic tests
    const downloadSampleCsv = () => {
        const sampleRows = [
            [
                "Complete Blood Count (CBC)", "350", "Hematology", "both", "EDTA Whole Blood", "Purple Top (EDTA)",
                "2-8°C", "Same Day (4 Hours)", "Daily 7:00 AM - 6:00 PM", "Same day by 7:00 PM",
                "No special fasting required", "No", "Yes"
            ],
            [
                "Lipid Profile Extended", "750", "Biochemistry", "both", "Serum", "Red Top (Plain)",
                "2-8°C", "24 Hours", "Mon-Sat by 12:00 PM", "Next day by 4:00 PM",
                "12 hours overnight fasting mandatory", "No", "Yes"
            ],
            [
                "Thyroid Profile Total (T3, T4, TSH)", "550", "Endocrinology", "both", "Serum", "Gold Top (SST)",
                "2-8°C", "24 Hours", "Daily by 11:00 AM", "Same day by 6:00 PM",
                "Early morning sample preferred", "Yes", "Yes"
            ],
            [
                "Fasting Blood Sugar (Glucose)", "120", "Biochemistry", "both", "Fluoride Plasma", "Grey Top (Fluoride)",
                "Room Temp", "2 Hours", "Daily 7:00 AM - 11:00 AM", "Same day in 2 hours",
                "8-10 hours strict fasting", "No", "Yes"
            ],
            [
                "Urine Routine & Microscopic Exam", "180", "Clinical Pathology", "lab", "Mid-stream Urine", "Sterile Urine Container",
                "Room Temp", "3 Hours", "Daily 8:00 AM - 7:00 PM", "Same day by 5:00 PM",
                "First morning midstream clean catch sample", "No", "Yes"
            ],
            [
                "Glycated Hemoglobin (HbA1c)", "450", "Diabetes Care", "both", "EDTA Whole Blood", "Purple Top (EDTA)",
                "2-8°C", "Same Day", "Daily by 2:00 PM", "Same day by 6:00 PM",
                "Random sample, fasting not needed", "Yes", "Yes"
            ]
        ];

        const csvContent = [
            CSV_HEADERS.map(h => `"${h}"`).join(","),
            ...sampleRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "mediconnect_sample_tests.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Sample CSV with demo tests downloaded!");
    };

    // Download Blank Template CSV (Headers only)
    const downloadBlankTemplate = () => {
        const csvContent = CSV_HEADERS.map(h => `"${h}"`).join(",") + "\r\n";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "mediconnect_blank_tests_template.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Blank template CSV downloaded!");
    };

    // Backward-compatible alias
    const downloadTemplate = downloadSampleCsv;

    // Sanitize string from malicious formula injection (=, +, -, @)
    const sanitizeCsvInput = (val) => {
        if (!val) return "";
        let str = String(val).trim();
        if (/^[=+\-@\t\r]/.test(str)) {
            str = str.substring(1).trim();
        }
        return str;
    };

    const handleCsvFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. File Type Validation
        const fileName = file.name || "";
        if (!fileName.toLowerCase().endsWith(".csv")) {
            toast.error("Invalid file format. Please upload a .csv file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // 2. File Size Safety Check (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Maximum size is 5MB.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setCsvFileName(fileName);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = [];
                const errs = [];
                const seenInCsv = new Set();

                results.data.forEach((row, idx) => {
                    const rawTestName = sanitizeCsvInput(row["Test Name"] || row["test_name"] || "");
                    const rawPrice = sanitizeCsvInput(row["Price"] || row["price"] || "");
                    const catName = sanitizeCsvInput(row["Category"] || row["category"] || "");
                    const rawColType = sanitizeCsvInput(row["Collection Type"] || row["collection_type"] || "").toLowerCase();
                    const collectionType = ["home", "lab", "both"].includes(rawColType) ? rawColType : "lab";

                    const rowErrors = [];
                    if (!rawTestName) {
                        rowErrors.push("Missing Test Name");
                    } else if (rawTestName.length < 2) {
                        rowErrors.push("Test Name too short");
                    } else if (rawTestName.length > 200) {
                        rowErrors.push("Test Name exceeds 200 chars");
                    }

                    const parsedPrice = parseFloat(rawPrice);
                    if (!rawPrice || isNaN(parsedPrice)) {
                        rowErrors.push("Invalid Price");
                    } else if (parsedPrice < 0) {
                        rowErrors.push("Price cannot be negative");
                    } else if (parsedPrice > 1000000) {
                        rowErrors.push("Price exceeds ₹10,00,000");
                    }

                    // Check duplicate within the uploaded CSV
                    const lowerName = rawTestName.toLowerCase();
                    let isDuplicateInFile = false;
                    if (lowerName) {
                        if (seenInCsv.has(lowerName)) {
                            isDuplicateInFile = true;
                            rowErrors.push("Duplicate in file");
                        } else {
                            seenInCsv.add(lowerName);
                        }
                    }

                    // Check if test name already exists in current catalog
                    const isExistingInCatalog = tests.some(
                        t => t.test_name?.trim().toLowerCase() === lowerName
                    );

                    // Find category ID by name (case-insensitive)
                    const matchedCat = categories.find(
                        c => c.name?.toLowerCase() === catName.toLowerCase()
                    );

                    const parsed = {
                        test_name: rawTestName,
                        price: rawPrice,
                        category_id: matchedCat?.id || null,
                        category_name: matchedCat?.name || catName || "—",
                        collection_type: collectionType,
                        specimen_type: sanitizeCsvInput(row["Sample Type"] || row["specimen_type"] || "") || null,
                        container: sanitizeCsvInput(row["Container"] || row["container"] || "") || null,
                        temperature: sanitizeCsvInput(row["Temperature"] || row["temperature"] || "") || null,
                        turnaround_time: sanitizeCsvInput(row["Turnaround Time"] || row["turnaround_time"] || "") || null,
                        schedule: sanitizeCsvInput(row["Schedule"] || row["schedule"] || "") || null,
                        reporting_schedule: sanitizeCsvInput(row["Reporting Schedule"] || row["reporting_schedule"] || "") || null,
                        remarks: sanitizeCsvInput(row["Remarks"] || row["remarks"] || "") || null,
                        clinical_history_required: ["yes", "true", "1"].includes(sanitizeCsvInput(row["Clinical History Required"] || "").toLowerCase()),
                        is_active: !["no", "false", "0"].includes(sanitizeCsvInput(row["Active"] || "").toLowerCase()),
                        _isExisting: isExistingInCatalog,
                        _isDuplicateInFile: isDuplicateInFile,
                        _errors: rowErrors,
                        _rowNum: idx + 2,
                    };

                    if (rowErrors.length > 0) {
                        errs.push(parsed);
                    }
                    rows.push(parsed);
                });

                setCsvData(rows);
                setCsvErrors(errs);
                if (rows.length === 0) {
                    toast.error("The CSV file contains no data rows.");
                } else if (errs.length > 0) {
                    toast.error(`${errs.length} row(s) have validation issues. Review below before uploading.`);
                } else {
                    toast.success(`${rows.length} rows loaded successfully!`);
                }
            },
            error: () => {
                toast.error("Failed to read CSV file. Please verify file integrity.");
            }
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCsvRowEdit = (index, field, value) => {
        const updatedData = [...csvData];
        const row = updatedData[index];
        row[field] = sanitizeCsvInput(value);
        
        // Re-validate row
        const rowErrors = [];
        if (!row.test_name?.trim()) {
            rowErrors.push("Missing Test Name");
        } else if (row.test_name.trim().length < 2) {
            rowErrors.push("Test Name too short");
        }
        
        const p = parseFloat(row.price);
        if (!row.price || isNaN(p)) {
            rowErrors.push("Invalid Price");
        } else if (p < 0) {
            rowErrors.push("Price cannot be negative");
        } else if (p > 1000000) {
            rowErrors.push("Price exceeds ₹10,00,000");
        }
        
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
        let rowsToUpload = csvData.filter(r => r._errors.length === 0);

        if (skipExistingDuplicates) {
            rowsToUpload = rowsToUpload.filter(r => !r._isExisting);
        }

        if (rowsToUpload.length === 0) {
            toast.error("No valid tests ready to upload.");
            return;
        }

        setBulkUploading(true);
        try {
            const payload = rowsToUpload.map(({ _errors, _rowNum, _isExisting, _isDuplicateInFile, ...rest }) => rest);
            const response = await fetch("/api/lab/tests/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ lab_id: labId, tests: payload }),
            });
            const result = await response.json();

            if (response.status === 403 && result.error?.code === "CONSENT_REQUIRED") {
                setPendingAction(() => () => handleBulkUpload());
                setIsOtpModalOpen(true);
                return;
            }

            if (result.success) {
                toast.success(result.message || `${rowsToUpload.length} tests imported successfully!`);
                closeBulkModal();
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
        setShowColumnGuide(false);
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
            "Collection Type": t.collection_type || "lab",
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
            return <img src={iconName} alt="Category" className="w-4 h-4 mr-1.5 shrink-0 object-cover rounded-sm border border-gray-200" />;
        }
        const IconCmp = ICON_MAP[iconName] || Microscope;
        return <IconCmp className="w-3.5 h-3.5 mr-1.5 shrink-0" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0067A1]/10 dark:bg-[#0067A1]/20 text-[#0067A1] dark:text-sky-300 flex items-center justify-center shrink-0">
                        <TestTube size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Diagnostic Test Catalog
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Configure investigations, pricing, specimen types, and collection options
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="px-3.5 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span className="text-slate-400 font-normal">Total:</span>
                        <span className="font-bold text-[#0067A1] dark:text-sky-400">{tests.length} tests</span>
                    </div>

                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                        <Upload size={15} />
                        <span>Bulk Upload CSV</span>
                    </button>

                    <button
                        onClick={exportToCsv}
                        className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Download size={15} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#0067A1] hover:bg-[#005585] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Add New Test</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700 p-5 sm:p-6">
                {/* Search and Filters Bar */}
                <div className="mb-5 space-y-3">
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search Input with Clear Button */}
                        <div className="relative flex-1 max-w-lg">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by test name, code (e.g. MGR1485), or category..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all shadow-xs"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdowns Grid */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Category Filter */}
                            <div className="relative min-w-[150px] flex-1 sm:flex-initial">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                                >
                                    <option value="all">All Categories ({categories.length})</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                    <option value="uncategorized">Uncategorized</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>

                            {/* Collection Filter */}
                            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                                <select
                                    value={selectedCollection}
                                    onChange={(e) => {
                                        setSelectedCollection(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                                >
                                    <option value="all">All Collection</option>
                                    <option value="lab">Lab Visit</option>
                                    <option value="home">Home Collection</option>
                                    <option value="both">Home & Lab</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>

                            {/* Status Filter */}
                            <div className="relative min-w-[110px] flex-1 sm:flex-initial">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative min-w-[145px] flex-1 sm:flex-initial">
                                <select
                                    value={sortBy}
                                    onChange={(e) => {
                                        setSortBy(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] cursor-pointer"
                                >
                                    <option value="newest">Sort: Newest First</option>
                                    <option value="name_asc">Name: A to Z</option>
                                    <option value="name_desc">Name: Z to A</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="code_asc">Test Code</option>
                                </select>
                                <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>

                            {/* Reset Filters Button */}
                            {(searchQuery || selectedCategory !== "all" || selectedCollection !== "all" || selectedStatus !== "all" || sortBy !== "newest") && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedCategory("all");
                                        setSelectedCollection("all");
                                        setSelectedStatus("all");
                                        setSortBy("newest");
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-1.5 shrink-0"
                                    title="Reset all filters"
                                >
                                    <X size={13} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Summary & Rows Per Page Selector */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <div className="flex items-center gap-2">
                            <span>
                                Showing <strong className="text-slate-700 dark:text-slate-200">{filteredTests.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-700 dark:text-slate-200">{filteredTests.length}</strong> tests
                            </span>
                            {filteredTests.length !== tests.length && (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-50 text-[#0067A1] dark:bg-sky-950/40 dark:text-sky-300 font-semibold border border-sky-100 dark:border-sky-900/60">
                                    Filtered from {tests.length} total
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0067A1] cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
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
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Test Details</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Category</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Price (₹)</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">Collection</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">Status</th>
                                        <th className="pb-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center">
                                                <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                                                    <div className="w-14 h-14 bg-sky-50 dark:bg-sky-950/40 text-[#0067A1] dark:text-sky-400 rounded-2xl flex items-center justify-center shadow-inner">
                                                        <TestTube size={28} />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                                        {searchQuery || selectedCategory !== "all" || selectedCollection !== "all" || selectedStatus !== "all"
                                                            ? "No matching tests found"
                                                            : "No tests in your catalog yet"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                                        {searchQuery || selectedCategory !== "all" || selectedCollection !== "all" || selectedStatus !== "all"
                                                            ? "Try adjusting your search query or filter options to find what you are looking for."
                                                            : "Add individual tests or quickly import your entire catalog at once using our CSV Bulk Upload option."}
                                                    </p>
                                                    {searchQuery || selectedCategory !== "all" || selectedCollection !== "all" || selectedStatus !== "all" ? (
                                                        <button
                                                            onClick={() => {
                                                                setSearchQuery("");
                                                                setSelectedCategory("all");
                                                                setSelectedCollection("all");
                                                                setSelectedStatus("all");
                                                                setSortBy("newest");
                                                                setCurrentPage(1);
                                                            }}
                                                            className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                                                        >
                                                            <X size={15} />
                                                            Reset Filters
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-3 pt-2">
                                                            <button
                                                                onClick={() => setIsBulkModalOpen(true)}
                                                                className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0067A1] border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105"
                                                            >
                                                                <Upload size={16} />
                                                                Bulk Upload CSV
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenModal()}
                                                                className="px-4 py-2 bg-[#0067A1] hover:bg-[#005585] text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105"
                                                            >
                                                                <Plus size={16} />
                                                                Add Single Test
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedTests.map((test) => (
                                            <tr key={test.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 dark:text-white">{test.test_name}</span>
                                                        {test.test_code && (
                                                             <span className="text-xs font-mono text-gray-500 mt-0.5">{test.test_code}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm whitespace-nowrap">
                                                    {test.category ? (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600 text-xs font-medium whitespace-nowrap">
                                                            {getCategoryIcon(test.category.icon)}
                                                            <span className="whitespace-nowrap">{test.category.name}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs whitespace-nowrap">Uncategorized</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                                    ₹{test.price}
                                                </td>
                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleQuickCycleCollectionType(test, e)}
                                                        title="Click to cycle: Lab Visit → Home Collection → Both"
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 cursor-pointer shadow-xs ${
                                                            test.collection_type === 'home'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                                : test.collection_type === 'both'
                                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                                                : 'bg-blue-50 text-[#0067A1] border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                        }`}
                                                    >
                                                        {test.collection_type === 'home' ? (
                                                            <>
                                                                <Home size={12} className="text-purple-600 dark:text-purple-400" />
                                                                <span>Home Only</span>
                                                            </>
                                                        ) : test.collection_type === 'both' ? (
                                                            <>
                                                                <RefreshCw size={12} className="text-teal-600 dark:text-teal-400" />
                                                                <span>Home & Lab</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Microscope size={12} className="text-[#0067A1] dark:text-blue-400" />
                                                                <span>Lab Visit</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${test.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {test.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right whitespace-nowrap">
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
                                                            className="p-2 text-slate-500 hover:text-[#0067A1] hover:bg-sky-50 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
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

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Page <strong className="text-slate-800 dark:text-white">{safeCurrentPage}</strong> of <strong className="text-slate-800 dark:text-white">{totalPages}</strong>
                                <span className="hidden sm:inline"> • Showing tests {startIndex + 1}–{endIndex} of {filteredTests.length}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* First Page */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage === 1}
                                    className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                    title="First Page"
                                >
                                    <ChevronsLeft size={16} />
                                </button>

                                {/* Previous Page */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={safeCurrentPage === 1}
                                    className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Previous Page"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Numbered Page Buttons with intelligent ellipsis */}
                                <div className="flex items-center gap-1">
                                    {getPageNumbers(safeCurrentPage, totalPages).map((pageNum, idx) => (
                                        pageNum === "..." ? (
                                            <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-400 text-xs">...</span>
                                        ) : (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-semibold transition-all ${
                                                    safeCurrentPage === pageNum
                                                        ? 'bg-[#0067A1] text-white shadow-xs'
                                                        : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    ))}
                                </div>

                                {/* Next Page */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={safeCurrentPage === totalPages}
                                    className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Next Page"
                                >
                                    <ChevronRight size={16} />
                                </button>

                                {/* Last Page */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage === totalPages}
                                    className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Last Page"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
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

                                {/* Collection Type Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Collection Availability *
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: "lab", label: "Lab Visit", desc: "Patient visits lab", icon: Microscope },
                                            { id: "home", label: "Home Collection", desc: "Phlebotomist visits home", icon: Home },
                                            { id: "both", label: "Both (Lab & Home)", desc: "Flexible for patient", icon: RefreshCw },
                                        ].map(item => {
                                            const Icon = item.icon;
                                            const isSelected = (formData.collection_type || "lab") === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, collection_type: item.id })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                                        isSelected 
                                                            ? 'bg-blue-50/80 border-[#0067A1] text-[#0067A1] dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm ring-1 ring-[#0067A1]'
                                                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    <Icon className="w-5 h-5 mb-1" />
                                                    <span className="text-xs font-semibold">{item.label}</span>
                                                    <span className="text-[10px] opacity-75 mt-0.5">{item.desc}</span>
                                                </button>
                                            );
                                        })}
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
                                    className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold shadow-md w-full sm:w-auto text-center flex justify-center items-center"
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
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collection Availability</p>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                            viewingTest.collection_type === 'home'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                : viewingTest.collection_type === 'both'
                                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                                : 'bg-blue-100 text-[#0067A1] dark:bg-blue-900/40 dark:text-blue-300'
                                        }`}>
                                            {viewingTest.collection_type === 'home' ? (
                                                <>
                                                    <Home size={12} />
                                                    Home Collection Only
                                                </>
                                            ) : viewingTest.collection_type === 'both' ? (
                                                <>
                                                    <RefreshCw size={12} />
                                                    Both (Home & Lab)
                                                </>
                                            ) : (
                                                <>
                                                    <Microscope size={12} />
                                                    Lab Visit Only
                                                </>
                                            )}
                                        </span>
                                    </div>

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
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl xl:max-w-7xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] border border-slate-200 dark:border-slate-800">
                            {/* Header */}
                            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                                <div>
                                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-[#0067A1]" />
                                        Bulk Upload Tests via CSV
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Add multiple diagnostic tests with automatic categorization and safety validation
                                    </p>
                                </div>
                                <button onClick={closeBulkModal} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Instructions & Download Links Banner */}
                                <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-2xl p-4 sm:p-5 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <h3 className="font-bold text-[#004F7C] dark:text-sky-300 flex items-center gap-2 text-sm sm:text-base">
                                            <ShieldCheck className="w-5 h-5 text-[#0067A1] shrink-0" />
                                            Instructions & Format Requirements
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowColumnGuide(!showColumnGuide)}
                                            className="text-xs font-semibold text-[#0067A1] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                                        >
                                            <HelpCircle size={14} />
                                            {showColumnGuide ? "Hide Column Guide" : "View Column Guide & Accepted Values"}
                                            {showColumnGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>

                                    <ul className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-5">
                                        <li>
                                            Need a reference file? Download our{" "}
                                            <button
                                                type="button"
                                                onClick={downloadSampleCsv}
                                                className="text-[#0067A1] dark:text-sky-400 font-bold underline hover:text-[#004F7C] cursor-pointer"
                                            >
                                                Sample CSV with 6 Realistic Demo Tests
                                            </button>{" "}
                                            or download a{" "}
                                            <button
                                                type="button"
                                                onClick={downloadBlankTemplate}
                                                className="text-[#0067A1] dark:text-sky-400 font-bold underline hover:text-[#004F7C] cursor-pointer"
                                            >
                                                Blank Template CSV (Headers Only)
                                            </button>.
                                        </li>
                                        <li>
                                            <strong>Test Name</strong> and <strong>Price</strong> are mandatory. Price must be a valid positive number in ₹.
                                        </li>
                                        <li>
                                            <strong>Auto-Categorization</strong>: Any new Category name will be automatically created in your lab catalog.
                                        </li>
                                        <li>
                                            <strong>Duplicate Protection</strong>: System will highlight tests that already exist in your catalog to prevent accidental double-pricing.
                                        </li>
                                        <li>
                                            <strong>Auto Code Assignment</strong>: Official sequential codes (e.g. <code>MGR0001</code>) are assigned automatically to all imported tests.
                                        </li>
                                    </ul>
                                </div>

                                {/* Expandable Column Guide Table */}
                                {showColumnGuide && (
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/80 p-4 space-y-3 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                <Info size={16} className="text-[#0067A1]" />
                                                CSV Column Specifications & Accepted Values
                                            </h4>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">13 Columns Supported</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                                        <th className="py-2 px-3 font-semibold">Column Header</th>
                                                        <th className="py-2 px-3 font-semibold">Requirement</th>
                                                        <th className="py-2 px-3 font-semibold">Accepted Format / Values</th>
                                                        <th className="py-2 px-3 font-semibold">Example</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {COLUMN_GUIDE.map((col, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                            <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {col.name}
                                                            </td>
                                                            <td className="py-2 px-3 whitespace-nowrap">
                                                                {col.required ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                        Required
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                                        Optional
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{col.format}</td>
                                                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{col.example}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Download & Upload Action Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {/* Download Sample CSV */}
                                    <button
                                        type="button"
                                        onClick={downloadSampleCsv}
                                        className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0067A1] dark:hover:border-sky-500 rounded-xl transition-all shadow-xs group text-left cursor-pointer hover:shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[#0067A1] dark:text-sky-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-sky-100 dark:border-sky-900/50">
                                            <FileSpreadsheet size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Sample CSV (With Data)</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">6 pre-filled diagnostic tests</p>
                                        </div>
                                        <Download size={15} className="text-slate-400 group-hover:text-[#0067A1] shrink-0" />
                                    </button>

                                    {/* Download Blank Template */}
                                    <button
                                        type="button"
                                        onClick={downloadBlankTemplate}
                                        className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0067A1] dark:hover:border-sky-500 rounded-xl transition-all shadow-xs group text-left cursor-pointer hover:shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-slate-200 dark:border-slate-600">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Blank Template CSV</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Headers only, ready to fill</p>
                                        </div>
                                        <Download size={15} className="text-slate-400 group-hover:text-[#0067A1] shrink-0" />
                                    </button>

                                    {/* Upload Trigger */}
                                    <label className="sm:col-span-2 lg:col-span-1 flex items-center gap-3 p-3.5 bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border-2 border-dashed border-[#0067A1]/40 hover:border-[#0067A1] rounded-xl transition-all cursor-pointer group shadow-xs">
                                        <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                            <Upload size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                {csvFileName || "Select Completed CSV"}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {csvFileName ? `${csvData.length} rows parsed` : "Click to browse or drop file"}
                                            </p>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,text/csv"
                                            className="hidden"
                                            onChange={handleCsvFile}
                                        />
                                    </label>
                                </div>

                                {/* Security & Safety Highlights */}
                                {csvData.length === 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
                                            <Lock size={18} className="text-[#0067A1] shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Consent Safeguard</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    DPDP-compliant OTP verification prevents unauthorized catalog modifications.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
                                            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Non-Destructive</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Existing catalog tests are never removed or overwritten without confirmation.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
                                            <RefreshCw size={18} className="text-sky-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Formula Sanitized</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Automatic stripping of potential CSV formula injections for maximum security.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CSV Preview Table & Validation Controls */}
                                {csvData.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        {/* Status Breakdown & Controls */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <div className="flex items-center gap-2.5 flex-wrap text-xs">
                                                <span className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200">
                                                    Total Rows: {csvData.length}
                                                </span>
                                                <span className="px-3 py-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[#0067A1] dark:text-sky-300 rounded-lg font-bold flex items-center gap-1.5">
                                                    <CheckCircle2 size={13} />
                                                    Ready: {csvData.filter(r => r._errors.length === 0 && (!skipExistingDuplicates || !r._isExisting)).length}
                                                </span>
                                                {csvData.some(r => r._isExisting) && (
                                                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg font-bold flex items-center gap-1.5">
                                                        <AlertTriangle size={13} />
                                                        Existing in Catalog: {csvData.filter(r => r._isExisting).length}
                                                    </span>
                                                )}
                                                {csvErrors.length > 0 && (
                                                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg font-bold flex items-center gap-1.5">
                                                        <XCircle size={13} />
                                                        Errors: {csvErrors.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Deduplication Switch */}
                                            {csvData.some(r => r._isExisting) && (
                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={skipExistingDuplicates}
                                                        onChange={(e) => setSkipExistingDuplicates(e.target.checked)}
                                                        className="rounded text-[#0067A1] focus:ring-[#0067A1]"
                                                    />
                                                    <span>Skip tests that already exist in catalog</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Preview Table */}
                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-xs">
                                            <table className="w-full text-left text-xs min-w-[1200px]">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                                        <th className="px-3 py-3 text-center w-12 font-semibold">#</th>
                                                        <th className="px-3 py-3 w-16 text-center font-semibold">Status</th>
                                                        <th className="px-3 py-3 w-80 min-w-[280px] font-semibold">Test Name *</th>
                                                        <th className="px-3 py-3 w-28 min-w-[110px] font-semibold">Price (₹) *</th>
                                                        <th className="px-3 py-3 w-48 min-w-[180px] font-semibold">Category</th>
                                                        <th className="px-3 py-3 w-36 min-w-[130px] font-semibold">Collection</th>
                                                        <th className="px-3 py-3 w-48 min-w-[180px] font-semibold">Sample Type</th>
                                                        <th className="px-3 py-3 w-36 min-w-[130px] font-semibold">TAT</th>
                                                        <th className="px-3 py-3 min-w-[160px] font-semibold">Notes / Issues</th>
                                                        <th className="px-3 py-3 w-12 text-center font-semibold"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {csvData.map((row, i) => (
                                                        <tr
                                                            key={i}
                                                            className={`transition-colors ${
                                                                row._errors.length > 0
                                                                    ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                                                    : row._isExisting
                                                                    ? 'bg-amber-50/30 dark:bg-amber-950/20'
                                                                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                                                            }`}
                                                        >
                                                            <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">{row._rowNum}</td>
                                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                {row._errors.length > 0 ? (
                                                                    <XCircle size={16} className="text-rose-500 mx-auto" title={row._errors.join(", ")} />
                                                                ) : row._isExisting ? (
                                                                    <AlertTriangle size={16} className="text-amber-500 mx-auto" title="Already exists in your catalog" />
                                                                ) : (
                                                                    <CheckCircle2 size={16} className="text-[#0067A1] dark:text-sky-400 mx-auto" title="Valid and ready" />
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 w-80 min-w-[280px]">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.test_name} 
                                                                    title={row.test_name}
                                                                    onChange={(e) => handleCsvRowEdit(i, 'test_name', e.target.value)}
                                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                                                                        row._errors.includes("Missing Test Name") || row._errors.includes("Test Name too short")
                                                                            ? 'border-rose-400 bg-rose-50/50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                                                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 focus:border-[#0067A1] focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium'
                                                                    }`}
                                                                    placeholder="Enter test name..."
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 w-28 min-w-[110px]">
                                                                <div className="relative">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                                    <input 
                                                                        type="number" 
                                                                        value={row.price} 
                                                                        onChange={(e) => handleCsvRowEdit(i, 'price', e.target.value)}
                                                                        className={`w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                                                                            row._errors.includes("Invalid Price") || row._errors.includes("Price cannot be negative")
                                                                                ? 'border-rose-400 bg-rose-50/50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                                                                                : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 focus:border-[#0067A1] focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold'
                                                                        }`}
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 w-48 min-w-[180px]">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.category_name} 
                                                                    title={row.category_name}
                                                                    onChange={(e) => handleCsvRowEdit(i, 'category_name', e.target.value)}
                                                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 focus:border-[#0067A1] focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none transition-all"
                                                                    placeholder="Category"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 w-36 min-w-[130px]">
                                                                <select
                                                                    value={row.collection_type || "lab"}
                                                                    onChange={(e) => handleCsvRowEdit(i, 'collection_type', e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:border-[#0067A1] outline-none"
                                                                >
                                                                    <option value="lab">Lab Visit</option>
                                                                    <option value="home">Home</option>
                                                                    <option value="both">Both</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-3 py-2 w-48 min-w-[180px]">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.specimen_type || ""} 
                                                                    title={row.specimen_type || ""}
                                                                    onChange={(e) => handleCsvRowEdit(i, 'specimen_type', e.target.value)}
                                                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 focus:border-[#0067A1] focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none transition-all"
                                                                    placeholder="Sample Type"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 w-36 min-w-[130px]">
                                                                <input 
                                                                    type="text" 
                                                                    value={row.turnaround_time || ""} 
                                                                    title={row.turnaround_time || ""}
                                                                    onChange={(e) => handleCsvRowEdit(i, 'turnaround_time', e.target.value)}
                                                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 focus:border-[#0067A1] focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none transition-all"
                                                                    placeholder="TAT"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 min-w-[160px]">
                                                                {row._errors.length > 0 ? (
                                                                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                                                        {row._errors.join(", ")}
                                                                    </span>
                                                                ) : row._isExisting ? (
                                                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                                        {skipExistingDuplicates ? "Will skip (exists)" : "Will add duplicate"}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-400">Ready</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => handleCsvRowRemove(i)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                                                    title="Remove row"
                                                                >
                                                                    <Trash2 size={15} />
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
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex flex-col sm:flex-row gap-3 justify-between items-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                                    {csvData.length > 0 ? (
                                        <span>
                                            Ready to import{" "}
                                            <strong className="text-[#0067A1] dark:text-sky-400">
                                                {csvData.filter(r => r._errors.length === 0 && (!skipExistingDuplicates || !r._isExisting)).length}
                                            </strong>{" "}
                                            of {csvData.length} tests safely into catalog
                                        </span>
                                    ) : (
                                        <span>Download the sample CSV or blank template to prepare your file</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={closeBulkModal}
                                        className="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium text-xs sm:text-sm cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    {csvData.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleBulkUpload}
                                            disabled={
                                                bulkUploading ||
                                                csvData.filter(r => r._errors.length === 0 && (!skipExistingDuplicates || !r._isExisting)).length === 0
                                            }
                                            className="px-6 py-2.5 bg-[#0067A1] hover:bg-[#005585] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all font-semibold shadow-md flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                                        >
                                            {bulkUploading ? (
                                                <>
                                                    <RefreshCw size={16} className="animate-spin" />
                                                    <span>Importing Tests...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    <span>
                                                        Upload {csvData.filter(r => r._errors.length === 0 && (!skipExistingDuplicates || !r._isExisting)).length} Safe Tests
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
