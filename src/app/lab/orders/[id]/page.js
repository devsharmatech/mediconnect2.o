"use client";

import { useEffect, useState, useRef } from "react";
import { getLoggedInUser } from "@/lib/authHelpers";
import {
  User,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowLeft,
  FlaskConical,
  DollarSign,
  FileDown,
  Printer,
  ClipboardList,
  Activity,
  AlertCircle,
  Save,
  Mail,
  HeartPulse,
  Pill,
  MessageSquare,
  Home,
  BriefcaseMedical,
  AlertTriangle,
  Eye,
  Edit2,
  Plus,
  X,
  Check,
  ShieldCheck,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Upload,
  FileCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { buildPrescriptionHtml } from "@/lib/buildPrescriptionHtml";

function formatDateOfBirth(dobString) {
  if (!dobString) return null;
  try {
    const d = new Date(dobString);
    if (isNaN(d.getTime())) return dobString;

    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }

    if (age >= 0 && age < 125) {
      return `${day} ${month} ${year} (${age} yrs)`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return dobString;
  }
}

export default function LabOrderDetails() {
  const router = useRouter();
  const { id } = useParams();
  const orderId = id;

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labNotes, setLabNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [realLabName, setRealLabName] = useState("Laboratory");
  const [activeTab, setActiveTab] = useState("details");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  // itemEdits: { [itemId]: { editingPrice, priceValue, editingNotes, notesValue, savingPrice, savingNotes } }
  const [itemEdits, setItemEdits] = useState({});

  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState("");
  const [techVehicle, setTechVehicle] = useState("");
  const [assigningTech, setAssigningTech] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState("");
  const [structuredValues, setStructuredValues] = useState({});
  const [reportNotes, setReportNotes] = useState("");
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [reportTestType, setReportTestType] = useState("Diagnostic Report");
  const [activeUploadTest, setActiveUploadTest] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [saveToLocker, setSaveToLocker] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [prescriptionZoom, setPrescriptionZoom] = useState(1);
  const [showFullPrescriptionModal, setShowFullPrescriptionModal] = useState(false);
  const [rxViewMode, setRxViewMode] = useState("canvas"); // "canvas" or "html"
  const canvasRef = useRef(null);

  const openUploadModal = (testItem = null) => {
    setActiveUploadTest(testItem);
    setReportTestType(testItem ? testItem.test_name : "Consolidated Diagnostic Report");
    setReportFile(null);
    setReportPdfUrl("");
    setReportNotes("");
    setUploadModalOpen(true);
  };

  const handleUploadReport = async (e) => {
    if (e) e.preventDefault();
    if (!reportFile && !reportPdfUrl) {
      toast.error("Please select a report file or enter a report URL.");
      return;
    }
    const user = getLoggedInUser("lab");
    const labId = user?.id || order?.lab_id;

    if (!labId) {
      toast.error("Laboratory account not found. Please log in again.");
      return;
    }

    try {
      setUploadingReport(true);
      let res;
      if (reportFile) {
        const formData = new FormData();
        formData.append("file", reportFile);
        formData.append("order_id", orderId);
        formData.append("lab_id", labId);
        if (activeUploadTest) {
          formData.append("item_id", activeUploadTest.id);
          formData.append("test_name", activeUploadTest.test_name);
          formData.append("test_type", activeUploadTest.test_name);
        } else {
          formData.append("test_type", reportTestType);
        }
        formData.append("notes", reportNotes);
        formData.append("save_to_digilocker", saveToLocker ? "true" : "false");

        res = await fetch("/api/lab/order/upload-report", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/lab/order/upload-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            lab_id: labId,
            item_id: activeUploadTest?.id || null,
            test_name: activeUploadTest?.test_name || null,
            test_type: activeUploadTest ? activeUploadTest.test_name : reportTestType,
            report_url: reportPdfUrl,
            notes: reportNotes,
            save_to_digilocker: saveToLocker,
          }),
        });
      }

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Report uploaded and synced to DigiLocker successfully!");
        setReportFile(null);
        setReportPdfUrl("");
        setReportNotes("");
        setUploadModalOpen(false);
        setActiveUploadTest(null);
        await fetchDetails();
      } else {
        toast.error(json.message || "Failed to upload report");
      }
    } catch (err) {
      console.error("Report upload error:", err);
      toast.error(err.message || "Failed to upload report");
    } finally {
      setUploadingReport(false);
    }
  };

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await fetch("/api/lab/technicians");
        const json = await res.json();
        if (json.status) {
          setTechnicians(json.data);
          if (json.data.length > 0) setSelectedTech(json.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load technicians:", err);
      }
    };
    fetchTechnicians();
  }, []);

  const statusOptions = [
    "pending",
    "booked",
    "technician_assigned",
    "collected",
    "received_at_lab",
    "processing",
    "quality_check",
    "completed",
    "cancelled",
    "rejected"
  ];

  const itemStatusOptions = [
    "pending",
    "approved",
    "not_available",
    "rejected",
    "completed",
  ];

  const statusColors = {
    pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    booked: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    technician_assigned: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    collected: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    received_at_lab: "bg-teal-100 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 border-teal-200 dark:border-teal-800",
    processing: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    quality_check: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
    cancelled: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  };

  const itemStatusColors = {
    pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    not_available: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  };

  const collectionTypeColors = {
    walk_in: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    home_collection: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    scheduled: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
  };


  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/order/get/${orderId}`);
      const json = await res.json();

      if (json.status) {
        setOrder(json.data);
        setItems(json.data.items || []);
        setLabNotes(json.data.lab_notes || "");
      } else {
        toast.error("Failed to fetch order details");
      }
    } catch (error) {
      toast.error("Error loading order details");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status) => {
    try {
      const res = await fetch("/api/lab/order/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId, status }),
      });

      const json = await res.json();
      if (json.status) {
        toast.success("Order status updated successfully");
        fetchDetails();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Error updating status");
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTech) {
      toast.error("Please select a technician");
      return;
    }
    const tech = technicians.find(t => t.id === selectedTech);
    if (!tech) return;

    setAssigningTech(true);
    try {
      const res = await fetch("/api/lab/order/assign-technician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          lab_id: order.lab_id,
          technician_id: tech.id,
          technician_name: tech.name,
          technician_phone: tech.phone,
          technician_vehicle: techVehicle || tech.vehicle
        })
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Technician assigned successfully!");
        fetchDetails();
      } else {
        toast.error(json.message || "Failed to assign technician");
      }
    } catch (err) {
      toast.error("Error assigning technician");
    } finally {
      setAssigningTech(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    setCancellingOrder(true);
    try {
      const res = await fetch("/api/lab/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          lab_id: order.lab_id,
          cancel_reason: cancelReason
        })
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Order cancelled successfully!");
        fetchDetails();
      } else {
        toast.error(json.message || "Failed to cancel order");
      }
    } catch (err) {
      toast.error("Error cancelling order");
    } finally {
      setCancellingOrder(false);
    }
  };


  const updatePaymentStatus = async (payment_status) => {
    setUpdatingPayment(true);
    try {
      const res = await fetch("/api/lab/order/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId, payment_status }),
      });

      const json = await res.json();
      if (json.status) {
        toast.success("Payment status updated successfully");
        fetchDetails();
      } else {
        toast.error("Failed to update payment status");
      }
    } catch (error) {
      toast.error("Error updating payment status");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const updateItemStatus = async (itemId, status) => {
    try {
      const res = await fetch("/api/lab/order/update-item-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, status }),
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Test status updated");
        fetchDetails();
      } else {
        toast.error("Failed to update test status");
      }
    } catch (error) {
      toast.error("Error updating test status");
    }
  };

  // ─── Inline item editing helpers ─────────────────────────────────
  const startEditPrice = (item) =>
    setItemEdits((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], editingPrice: true, priceValue: String(item.price ?? "") },
    }));

  const startEditNotes = (item) =>
    setItemEdits((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], editingNotes: true, notesValue: item.notes ?? "" },
    }));

  const cancelItemEdit = (itemId, field) =>
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field === "price" ? "editingPrice" : "editingNotes"]: false,
      },
    }));

  const saveItemPrice = async (itemId) => {
    const edit = itemEdits[itemId] || {};
    const newPrice = parseFloat(edit.priceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Enter a valid price (≥ 0)");
      return;
    }
    setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingPrice: true } }));
    try {
      const res = await fetch("/api/lab/order/update-item-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, price: newPrice }),
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Price updated");
        setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], editingPrice: false, savingPrice: false } }));
        fetchDetails();
      } else {
        toast.error(json.message || "Failed to update price");
        setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingPrice: false } }));
      }
    } catch {
      toast.error("Error updating price");
      setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingPrice: false } }));
    }
  };

  const saveItemNotes = async (itemId) => {
    const edit = itemEdits[itemId] || {};
    setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingNotes: true } }));
    try {
      const res = await fetch("/api/lab/order/update-item-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, notes: edit.notesValue ?? "" }),
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Instructions saved");
        setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], editingNotes: false, savingNotes: false } }));
        fetchDetails();
      } else {
        toast.error(json.message || "Failed to save instructions");
        setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingNotes: false } }));
      }
    } catch {
      toast.error("Error saving instructions");
      setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], savingNotes: false } }));
    }
  };

  const updateLabNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/lab/order/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          lab_notes: labNotes,
        }),
      });

      const json = await res.json();
      if (json.status) {
        toast.success("Lab notes saved successfully");
      } else {
        toast.error("Failed to save notes");
      }
    } catch (error) {
      toast.error("Error saving notes");
    } finally {
      setSaving(false);
    }
  };

  // Fetch real lab name on mount
  useEffect(() => {
    const user = getLoggedInUser("lab");
    if (user) {
      (async () => {
        try {
          const nameRes = await fetch("/api/lab/my-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          const nameData = await nameRes.json();
          if (nameData.success && nameData.lab_name) {
            setRealLabName(nameData.lab_name);
          }
        } catch { }
      })();
    }
  }, []);

  const downloadInvoice = () => {
    const patientName = order.patient?.details?.full_name || "N/A";
    const patientPhone = order.patient?.phone_number || "N/A";
    const patientEmail = order.patient?.details?.email || "N/A";
    const patientGender = order.patient?.details?.gender || "N/A";
    const patientAddress = order.patient?.details?.address || "N/A";
    const invoiceDate = formatDate(order.created_at);
    const total = calculateTotalAmount();

    const itemsRows = items.map((item, i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${i + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#111827;font-size:13px">${item.test_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px">
          <span style="padding:3px 10px;border-radius:20px;font-weight:600;font-size:11px;background:${item.status === 'completed' ? '#dcfce7;color:#15803d' : item.status === 'rejected' ? '#fee2e2;color:#b91c1c' : '#fef3c7;color:#92400e'}">${(item.status || '').replace(/_/g, ' ').toUpperCase()}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;font-size:13px">₹${(item.price || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html><head><title>Invoice - ${realLabName} - Order #${order.unid}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#333; background:#fff; }
      @media print {
        body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .no-print { display:none!important; }
      }
    </style>
    </head><body>
    <div style="max-width:800px;margin:0 auto;padding:32px 28px;position:relative;overflow:hidden;min-height:100vh">

      <!-- Watermark -->
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(11,79,74,0.04);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:4px;text-transform:uppercase">
        ${realLabName}
      </div>
      <div style="position:fixed;top:30%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(11,79,74,0.04);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:4px;text-transform:uppercase">
        ${realLabName}
      </div>
      <div style="position:fixed;top:70%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(11,79,74,0.04);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:4px;text-transform:uppercase">
        ${realLabName}
      </div>

      <!-- All content relative to appear above watermark -->
      <div style="position:relative;z-index:1">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #0067A1">
          <div>
            <h1 style="font-size:26px;font-weight:800;color:#0067A1;margin-bottom:2px;letter-spacing:-0.5px">${realLabName}</h1>
            <p style="font-size:12px;color:#6b7280">Diagnostic Laboratory Services</p>
            <p style="font-size:11px;color:#9ca3af;margin-top:2px">Powered by MediConnect</p>
          </div>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:800;color:#0067A1;letter-spacing:-0.5px">INVOICE</div>
            <p style="font-size:13px;color:#6b7280;margin-top:4px">Order #${order.unid}</p>
            <p style="font-size:12px;color:#9ca3af;margin-top:2px">${invoiceDate}</p>
          </div>
        </div>

        <!-- Patient & Order Info -->
        <div style="display:flex;gap:24px;margin-bottom:28px">
          <div style="flex:1;background:#f8fffe;border:1px solid #d1fae5;border-radius:12px;padding:18px">
            <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0067A1;font-weight:700;margin-bottom:12px">Patient Details</h3>
            <p style="font-size:14px;font-weight:600;color:#111827;margin-bottom:6px">${patientName}</p>
            <p style="font-size:12px;color:#6b7280;margin-bottom:3px">📞 ${patientPhone}</p>
            <p style="font-size:12px;color:#6b7280;margin-bottom:3px">✉️ ${patientEmail}</p>
            <p style="font-size:12px;color:#6b7280;margin-bottom:3px">⚧ ${patientGender}</p>
            <p style="font-size:12px;color:#6b7280">📍 ${patientAddress}</p>
          </div>
          <div style="flex:1;background:#f8fffe;border:1px solid #d1fae5;border-radius:12px;padding:18px">
            <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0067A1;font-weight:700;margin-bottom:12px">Order Info</h3>
            <p style="font-size:12px;color:#6b7280;margin-bottom:6px"><strong style="color:#374151">Status:</strong> ${(order.status || '').replace(/_/g, ' ').toUpperCase()}</p>
            <p style="font-size:12px;color:#6b7280;margin-bottom:6px"><strong style="color:#374151">Collection:</strong> ${(order.collection_type || order.visit_type || '').replace(/_/g, ' ').toUpperCase()}</p>
            ${order.prescription?.doctor ? `<p style="font-size:12px;color:#6b7280;margin-bottom:6px"><strong style="color:#374151">Doctor:</strong> ${order.prescription.doctor.full_name || 'N/A'}</p>` : ''}
            ${order.prescription?.doctor?.clinic_name ? `<p style="font-size:12px;color:#6b7280"><strong style="color:#374151">Clinic:</strong> ${order.prescription.doctor.clinic_name}</p>` : ''}
          </div>
        </div>

        <!-- Tests Table -->
        <div style="margin-bottom:24px">
          <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0067A1;font-weight:700;margin-bottom:12px">Ordered Tests</h3>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#0067A1">
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:white;font-weight:600;width:50px">#</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:white;font-weight:600">Test Name</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:white;font-weight:600;width:120px">Status</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:white;font-weight:600;width:100px">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
        </div>

        <!-- Billing Summary -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
          <div style="width:280px;background:#f8fffe;border:1px solid #d1fae5;border-radius:12px;padding:18px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:#6b7280">
              <span>Subtotal</span>
              <span style="font-weight:600;color:#111827">₹${total.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:#6b7280">
              <span>Tax</span>
              <span style="font-weight:600;color:#111827">₹0</span>
            </div>
            <div style="border-top:2px solid #0067A1;padding-top:10px;margin-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:800">
              <span style="color:#374151">Total</span>
              <span style="color:#0067A1">₹${total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        ${order.patient_notes ? `
        <div style="margin-bottom:24px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px">
          <h4 style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">Patient Notes</h4>
          <p style="font-size:13px;color:#78350f">${order.patient_notes}</p>
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:2px solid #e5e7eb;padding-top:20px;text-align:center">
          <p style="font-size:13px;font-weight:600;color:#0067A1;margin-bottom:6px">${realLabName}</p>
          <p style="font-size:12px;color:#9ca3af;margin-bottom:4px">This is a computer-generated invoice. No signature required.</p>
          <p style="font-size:12px;color:#9ca3af;margin-bottom:8px">For queries, contact support@mediconnect.com</p>
          <p style="font-size:11px;color:#d1d5db">Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>

      </div>
    </div>

    <div class="no-print" style="text-align:center;padding:20px">
      <button onclick="window.print()" style="padding:12px 32px;background:#0067A1;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-right:10px">🖨️ Print Invoice</button>
      <button onclick="window.close()" style="padding:12px 32px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Close</button>
    </div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatQualification = (q) => {
    if (!q) return "";
    if (Array.isArray(q)) return q.join(", ");
    if (typeof q === "string") {
      try {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch {}
      return q;
    }
    return String(q);
  };

  const calculateTotalAmount = () => {
    if (order?.total_amount && order.total_amount > 0) {
      return order.total_amount;
    }
    // Calculate from items if total_amount is 0
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const totalAmount = calculateTotalAmount();
  const collectionFee = (order?.visit_type === "home_collection" || totalAmount > itemsSubtotal)
    ? Math.max(0, totalAmount - itemsSubtotal)
    : 0;
  const orderStatus = order?.status || "pending";
  const orderStatusColor = statusColors[orderStatus.toLowerCase()] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200";

  const prescriptionFileUrl = order?.prescription?.prescription_file_url || order?.prescription?.file_url || null;
  const isPrescriptionPdf = prescriptionFileUrl ? prescriptionFileUrl.toLowerCase().includes(".pdf") : false;
  const hasUploadedPrescription = Boolean(prescriptionFileUrl);
  const hasDigitalPrescription = Boolean(
    order?.prescription && !hasUploadedPrescription && (
      (Array.isArray(order.prescription.lab_tests) && order.prescription.lab_tests.length > 0) ||
      order.prescription.doctor ||
      order.prescription.doctor_id ||
      order.prescription.is_digital
    )
  );

  const prescriptionDataForHtml = order?.prescription ? {
    ...order.prescription,
    pid: order.prescription.pid || order.prescription.formatted_id || (order.prescription.unid ? `MED-${order.prescription.unid}` : (order.prescription.id?.slice(0, 8) || "N/A")),
    created_at: order.prescription.created_at,
    signed_at: order.prescription.signed_at || order.prescription.created_at,
    medicines: [], // DPDP compliance: no medications in laboratory requisition
    lab_tests: Array.isArray(order.prescription.lab_tests)
      ? order.prescription.lab_tests.map((test) => typeof test === "string" ? test : test.test_name || test.name || "")
      : [],
    investigations: order.prescription.investigations || [],
    special_message: "",
    doctor_details: order.prescription.doctor ? {
      full_name: order.prescription.doctor.full_name,
      specialization: order.prescription.doctor.specialization,
      qualification: order.prescription.doctor.qualification,
      clinic_name: order.prescription.doctor.clinic_name,
      clinic_address: order.prescription.doctor.clinic_address,
      signature_url: order.prescription.doctor.signature_url,
      license_number: order.prescription.doctor.license_number || order.prescription.doctor.meta?.license_number || null,
      council_name: order.prescription.doctor.council_name || null,
      un_id: order.prescription.doctor.un_id || null,
    } : null,
    patient_details: order.patient ? {
      full_name: order.patient.details?.full_name || "N/A",
      gender: order.patient.details?.gender || "N/A",
      date_of_birth: order.patient.details?.date_of_birth || null,
      address: order.patient.details?.address || "N/A",
      un_id: order.patient.un_id || null,
    } : null,
    appointments: order.prescription.appointment ? {
      appointment_date: order.prescription.appointment.appointment_date,
      appointment_time: order.prescription.appointment.appointment_time
    } : null
  } : null;

  useEffect(() => {
    if (activeTab === "prescription" && hasDigitalPrescription && prescriptionDataForHtml && canvasRef.current && rxViewMode === "canvas") {
      drawLabRequisitionCanvas(canvasRef.current, prescriptionDataForHtml);
    }
  }, [activeTab, hasDigitalPrescription, prescriptionDataForHtml, rxViewMode]);

  const downloadCanvasImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `Lab_Requisition_Rx${prescriptionDataForHtml?.pid || order?.unid || "doc"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printCanvasImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diagnostic Requisition #${prescriptionDataForHtml?.pid || order?.unid}</title>
          <style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; background: #fff; }
            img { max-width: 100%; height: auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <img src="${url}" />
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); setTimeout(() => window.close(), 1000); }, 300);
            }
          </script>
        </body>
      </html>
    `);
  };

  if (loading)
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Loading Order #{orderId}...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Retrieving patient tests and diagnostic status
          </p>
        </div>
      </div>
    );

  if (!order)
    return (
      <div className="py-12">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Order Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">The requested order could not be loaded.</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  const tabs = [
    { id: "details", label: "Patient & Doctor Details", icon: <User className="w-4 h-4" /> },
    { id: "tests", label: "Prescribed Tests", icon: <FlaskConical className="w-4 h-4" /> },
    { id: "prescription", label: "Original Prescription", icon: <FileText className="w-4 h-4" /> },
    { id: "billing", label: "Billing & Payment", icon: <DollarSign className="w-4 h-4" /> },
    { 
      id: "reports", 
      label: `Diagnostic Reports${order?.reports?.length ? ` (${order.reports.length})` : ""}`, 
      icon: <FileDown className="w-4 h-4" /> 
    }
  ];

  const paymentStatusColors = {
    pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    paid: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold shadow-xs border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Orders</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#007db8] to-[#005585] rounded-lg p-5 sm:p-6 text-white shadow-xs border border-[#005585]">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/15 backdrop-blur-md rounded border border-white/20 text-white text-xs font-semibold mb-2">
              <span>Order #{order.unid}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Diagnostic Order Details
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 mt-1.5">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} />
                <span>{formatDate(order.created_at)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Home size={13} />
                <span className="capitalize">{(order.collection_type || order.visit_type || "Lab Visit").replace(/_/g, " ")}</span>
              </div>
              <span>•</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-medium">
                {items.length} {items.length === 1 ? 'Investigation' : 'Investigations'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openUploadModal(null)}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-white text-[#0067A1] hover:bg-sky-50"
            >
              <Upload size={14} />
              <span>Upload Report</span>
            </button>
            {order.reports && order.reports.length > 0 && (
              <button
                onClick={() => setActiveTab("reports")}
                className="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Eye size={14} />
                <span>Reports ({order.reports.length})</span>
              </button>
            )}
            <span className={`px-2.5 py-1.5 rounded-md text-xs font-bold border ${orderStatusColor}`}>
              {orderStatus.replace(/_/g, " ").toUpperCase()}
            </span>
            <div className="px-3 py-1 rounded-md bg-white/15 backdrop-blur-md text-white border border-white/20 text-right">
              <div className="font-bold text-sm sm:text-base leading-tight">
                Total: ₹{totalAmount.toLocaleString()}
              </div>
              {collectionFee > 0 && (
                <div className="text-[10px] text-sky-100 font-normal mt-0.5">
                  ₹{itemsSubtotal.toLocaleString()} tests + ₹{collectionFee.toLocaleString()} pickup
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-xs p-1 flex overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#0067A1] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

        {/* Tab Contents */}
        <div className="mt-4">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Patient & Consent */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 dark:bg-[#003358]/40 rounded-md">
                        <User className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Patient Details</h2>
                      <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 rounded-md text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        DPDP Protected
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <DetailCard
                        icon={<User className="w-5 h-5" />}
                        label="Full Name"
                        value={order.patient?.details?.full_name}
                        color="blue"
                      />
                      <DetailCard
                        icon={<Phone className="w-5 h-5" />}
                        label="Phone Number"
                        value={order.patient?.phone_number}
                        color="green"
                      />
                      <DetailCard
                        icon={<Mail className="w-5 h-5" />}
                        label="Email"
                        value={order.patient?.details?.email}
                        color="purple"
                      />
                      <DetailCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Gender"
                        value={
                          order.patient?.details?.gender
                            ? order.patient.details.gender.charAt(0).toUpperCase() +
                              order.patient.details.gender.slice(1).toLowerCase()
                            : null
                        }
                        color="pink"
                      />
                      <DetailCard
                        icon={<MapPin className="w-5 h-5" />}
                        label="Address"
                        value={order.patient?.details?.address}
                        color="orange"
                      />
                      <DetailCard
                        icon={<HeartPulse className="w-5 h-5" />}
                        label="Blood Group"
                        value={order.patient?.details?.blood_group}
                        color="red"
                      />
                      <DetailCard
                        icon={<Calendar className="w-5 h-5" />}
                        label="Date of Birth"
                        value={formatDateOfBirth(order.patient?.details?.date_of_birth)}
                        color="indigo"
                      />
                      <DetailCard
                        icon={<Phone className="w-5 h-5" />}
                        label="Emergency Contact"
                        value={order.patient?.details?.emergency_contact}
                        color="amber"
                      />
                    </div>

                    {/* Patient Notes */}
                    {order.patient_notes && (
                      <div className="mt-6 p-4 bg-teal-50 dark:bg-[#003358]/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6] flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-[#0067A1] dark:text-teal-300 mb-1">Patient Notes</h4>
                            <p className="text-[#004F7C] dark:text-[#0080C6]">{order.patient_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


              </div>

              {/* Right Column - Doctor & Notes */}
              <div className="space-y-6">
                {/* Doctor Card */}
                {order.prescription?.doctor && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-md">
                          <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Doctor Details</h2>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <DetailCard
                          icon={<User className="w-5 h-5" />}
                          label="Doctor Name"
                          value={order.prescription.doctor.full_name}
                          color="green"
                        />
                        <DetailCard
                          icon={<BriefcaseMedical className="w-5 h-5" />}
                          label="Specialization"
                          value={order.prescription.doctor.specialization}
                          color="blue"
                        />
                        <DetailCard
                          icon={<FileText className="w-5 h-5" />}
                          label="Qualification"
                          value={formatQualification(order.prescription.doctor.qualification)}
                          color="purple"
                        />
                        <DetailCard
                          icon={<ShieldCheck className="w-5 h-5" />}
                          label="Medical Registration / License No."
                          value={
                            order.prescription.doctor.license_number
                              ? `${order.prescription.doctor.license_number}${order.prescription.doctor.council_name ? ` (${order.prescription.doctor.council_name})` : ''}`
                              : null
                          }
                          color="indigo"
                        />
                        <DetailCard
                          icon={<MapPin className="w-5 h-5" />}
                          label="Clinic/Hospital"
                          value={order.prescription.doctor.clinic_name}
                          color="orange"
                        />
                        <DetailCard
                          icon={<MapPin className="w-5 h-5" />}
                          label="Clinic Address"
                          value={order.prescription.doctor.clinic_address}
                          color="teal"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Lab Notes Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-gray-800/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Lab Notes</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <textarea
                      value={labNotes}
                      onChange={(e) => setLabNotes(e.target.value)}
                      className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#0067A1] dark:focus:ring-teal-600 focus:border-transparent transition-all duration-200 h-40 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="Write internal lab notes, observations, or special instructions here..."
                    />
                    <button
                      onClick={updateLabNotes}
                      disabled={saving}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#005585] text-white font-semibold text-xs rounded-md shadow-xs transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tests" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Lab Tests */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-50 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0067A1]/10 text-[#0067A1] dark:text-sky-400 rounded-md">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ordered Investigations</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Upload separate diagnostic reports for each test or view uploaded findings
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/40 text-[#0067A1] dark:text-sky-300 rounded-md text-xs font-semibold">
                      {items.length} {items.length === 1 ? "Test" : "Tests"}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="space-y-4">
                      {items.map((item) => {
                        const edit = itemEdits[item.id] || {};
                        const itemReports = (order?.reports || []).filter(
                          (r) =>
                            (r.item_id && r.item_id === item.id) ||
                            (r.test_name && r.test_name.toLowerCase() === item.test_name.toLowerCase()) ||
                            (r.test_type && r.test_type.toLowerCase() === item.test_name.toLowerCase())
                        );
                        const hasReport = itemReports.length > 0;

                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-750 transition-all duration-200 bg-white dark:bg-slate-800/80 shadow-xs overflow-hidden"
                          >
                            {/* ── Main row ── */}
                            <div className="p-4 sm:p-5">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-[#0067A1] dark:text-sky-400 rounded-md shrink-0">
                                      <FlaskConical className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        {item.test_name}
                                      </h3>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                          Test ID: #{item.unid}
                                        </span>
                                        {hasReport ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 size={11} />
                                            Report Ready
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                            <Clock size={11} />
                                            Report Pending
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2.5 sm:ml-10">
                                    {/* Status badge */}
                                    <div
                                      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                        itemStatusColors[item.status?.toLowerCase() || "pending"] ||
                                        "bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      {(item.status || "pending").replace(/_/g, " ").toUpperCase()}
                                    </div>

                                    {/* Inline price editor */}
                                    {edit.editingPrice ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-slate-500">₹</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={edit.priceValue}
                                          onChange={(e) =>
                                            setItemEdits((prev) => ({
                                              ...prev,
                                              [item.id]: { ...prev[item.id], priceValue: e.target.value },
                                            }))
                                          }
                                          className="w-24 border border-sky-300 dark:border-sky-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => saveItemPrice(item.id)}
                                          disabled={edit.savingPrice}
                                          className="p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-md transition-colors"
                                          title="Save price"
                                        >
                                          {edit.savingPrice ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => cancelItemEdit(item.id, "price")}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-md transition-colors"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditPrice(item)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:border-sky-300 bg-white dark:bg-slate-800 transition-colors group cursor-pointer"
                                        title="Click to edit price"
                                      >
                                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                          ₹{item.price?.toLocaleString()}
                                        </span>
                                        <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Status dropdown */}
                                <select
                                  value={item.status}
                                  onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-[#0067A1] transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm min-w-[170px] shrink-0"
                                >
                                  {itemStatusOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt.replace(/_/g, " ").toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* ── Dedicated Report Section for this Specific Test ── */}
                            <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/60">
                              {hasReport ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-md shrink-0 mt-0.5">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                                          {itemReports[0].test_type || item.test_name} Report Ready
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold rounded uppercase">
                                          Delivered
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Uploaded on {formatDate(itemReports[0].created_at)}
                                      </p>
                                      {itemReports[0].result_summary && (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700">
                                          Observation: {itemReports[0].result_summary}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={itemReports[0].report_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                                    >
                                      <Eye size={12} />
                                      <span>View Report</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => openUploadModal(item)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-medium transition-colors cursor-pointer"
                                      title="Upload an updated report for this test"
                                    >
                                      <Upload size={12} />
                                      <span>Replace / Add</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                    <div>
                                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Report Pending for this test
                                      </span>
                                      <p className="text-[11px] text-slate-400">
                                        Upload scan or laboratory document specific to {item.test_name}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openUploadModal(item)}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                                  >
                                    <Upload size={13} />
                                    <span>Upload Report for this Test</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* ── Pre-requisites / Patient Instructions row ── */}
                            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/60">
                              {edit.editingNotes ? (
                                <div className="mt-3">
                                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                    Pre-requisites / Patient Instructions
                                  </label>
                                  <textarea
                                    value={edit.notesValue}
                                    onChange={(e) =>
                                      setItemEdits((prev) => ({ ...prev, [item.id]: { ...prev[item.id], notesValue: e.target.value } }))
                                    }
                                    placeholder="e.g. 12 hrs fasting required, avoid certain medications, bring previous reports..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-sky-200 dark:border-sky-700 rounded-md text-sm bg-white dark:bg-slate-750 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => saveItemNotes(item.id)}
                                      disabled={edit.savingNotes}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-60"
                                    >
                                      {edit.savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Save
                                    </button>
                                    <button
                                      onClick={() => cancelItemEdit(item.id, "notes")}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-md transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : item.notes ? (
                                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-md">
                                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-0.5">Pre-requisites / Instructions</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">{item.notes}</p>
                                  </div>
                                  <button
                                    onClick={() => startEditNotes(item)}
                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors shrink-0"
                                    title="Edit instructions"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditNotes(item)}
                                  className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-[#0067A1] dark:hover:text-sky-400 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add pre-requisites / patient instructions
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pricing Reconciliation & Cost Breakdown */}
                    <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                        <span>Tests Subtotal ({items.length} {items.length === 1 ? 'test' : 'tests'})</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">₹{itemsSubtotal.toLocaleString()}</span>
                      </div>
                      {collectionFee > 0 && (
                        <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-[#0067A1]" />
                            Home Sample Collection / Pickup Fee
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">₹{collectionFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-base">Grand Total</span>
                          {collectionFee > 0 && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Includes ₹{itemsSubtotal} tests + ₹{collectionFee} home pickup</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-[#0067A1] dark:text-sky-400">₹{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Action Panel */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Status</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">Current Status:</span>
                        <div className={`px-2.5 py-1 rounded-md border ${orderStatusColor} font-bold text-xs`}>
                          {orderStatus.replace(/_/g, " ").toUpperCase()}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          Update Order Lifecycle
                        </label>
                        <select
                          value={orderStatus}
                          onChange={(e) => updateOrderStatus(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-[#0067A1] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                        >
                          {statusOptions.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, " ").toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phlebotomist/Technician Assignment Card */}
                {order && order.visit_type === 'home_collection' && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <BriefcaseMedical className="w-5 h-5 text-[#0067A1]" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Phlebotomist Assignment</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {order.technician_name ? (
                        <div className="bg-teal-50/50 dark:bg-[#003358]/10 p-4 rounded-md border border-teal-100 dark:border-teal-900/30 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Name:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{order.technician_name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Phone:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{order.technician_phone}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Vehicle:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{order.technician_vehicle || '—'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                              Select Phlebotomist
                            </label>
                            <select
                              value={selectedTech}
                              onChange={(e) => setSelectedTech(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                            >
                              {technicians.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.phone})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                              Vehicle Details (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Hero Splendor DL-3S-AB-1234"
                              value={techVehicle}
                              onChange={(e) => setTechVehicle(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                            />
                          </div>
                          <button
                            onClick={handleAssignTechnician}
                            disabled={assigningTech}
                            className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white font-bold rounded-md transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            {assigningTech ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Assign Technician
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reports Progress Summary Card */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0067A1]" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reports Status</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Delivered Reports:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {items.filter(i => (order?.reports || []).some(r => r.item_id === i.id || (r.test_name && r.test_name.toLowerCase() === i.test_name.toLowerCase()))).length} / {items.length} Tests
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            (items.filter(i => (order?.reports || []).some(r => r.item_id === i.id || (r.test_name && r.test_name.toLowerCase() === i.test_name.toLowerCase()))).length /
                              Math.max(1, items.length)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        onClick={() => openUploadModal(null)}
                        className="w-full py-2 bg-[#0067A1] hover:bg-[#005585] text-white font-semibold rounded-md text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Upload Combined Order Report</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("reports")}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>View All Uploaded Reports ({order.reports?.length || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cancel Booking Card */}
                {order && orderStatus !== 'completed' && orderStatus !== 'cancelled' && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Booking</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          Cancellation Reason
                        </label>
                        <input
                          type="text"
                          placeholder="Reason..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleCancelOrder}
                        disabled={cancellingOrder}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        {cancellingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Cancel & Process Refund
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "prescription" && (
            <div className="space-y-6">
              {hasUploadedPrescription && prescriptionFileUrl ? (
                /* CASE A: Uploaded Prescription Document (Scan / Image / PDF) */
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-6 space-y-6">
                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Uploaded Prescription Document</h2>
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[#0067A1] dark:text-blue-400 rounded-md text-xs font-semibold">
                          Rx #{order.prescription?.pid || order.prescription?.formatted_id || order.prescription?.unid || order.prescription?.id?.slice(0, 8)?.toUpperCase() || "UPLOAD"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded Document: {formatDate(order.prescription?.created_at || order.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 border border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => setPrescriptionZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                          className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {Math.round(prescriptionZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setPrescriptionZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                          className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrescriptionZoom(1)}
                          className="px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                          Reset
                        </button>
                      </div>

                      <button
                        onClick={() => window.open(prescriptionFileUrl, "_blank")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Full Size</span>
                      </button>

                      <a
                        href={prescriptionFileUrl}
                        download={`Prescription_${order.prescription?.unid || order.id}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* DPDP Act 2023 Compliance Notice */}
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#0067A1] dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-sky-900 dark:text-sky-200 text-sm mb-0.5">
                        Clinical Diagnostic Access & DPDP Act 2023 Compliance
                      </p>
                      <p className="text-sky-700 dark:text-sky-300/90 leading-relaxed">
                        Under Indian Medical Council regulations and the Digital Personal Data Protection (DPDP) Act 2023, patient prescription uploads are accessed by certified diagnostic laboratories solely for conducting investigations and clinical verification.
                      </p>
                    </div>
                  </div>

                  {/* Image or PDF Display */}
                  {isPrescriptionPdf ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xs bg-white">
                      <iframe
                        src={prescriptionFileUrl}
                        title="Prescription PDF"
                        className="w-full h-[750px] border-none"
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-slate-900/5 dark:bg-slate-950/40 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[460px]">
                      <div className="overflow-auto max-w-full max-h-[720px] flex items-center justify-center rounded-lg">
                        <img
                          src={prescriptionFileUrl}
                          alt="Uploaded Prescription"
                          style={{
                            transform: `scale(${prescriptionZoom})`,
                            transformOrigin: "top center",
                            transition: "transform 0.15s ease",
                          }}
                          className="max-w-full h-auto max-h-[680px] object-contain rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 cursor-zoom-in"
                          onClick={() => setShowFullPrescriptionModal(true)}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Click document or use &quot;Open Full Size&quot; for high-resolution view</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : hasDigitalPrescription && prescriptionDataForHtml ? (
                /* CASE B: Digital Doctor Consultation Prescription (Canvas & Requisition View) */
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-6 space-y-6">
                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Doctor&apos;s Diagnostic Requisition</h2>
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[#0067A1] dark:text-blue-400 rounded-md text-xs font-semibold">
                          Rx #{prescriptionDataForHtml.pid}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Consultation Requisition Issued: {formatDate(prescriptionDataForHtml.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Mode Toggle: Canvas vs Document */}
                      <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-700/60">
                        <button
                          type="button"
                          onClick={() => setRxViewMode("canvas")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            rxViewMode === "canvas"
                              ? "bg-white dark:bg-gray-800 text-[#0067A1] dark:text-cyan-400 shadow-xs"
                              : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                          }`}
                        >
                          Canvas View
                        </button>
                        <button
                          type="button"
                          onClick={() => setRxViewMode("html")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            rxViewMode === "html"
                              ? "bg-white dark:bg-gray-800 text-[#0067A1] dark:text-cyan-400 shadow-xs"
                              : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                          }`}
                        >
                          Document View
                        </button>
                      </div>

                      <button
                        onClick={printCanvasImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md transition-all shadow-xs cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>Print Requisition</span>
                      </button>
                    </div>
                  </div>

                  {/* DPDP Act 2023 Purpose Limitation Notice */}
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-lg flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#0067A1] dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-sky-900 dark:text-sky-200 text-sm mb-0.5">
                        Clinical Diagnostic Test Slip & DPDP Act 2023 Compliance
                      </p>
                      <p className="text-sky-700 dark:text-sky-300/90 leading-relaxed">
                        Under Indian Medical Council regulations and DPDP Act 2023 purpose limitation, only the prescribing doctor&apos;s details, patient clinical demographics (for biological reference intervals), and prescribed diagnostic investigations are presented. Patient medical prescriptions, drug dosages, and clinical disease diagnoses are strictly withheld.
                      </p>
                    </div>
                  </div>

                  {/* Canvas View or HTML Requisition Document */}
                  {rxViewMode === "canvas" ? (
                    <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full h-auto rounded-md shadow-xs border border-gray-200 dark:border-gray-700 bg-white"
                      />
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Rendered via HTML5 Canvas • High-Resolution Diagnostic Requisition Slip
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xs bg-white">
                      <iframe
                        srcDoc={buildPrescriptionHtml(prescriptionDataForHtml, { isLabView: true })}
                        title="Diagnostic Requisition Document"
                        className="w-full h-[800px] border-none"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* CASE C: Direct / Walk-In Lab Booking (No doctor prescription attached) */
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200/80 dark:border-gray-700 shadow-xs p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-[#0067A1] dark:text-cyan-400 rounded-md flex items-center justify-center mx-auto shadow-xs">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1.5">
                      Direct Diagnostic Booking
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed mb-4">
                      This order was booked directly by the patient without an attached doctor prescription. Routine wellness tests do not require an external referral.
                    </p>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600/70 text-left mb-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Booked Diagnostic Investigations:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {items.length > 0 ? (
                          items.map((item) => (
                            <li key={item.id} className="truncate">{item.test_name}</li>
                          ))
                        ) : (
                          <li>Standard Diagnostic Panel</li>
                        )}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("tests")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] hover:bg-[#005585] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>View Prescribed Tests Tab</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "billing" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Billing Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 rounded-md">
                        <DollarSign className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Billing Summary</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Itemized List */}
                      <div className="space-y-2 mb-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Itemized Charges:</div>
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{item.test_name}</span>
                            <span className="font-semibold text-gray-800 dark:text-white">₹{item.price?.toLocaleString()}</span>
                          </div>
                        ))}
                        {collectionFee > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 text-sm flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-[#0067A1]" />
                              Home Sample Collection / Pickup Fee
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white">₹{collectionFee?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-blue-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                        <div>
                          <span className="text-lg font-bold text-gray-700 dark:text-gray-300 block">Total Amount</span>
                          {collectionFee > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Includes ₹{itemsSubtotal} tests + ₹{collectionFee} pickup</span>
                          )}
                        </div>
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={downloadInvoice}
                          className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#004F7C] hover:to-[#0a5c56] text-white font-bold rounded-md shadow-xs transition-all duration-200 cursor-pointer"
                        >
                          <Printer className="w-5 h-5" />
                          Print Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Metadata */}
              <div className="space-y-6">
                {/* Payment Status Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-green-900/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Payment Status</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Payment Status:</span>
                      <div className={`px-3 py-1.5 rounded-md border ${paymentStatusColors[(order.payment_status || "pending").toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200"} font-bold text-xs`}>
                        {(order.payment_status || "PENDING").toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Update Payment Status
                      </label>
                      <select
                        value={order.payment_status || "pending"}
                        onChange={(e) => updatePaymentStatus(e.target.value)}
                        disabled={updatingPayment}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#0067A1] dark:focus:ring-teal-600 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 text-sm"
                      >
                        <option value="pending">PENDING</option>
                        <option value="paid">PAID</option>
                        <option value="failed">FAILED</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Order Metadata Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-gray-800/20 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Order Information</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <DetailCard
                        icon={<ClipboardList className="w-4 h-4" />}
                        label="Order ID"
                        value={order.id}
                        color="gray"
                        small
                      />
                      <DetailCard
                        icon={<FileText className="w-4 h-4" />}
                        label="Prescription ID"
                        value={order.prescription?.pid || order.prescription?.formatted_id || order.prescription?.unid || order.prescription?.id?.slice(0, 8)?.toUpperCase() || order.prescription_id?.slice(0, 8)?.toUpperCase() || "N/A"}
                        color="gray"
                        small
                      />
                      <DetailCard
                        icon={<Home className="w-4 h-4" />}
                        label="Collection Type"
                        value={order.collection_type?.replace(/_/g, " ").toUpperCase()}
                        color="gray"
                        small
                      />
                      {order.scheduled_at && (
                        <DetailCard
                          icon={<Calendar className="w-4 h-4" />}
                          label="Scheduled At"
                          value={formatDate(order.scheduled_at)}
                          color="gray"
                          small
                        />
                      )}
                      <DetailCard
                        icon={<Calendar className="w-4 h-4" />}
                        label="Last Updated"
                        value={formatDate(order.updated_at)}
                        color="gray"
                        small
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Top Summary Status Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Prescribed Tests
                    </p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                      {items.length} {items.length === 1 ? "Investigation" : "Investigations"}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-sky-50 dark:bg-sky-900/40 text-[#0067A1] dark:text-sky-300 flex items-center justify-center font-bold">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Delivered Reports
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {items.filter((it) => it.has_report || (it.reports && it.reports.length > 0) || it.status === "completed").length} of {items.length} Ready
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      DigiLocker Sync
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      Direct Patient Access
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-teal-50 dark:bg-teal-900/40 text-[#0067A1] dark:text-teal-300 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Per-Investigation Reports Section */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#0067A1]" />
                      Investigation-Wise Report Upload & Status
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Each prescribed test can have its own independent report. Upload findings or scans as each test completes.
                    </p>
                  </div>
                  <button
                    onClick={() => openUploadModal(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Any Report</span>
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {items.map((item, idx) => {
                    const itemReports = item.reports || (order.reports || []).filter(
                      (r) => r.item_id === item.id || (r.test_type && r.test_type.toLowerCase() === (item.test_name || "").toLowerCase())
                    );
                    const hasReport = itemReports.length > 0;

                    return (
                      <div
                        key={item.id || idx}
                        className={`rounded-lg border transition-all ${
                          hasReport
                            ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/15 dark:bg-emerald-950/10"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {/* Investigation Header */}
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                                hasReport
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-sky-50 text-[#0067A1] dark:bg-sky-900/40 dark:text-sky-300"
                              }`}
                            >
                              <FlaskConical className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                  {item.test_name}
                                </h3>
                                {item.unid && (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                    #{item.unid}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span>₹{(item.price || 0).toLocaleString()}</span>
                                {item.sample_type && <span>• Specimen: {item.sample_type}</span>}
                                {item.status && (
                                  <span className="capitalize">• Item Status: {item.status}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {hasReport ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Report Ready ({itemReports.length})
                                </span>
                                <button
                                  onClick={() => openUploadModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                                  title="Upload revised or additional document for this test"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Add / Replace</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-xs font-semibold">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending Report
                                </span>
                                <button
                                  onClick={() => openUploadModal(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Report for this Test</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Uploaded Reports List for This Item */}
                        {hasReport ? (
                          <div className="p-4 space-y-3">
                            {itemReports.map((rep, repIdx) => {
                              const isPdf = rep.report_url?.toLowerCase().includes(".pdf");
                              return (
                                <div
                                  key={rep.id || repIdx}
                                  className="p-3 bg-white dark:bg-slate-800/80 rounded-md border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 text-[#0067A1] dark:text-sky-400">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-xs text-slate-800 dark:text-white">
                                          {rep.test_type || item.test_name}
                                        </p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-[#0067A1] dark:text-sky-300 font-semibold uppercase">
                                          {isPdf ? "PDF" : "Image"}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium inline-flex items-center gap-1">
                                          <ShieldCheck className="w-2.5 h-2.5" /> DigiLocker
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Delivered: {formatDate(rep.created_at)}
                                      </p>
                                      {rep.result_summary && (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-100 dark:border-slate-700">
                                          <strong>Findings:</strong> {rep.result_summary}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <a
                                      href={rep.report_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>View Report</span>
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50/50 dark:bg-slate-850/40 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Awaiting diagnostic findings for <strong>{item.test_name}</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General / Direct Quick Upload Form */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/40 rounded-md text-[#0067A1] dark:text-sky-300">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                        Direct Report Upload Form
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select a specific investigation or upload a consolidated panel report
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUploadReport} className="p-5 space-y-4">
                  {/* Select Investigation Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Target Test / Investigation *
                    </label>
                    <select
                      value={activeUploadTest?.id || ""}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) {
                          setActiveUploadTest(null);
                          setReportTestType("");
                        } else {
                          const found = items.find((it) => it.id === targetId);
                          setActiveUploadTest(found || null);
                          setReportTestType(found?.test_name || "");
                        }
                      }}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                    >
                      <option value="">-- Consolidated / Combined Order Diagnostic Report --</option>
                      {items.map((it, idx) => (
                        <option key={it.id || idx} value={it.id}>
                          {it.test_name} (Test #{it.unid || idx + 1}) — {it.has_report ? "✓ Report Attached" : "⏳ Pending Report"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* File Upload Zone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Report Document (PDF, PNG, JPG) *
                    </label>
                    <div
                      onClick={() => document.getElementById("lab-report-file-input")?.click()}
                      className={`border-2 border-dashed rounded-lg p-5 sm:p-6 text-center cursor-pointer transition-all ${
                        reportFile
                          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-slate-300 dark:border-slate-600 hover:border-[#0067A1] hover:bg-slate-50 dark:hover:bg-slate-750"
                      }`}
                    >
                      <input
                        id="lab-report-file-input"
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReportFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {reportFile ? (
                        <div className="flex items-center justify-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-slate-800 dark:text-white truncate max-w-xs sm:max-w-md">
                              {reportFile.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(reportFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportFile(null);
                            }}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded text-rose-500 transition-colors ml-2 cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="w-10 h-10 mx-auto rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-[#0067A1] dark:text-sky-300">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Click to select or drag & drop diagnostic report
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Supports PDF, PNG, JPG files up to 15MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Report Title / Test Name
                      </label>
                      <input
                        type="text"
                        value={reportTestType}
                        onChange={(e) => setReportTestType(e.target.value)}
                        placeholder="e.g., Complete Blood Count / Chest X-Ray"
                        className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Or External Public Document URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={reportPdfUrl}
                        onChange={(e) => setReportPdfUrl(e.target.value)}
                        placeholder="https://... (if stored on cloud)"
                        className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                      />
                    </div>
                  </div>

                  {/* Notes / Clinical summary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Lab Observations / Summary Notes
                    </label>
                    <textarea
                      rows={2}
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="Add pathologist remarks, normal reference indicators, or clinical impressions..."
                      className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                    />
                  </div>

                  {/* DigiLocker Auto Sync Checkbox */}
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-md p-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="save-to-digilocker-checkbox"
                      checked={saveToLocker}
                      onChange={(e) => setSaveToLocker(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0067A1] focus:ring-[#0067A1] border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="save-to-digilocker-checkbox" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <strong className="text-emerald-800 dark:text-emerald-300 block mb-0.5">
                        Sync & Deliver to Patient MediConnect DigiLocker
                      </strong>
                      The patient can immediately view, securely store, and share this report with their doctor through their digital locker.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={uploadingReport || (!reportFile && !reportPdfUrl)}
                      className="px-5 py-2.5 rounded-md bg-[#0067A1] hover:bg-[#005585] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading & Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>
                            {activeUploadTest
                              ? `Deliver Report for ${activeUploadTest.test_name}`
                              : "Deliver Report to Patient"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Dialog: Upload Report for Specific Test */}
        {uploadModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setUploadModalOpen(false)}
          >
            <div
              className="relative max-w-lg w-full bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-100 dark:bg-sky-900/40 rounded text-[#0067A1] dark:text-sky-300">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Upload Diagnostic Report
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeUploadTest ? activeUploadTest.test_name : "General Diagnostic Report"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleUploadReport} className="p-5 space-y-4">
                {activeUploadTest && (
                  <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-md border border-sky-100 dark:border-sky-800/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-sky-900 dark:text-sky-200 block">
                        {activeUploadTest.test_name}
                      </span>
                      <span className="text-sky-700 dark:text-sky-300">
                        Test #{activeUploadTest.unid || activeUploadTest.id?.slice(0, 6)} • ₹{(activeUploadTest.price || 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-[#0067A1] font-semibold text-[10px]">
                      Targeted Upload
                    </span>
                  </div>
                )}

                {/* File Upload Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Report Document (PDF, PNG, JPG) *
                  </label>
                  <div
                    onClick={() => document.getElementById("modal-lab-report-file-input")?.click()}
                    className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                      reportFile
                        ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                        : "border-slate-300 dark:border-slate-600 hover:border-[#0067A1] hover:bg-slate-50 dark:hover:bg-slate-750"
                    }`}
                  >
                    <input
                      id="modal-lab-report-file-input"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReportFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {reportFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-9 h-9 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-xs text-slate-800 dark:text-white truncate max-w-xs">
                            {reportFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {(reportFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportFile(null);
                          }}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded text-rose-500 ml-auto cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-5 h-5 text-[#0067A1] dark:text-sky-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Click to browse report document
                        </p>
                        <p className="text-[10px] text-slate-400">
                          PDF, PNG, JPG up to 15MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* External URL Fallback */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Or Direct URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={reportPdfUrl}
                    onChange={(e) => setReportPdfUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                  />
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Pathologist Observations / Findings
                  </label>
                  <textarea
                    rows={2}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Observations, normal ranges, or clinical impressions..."
                    className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                  />
                </div>

                {/* DigiLocker sync toggle */}
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-md">
                  <input
                    type="checkbox"
                    id="modal-digilocker-sync"
                    checked={saveToLocker}
                    onChange={(e) => setSaveToLocker(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0067A1] focus:ring-[#0067A1] border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="modal-digilocker-sync" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-sync and deliver to Patient MediConnect DigiLocker</span>
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingReport || (!reportFile && !reportPdfUrl)}
                    className="px-4 py-1.5 rounded-md bg-[#0067A1] hover:bg-[#005585] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Deliver Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Prescription Full-Screen Lightbox Modal */}
        {showFullPrescriptionModal && prescriptionFileUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setShowFullPrescriptionModal(false)}
          >
            <div
              className="relative max-w-5xl max-h-[95vh] w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
                <span className="font-semibold text-sm">Original Prescription Preview</span>
                <div className="flex items-center gap-2">
                  <a
                    href={prescriptionFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                    title="Open original"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setShowFullPrescriptionModal(false)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto flex items-center justify-center bg-black/40 min-h-[400px]">
                <img
                  src={prescriptionFileUrl}
                  alt="Full Prescription View"
                  className="max-h-[82vh] w-auto object-contain rounded-md"
                />
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

function DetailCard({ icon, label, value, color = "blue", small = false }) {
  const colorClasses = {
    blue: "text-[#0067A1] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30",
    yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30",
    pink: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    gray: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
  };

  return (
    <div className={`flex items-start gap-3 p-${small ? '2' : '3'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800/50`}>
      <div className={`p-${small ? '1.5' : '2'} rounded-md ${colorClasses[color]} flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${small ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 mb-1`}>{label}</p>
        <p className={`${small ? 'text-sm' : 'font-bold'} text-gray-800 dark:text-gray-200 break-words`}>
          {value || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
        </p>
      </div>
    </div>
  );
}

function drawLabRequisitionCanvas(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 800;
  const labTests = Array.isArray(data.lab_tests) ? data.lab_tests : [];
  const baseHeight = 650;
  const testHeight = Math.max(1, labTests.length) * 55;
  const height = baseHeight + testHeight;

  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 2) : 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Header Gradient
  const grad = ctx.createLinearGradient(12, 12, width - 12, 85);
  grad.addColorStop(0, "#0067A1");
  grad.addColorStop(1, "#004F7C");
  ctx.fillStyle = grad;
  ctx.fillRect(12, 12, width - 24, 75);

  // Header Titles
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("MediConnect.fit", 32, 45);

  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#E0F2FE";
  ctx.fillText("DIAGNOSTIC TEST REQUISITION & REFERRAL", 32, 68);

  ctx.textAlign = "right";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`Rx #${data.pid || "N/A"}`, width - 32, 45);

  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#E0F2FE";
  const dateFormatted = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";
  ctx.fillText(`Date: ${dateFormatted}`, width - 32, 68);
  ctx.textAlign = "left";

  // Requisition Banner
  ctx.fillStyle = "#F0F9FF";
  ctx.fillRect(28, 100, width - 56, 32);
  ctx.strokeStyle = "#BAE6FD";
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 100, width - 56, 32);

  ctx.fillStyle = "#0369A1";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("OFFICIAL PATHOLOGY & DIAGNOSTIC REQUISITION • DPDP ACT 2023 COMPLIANT", 40, 121);

  // Two columns: Doctor & Patient
  const colY = 145;
  const colW = (width - 76) / 2;

  // Doctor Box
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(28, colY, colW, 160);
  ctx.strokeStyle = "#E2E8F0";
  ctx.strokeRect(28, colY, colW, 160);

  ctx.fillStyle = "#0067A1";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("PRESCRIBING PRACTITIONER", 40, colY + 24);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  const docName = data.doctor_details?.full_name ? `Dr. ${data.doctor_details.full_name}` : "Prescribing Doctor";
  ctx.fillText(docName, 40, colY + 50);

  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`Specialization: ${data.doctor_details?.specialization || "General Medicine"}`, 40, colY + 72);
  ctx.fillText(`Qualification: ${data.doctor_details?.qualification || "MBBS / MD"}`, 40, colY + 92);
  ctx.fillText(`Clinic: ${data.doctor_details?.clinic_name || "Healthcare Clinic"}`, 40, colY + 112);
  ctx.fillText(`Address: ${data.doctor_details?.clinic_address || "Consultation Center"}`, 40, colY + 132);
  if (data.doctor_details?.license_number) {
    ctx.fillText(`Reg No: ${data.doctor_details.license_number}`, 40, colY + 150);
  }

  // Patient Box
  const patX = 28 + colW + 20;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(patX, colY, colW, 160);
  ctx.strokeStyle = "#E2E8F0";
  ctx.strokeRect(patX, colY, colW, 160);

  ctx.fillStyle = "#0067A1";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("PATIENT DEMOGRAPHICS", patX + 12, colY + 24);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.patient_details?.full_name || "Patient", patX + 12, colY + 50);

  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`Gender: ${data.patient_details?.gender || "N/A"}`, patX + 12, colY + 72);
  const dobText = data.patient_details?.date_of_birth
    ? formatDateOfBirth(data.patient_details.date_of_birth)
    : "N/A";
  ctx.fillText(`Date of Birth / Age: ${dobText}`, patX + 12, colY + 92);
  ctx.fillText(`Address: ${data.patient_details?.address || "N/A"}`, patX + 12, colY + 112);

  ctx.fillStyle = "#059669";
  ctx.font = "italic 10px system-ui, -apple-system, sans-serif";
  ctx.fillText("Non-clinical contact details masked for privacy", patX + 12, colY + 140);

  // Table of Prescribed Tests
  const tableY = 325;
  ctx.fillStyle = "#0067A1";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("PRESCRIBED LABORATORY INVESTIGATIONS", 28, tableY);

  // Table Header
  ctx.fillStyle = "#0067A1";
  ctx.fillRect(28, tableY + 10, width - 56, 30);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("#", 38, tableY + 30);
  ctx.fillText("Investigation / Test Name", 75, tableY + 30);
  ctx.fillText("Pre-requisites / Instructions", 360, tableY + 30);
  ctx.fillText("Priority", width - 105, tableY + 30);

  let currentY = tableY + 40;
  if (labTests.length === 0) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(28, currentY, width - 56, 42);
    ctx.strokeStyle = "#E2E8F0";
    ctx.strokeRect(28, currentY, width - 56, 42);

    ctx.fillStyle = "#64748B";
    ctx.font = "italic 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("No specific laboratory tests listed in this prescription.", 40, currentY + 26);
    currentY += 42;
  } else {
    labTests.forEach((t, idx) => {
      const testName = typeof t === "string" ? t : (t.test_name || t.name || "Lab Investigation");
      const instructions = typeof t === "object" ? (t.instructions || "Standard diagnostic protocol") : "Standard protocol";
      const urgency = (typeof t === "object" && t.urgency) ? t.urgency : "Routine";

      ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      ctx.fillRect(28, currentY, width - 56, 46);
      ctx.strokeStyle = "#E2E8F0";
      ctx.strokeRect(28, currentY, width - 56, 46);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${idx + 1}`, 38, currentY + 28);
      ctx.fillText(testName, 75, currentY + 28);

      ctx.fillStyle = "#475569";
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      const shortInst = instructions.length > 44 ? `${instructions.slice(0, 42)}...` : instructions;
      ctx.fillText(shortInst, 360, currentY + 28);

      ctx.fillStyle = "#0284C7";
      ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
      ctx.fillText(urgency.toUpperCase(), width - 105, currentY + 28);

      currentY += 46;
    });
  }

  // Doctor Signature Box
  const sigY = currentY + 20;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(width - 290, sigY, 262, 90);
  ctx.strokeStyle = "#CBD5E1";
  ctx.strokeRect(width - 290, sigY, 262, 90);

  ctx.fillStyle = "#64748B";
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.fillText("Electronic Authorization & Sign-off:", width - 278, sigY + 18);

  ctx.fillStyle = "#0067A1";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(docName, width - 278, sigY + 44);

  ctx.fillStyle = "#475569";
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.fillText("Authenticated Medical Consultation", width - 278, sigY + 62);
  const signedDateStr = (data.signed_at || data.created_at)
    ? `Signed at: ${new Date(data.signed_at || data.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
    : "Digitally Verified via MediConnect";
  ctx.fillText(signedDateStr, width - 278, sigY + 78);

  // Footer DPDP Note
  const footY = height - 42;
  ctx.fillStyle = "#F0FDF4";
  ctx.fillRect(28, footY, width - 56, 28);
  ctx.strokeStyle = "#86EFAC";
  ctx.strokeRect(28, footY, width - 56, 28);

  ctx.fillStyle = "#166534";
  ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DPDP ACT 2023 COMPLIANT: Clinical Test Requisition strictly for diagnostic laboratory analysis. Medications and diagnoses redacted.", width / 2, footY + 18);
  ctx.textAlign = "left";
}