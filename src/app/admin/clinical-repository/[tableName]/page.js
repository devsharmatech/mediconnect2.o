"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Database, Plus, Edit2, Trash2, Download, Upload, Loader2, 
  AlertTriangle, ChevronLeft, ChevronRight, FileText, Activity, ShieldAlert, X, ArrowLeft
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";

const formatTableName = (name) => {
  if (!name) return "";
  return name.replace(/^cr_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ClinicalTableManager() {
  const params = useParams();
  const selectedTable = params.tableName;

  const [schema, setSchema] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConsent, setDeleteConsent] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  
  // Advanced Import Flow States
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [isUploadStepOpen, setIsUploadStepOpen] = useState(false);
  const [isExportConsentOpen, setIsExportConsentOpen] = useState(false);
  const [exportConsent, setExportConsent] = useState(false);
  
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importSchema, setImportSchema] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, page);
    }
  }, [selectedTable, page]);

  const fetchTableData = async (tableName, currentPage = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clinical-repository?table=${tableName}&page=${currentPage}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setSchema(json.schema);
        setData(json.data);
        if (json.pagination) setPagination(json.pagination);
      } else {
        toast.error("Failed to load table schema");
      }
    } catch (e) { toast.error("Failed to fetch data"); }
    setLoading(false);
  };

  // Export Flow
  const triggerExport = () => {
    if (data.length === 0) return toast.error("No data to export.");
    setExportConsent(false);
    setIsExportConsentOpen(true);
  };

  const executeExportCSV = () => {
    if (!exportConsent) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedTable}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportConsentOpen(false);
    toast.success("Data Exported Securely");
  };

  // Import Flow - Step 1: Trigger Upload Modal
  const triggerImport = () => {
    setIsUploadStepOpen(true);
  };

  const processCSVFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      return toast.error("Please select a valid CSV file");
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error("CSV is empty");
          return;
        }
        setImportSchema(Object.keys(results.data[0]));
        setImportPreviewData(results.data);
        setIsUploadStepOpen(false); // Close Step 1
        setIsImportPreviewOpen(true); // Open Step 2 (Preview)
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const handleFileInput = (e) => processCSVFile(e.target.files[0]);
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Import Flow - Step 2: Preview & Edit
  const handlePreviewEdit = (rowIndex, colName, value) => {
    const updated = [...importPreviewData];
    updated[rowIndex][colName] = value;
    setImportPreviewData(updated);
  };

  const removePreviewRow = (rowIndex) => {
    const updated = [...importPreviewData];
    updated.splice(rowIndex, 1);
    setImportPreviewData(updated);
    if (updated.length === 0) setIsImportPreviewOpen(false);
  };

  const commitImport = async () => {
    setImportLoading(true);
    try {
      const payload = { table: selectedTable, data: importPreviewData };
      const res = await fetch("/api/admin/clinical-repository", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Successfully imported ${importPreviewData.length} records!`);
        setIsImportPreviewOpen(false);
        fetchTableData(selectedTable, 1);
        setPage(1);
      } else { toast.error("Import failed: " + json.error); }
    } catch (err) { toast.error("Import error: " + err.message); }
    setImportLoading(false);
  };

  // Standard CRUD
  const handleInputChange = (colName, value) => setFormData(prev => ({ ...prev, [colName]: value }));
  const openAddModal = () => { setEditingRow(null); setFormData({ active_status: 'true' }); setIsModalOpen(true); };
  const openEditModal = (row) => { setEditingRow(row); setFormData({ ...row }); setIsModalOpen(true); };
  const openDeleteModal = (row) => { setEditingRow(row); setDeleteConsent(false); setDeleteReason(""); setIsDeleteModalOpen(true); };

  const saveRecord = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingRow ? "PUT" : "POST";
      const payload = { table: selectedTable, data: formData };
      if (editingRow) payload.id = editingRow.id;
      const res = await fetch("/api/admin/clinical-repository", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast.success(editingRow ? "Record updated" : "Record created");
        setIsModalOpen(false);
        fetchTableData(selectedTable, page);
      } else { toast.error(json.error); }
    } catch (e) { toast.error("An error occurred while saving."); }
    setLoading(false);
  };

  const deleteRecord = async () => {
    if (!deleteConsent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clinical-repository", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, id: editingRow.id, consent: deleteConsent, reason: deleteReason })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Record deleted and audited");
        setIsDeleteModalOpen(false);
        fetchTableData(selectedTable, page);
      } else { toast.error(json.error); }
    } catch (e) { toast.error("An error occurred during deletion."); }
    setLoading(false);
  };

  if (!selectedTable) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <Link href="/admin/clinical-repository" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0067A1] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Database className="text-[#0067A1] w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {formatTableName(selectedTable)}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5 uppercase tracking-widest">
                {selectedTable}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-blue-100 text-[#0067A1]">Total Records</span>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{pagination.total}</p>
          </div>
          
          {/* Actions Span */}
          <div className="sm:col-span-1 lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-end gap-3 flex-wrap">
            <button 
              disabled={data.length === 0}
              onClick={triggerExport}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 hover:bg-slate-50 text-sm font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-[#0067A1]" /> Export CSV
            </button>
            <button 
              onClick={triggerImport}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-50 text-sm font-bold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 text-[#0067A1]" /> Import CSV
            </button>
            <button 
              onClick={openAddModal}
              className="bg-[#0067A1] text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-md shadow-[#0067A1]/20 hover:bg-[#004F7C] transition-all"
            >
              <Plus className="w-4 h-4" /> Add New Record
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  {schema.map(col => (
                    <th key={col.column_name} className="px-6 py-4 whitespace-nowrap">
                      {col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && data.length === 0 ? (
                  <tr><td colSpan={schema.length + 1} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-[#0067A1] mx-auto" /></td></tr>
                ) : data.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {schema.map(col => (
                      <td key={col.column_name} className="px-6 py-4 max-w-[250px] truncate" title={String(row[col.column_name] ?? '')}>
                        {col.column_name === 'active_status' ? (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${row[col.column_name] === 'true' || row[col.column_name] === true ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${row[col.column_name] === 'true' || row[col.column_name] === true ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            {row[col.column_name] === 'true' || row[col.column_name] === true ? 'Active' : 'Inactive'}
                          </div>
                        ) : (
                          String(row[col.column_name] ?? '-')
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(row)} className="p-2 text-[#0067A1] hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => openDeleteModal(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && data.length === 0 && (
                  <tr><td colSpan={schema.length + 1} className="py-20 text-center text-slate-500 font-medium">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Showing Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <button disabled={page === pagination.totalPages || loading} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Upload Modal */}
        {isUploadStepOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#0067A1]" /> Import CSV File
                </h2>
                <button onClick={() => setIsUploadStepOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8">
                <div 
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-[#0067A1]/50 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-[#0067A1]/10 p-4 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-[#0067A1]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Click or drag CSV file here</h3>
                  <p className="text-sm text-slate-500">Only standard .csv files are supported</p>
                  <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileInput} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Edit Modal */}
        {isImportPreviewOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-[#0067A1]" /> Step 2: Preview & Edit
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Review your {importPreviewData.length} records. You can edit cells directly before committing.</p>
                </div>
                <button onClick={() => setIsImportPreviewOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        {importSchema.map(col => <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>)}
                        <th className="px-4 py-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreviewData.map((row, rIndex) => (
                        <tr key={rIndex} className="hover:bg-slate-50">
                          {importSchema.map(col => (
                            <td key={col} className="px-2 py-2">
                              <input 
                                type="text" value={row[col] || ''} onChange={(e) => handlePreviewEdit(rIndex, col, e.target.value)}
                                className={`w-full bg-transparent border-transparent hover:border-slate-300 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] focus:bg-white rounded px-2 py-1.5 transition-all text-slate-700 ${col === 'id' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                readOnly={col === 'id'} title={col === 'id' ? 'ID is auto-generated by the database' : ''}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removePreviewRow(rIndex)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-between items-center z-10">
                <span className="text-sm font-bold text-slate-500">{importPreviewData.length} records ready</span>
                <div className="flex gap-3">
                  <button onClick={() => setIsImportPreviewOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Discard</button>
                  <button onClick={commitImport} disabled={importLoading} className="px-6 py-2.5 bg-[#0067A1] text-white font-bold rounded-xl hover:bg-[#004F7C] flex items-center gap-2 shadow-md shadow-[#0067A1]/20 transition-all disabled:opacity-50">
                    {importLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-4 h-4" />} Commit {importPreviewData.length} Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <h2 className="text-xl font-extrabold text-slate-900">{editingRow ? "Edit Record" : "Add New Record"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                <form id="recordForm" onSubmit={saveRecord} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {schema.filter(c => c.column_name !== 'id').map(col => (
                    <div key={col.column_name} className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">{col.column_name.replace(/_/g, ' ')}</label>
                      {col.column_name === 'active_status' ? (
                        <div className="flex items-center h-[42px] px-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange(col.column_name, formData[col.column_name] === 'true' ? 'false' : 'true')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:ring-offset-2 ${formData[col.column_name] === 'true' ? 'bg-[#0067A1]' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[col.column_name] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="ml-3 text-sm font-bold text-slate-700">
                            {formData[col.column_name] === 'true' ? 'Active (True)' : 'Inactive (False)'}
                          </span>
                        </div>
                      ) : (
                        <input type="text" required value={formData[col.column_name] || ''} onChange={(e) => handleInputChange(col.column_name, e.target.value)} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none shadow-sm transition-all" />
                      )}
                    </div>
                  ))}
                </form>
              </div>
              <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" form="recordForm" disabled={loading} className="px-6 py-2.5 bg-[#0067A1] text-white font-bold rounded-xl hover:bg-[#004F7C] flex items-center gap-2 shadow-md shadow-[#0067A1]/20 transition-all">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Record"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Consent Modal */}
        {isExportConsentOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-amber-100 bg-amber-50 flex gap-3 items-center rounded-t-2xl">
                <ShieldAlert className="text-amber-600 w-6 h-6" />
                <h2 className="text-xl font-extrabold text-amber-900">Data Privacy Export</h2>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-sm font-medium text-slate-600 leading-relaxed">You are exporting sensitive clinical AI knowledge data. This action is monitored. Please confirm you understand the compliance requirements.</p>
                <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={exportConsent} onChange={(e) => setExportConsent(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]" />
                  <span className="text-sm font-semibold text-slate-700 leading-snug">I agree to handle this data in accordance with DPDP compliance.</span>
                </label>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setIsExportConsentOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={executeExportCSV} disabled={!exportConsent} className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 shadow-md shadow-amber-600/20 transition-all">Confirm & Export CSV</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Consent Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex gap-3 items-center rounded-t-2xl">
                <AlertTriangle className="text-red-600 w-6 h-6" />
                <h2 className="text-xl font-extrabold text-red-900">Confirm Deletion</h2>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-sm font-medium text-slate-600 leading-relaxed">You are about to permanently delete this clinical record (ID: <span className="font-bold text-slate-900">{editingRow?.id}</span>). This action will be audited for DPDP compliance.</p>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Reason for Deletion</label>
                  <input type="text" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="e.g., Obsolete mapping" className="w-full mt-1.5 bg-white border border-slate-300 text-slate-900 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none shadow-sm transition-all" />
                </div>
                <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={deleteConsent} onChange={(e) => setDeleteConsent(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]" />
                  <span className="text-sm font-semibold text-slate-700 leading-snug">I understand this deletes clinical data and confirm this action is authorized.</span>
                </label>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={deleteRecord} disabled={!deleteConsent || loading || !deleteReason} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 shadow-md shadow-red-600/20 transition-all">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete & Audit"}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
