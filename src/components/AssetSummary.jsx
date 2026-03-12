import React, { useState, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { usePageFocusFix, useLoadingReset } from "../hooks/usePageFocusFix";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import PinVerificationModal from "./PinVerificationModal";
import { useAuth } from "../context/AuthContext";
import { ModernSearchBar, ModernButton, StatusBadge, KebabMenu } from "./ui/ModernTable";
import {
  Eye,
  Edit,
  ArrowRightLeft,
  Trash2,
  Archive,
  X,
  Save,
  Package,
  Tag,
  Hash,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  TrendingDown,
  Download,
  CheckCircle,
  XCircle,
  Search,
  FolderOutput,
  MoreVertical,
  Printer,
  Plus,
} from "lucide-react";

const AssetSummary = memo(({ assets, userRole, userEmail, refreshData, showPendingOnly = false, onAddAsset }) => {
  const { verifyPin, checkPinLockStatus } = useAuth();
  
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [transferCompany, setTransferCompany] = useState("");
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // TAB FOCUS FIX
  const handlePageFocus = useCallback(() => {
    console.log("[AssetSummary] Page gained focus - ensuring UI is responsive");
  }, []);
  
  usePageFocusFix({ onFocus: handlePageFocus, enabled: true });
  useLoadingReset(loading, setLoading);
  
  const [amortizationDates, setAmortizationDates] = useState({
    start: "2026-02",
    end: "2027-12",
  });

  const [paidMonths, setPaidMonths] = useState(new Set());
  const [loadingPaidMonths, setLoadingPaidMonths] = useState(false);

  const fetchPaidMonths = async (assetId) => {
    if (!assetId) return;
    setLoadingPaidMonths(true);
    try {
      const { data, error } = await supabase
        .from("paid_amortization_months")
        .select("month_date")
        .eq("asset_id", assetId)
        .eq("is_paid", true);
      
      if (error) {
        console.error("Error fetching paid months:", error);
        return;
      }
      
      if (data && data.length > 0) {
        const paidSet = new Set(data.map(d => d.month_date));
        setPaidMonths(paidSet);
      } else {
        setPaidMonths(new Set());
      }
    } catch (err) {
      console.error("Unexpected error fetching paid months:", err);
    } finally {
      setLoadingPaidMonths(false);
    }
  };

  const savePaidMonth = async (assetId, monthDate, isPaid) => {
    if (!assetId || !monthDate) return;
    
    try {
      if (isPaid) {
        const { error } = await supabase
          .from("paid_amortization_months")
          .upsert({
            asset_id: assetId,
            month_date: monthDate,
            is_paid: true,
            created_by: userEmail,
          }, { onConflict: 'asset_id,month_date' });
        
        if (error) console.error("Error saving paid month:", error);
      } else {
        const { error } = await supabase
          .from("paid_amortization_months")
          .delete()
          .eq("asset_id", assetId)
          .eq("month_date", monthDate);
        
        if (error) console.error("Error removing paid month:", error);
      }
    } catch (err) {
      console.error("Unexpected error saving paid month:", err);
    }
  };

  const markAllAsPaid = async (assetId, dates) => {
    if (!assetId || !dates || dates.length === 0) return;
    
    try {
      const records = dates.map(date => ({
        asset_id: assetId,
        month_date: date,
        is_paid: true,
        created_by: userEmail,
      }));
      
      const { error } = await supabase
        .from("paid_amortization_months")
        .upsert(records, { onConflict: 'asset_id,month_date' });
      
      if (error) console.error("Error marking all as paid:", error);
    } catch (err) {
      console.error("Unexpected error marking all as paid:", err);
    }
  };

  useEffect(() => {
    if (modalMode === "amortization" && selectedAsset) {
      fetchPaidMonths(selectedAsset.id);
    }
  }, [modalMode, selectedAsset]);

  // PIN Verification
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  // Export modals
  const [showExportCategoryModal, setShowExportCategoryModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showExportLobModal, setShowExportLobModal] = useState(false);
  const [selectedLobs, setSelectedLobs] = useState([]);
  const [availableLobs, setAvailableLobs] = useState([]);

  const handlePinVerify = async (enteredPin) => {
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      setPinError(`Account locked. Try again in ${lockStatus.remainingTime}`);
      return false;
    }
    
    const result = await verifyPin(enteredPin);
    
    if (result.success) {
      setShowPinModal(false);
      setPinError("");
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    } else {
      setPinError(result.error || "Incorrect PIN. Please try again.");
      return false;
    }
  };

  const openWithPin = (action) => {
    setPendingAction(() => action);
    setShowPinModal(true);
    setPinError("");
  };

  // Calculations
  const calculatePaymentCompletion = React.useCallback((asset) => {
    const totalCost = parseFloat(asset.total_cost) || 0;
    const downpayment = parseFloat(asset.downpayment_amount) || 0;
    if (totalCost === 0) return 0;
    return Math.min((downpayment / totalCost) * 100, 100);
  }, []);

  const calculateAmortization = React.useCallback((asset) => {
    const cost = parseFloat(asset.total_cost || 0);
    const salvage = parseFloat(asset.salvage_value || 0);
    const lifeMonths = (parseInt(asset.useful_life_years) || 1) * 12;
    return ((cost - salvage) / lifeMonths).toFixed(2);
  }, []);

  // Filtered assets
  const filteredAssets = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    return assets.filter((asset) => {
      const matchesSearch = 
        asset.name?.toLowerCase().includes(query) ||
        asset.tag_number?.toLowerCase().includes(query) ||
        asset.category?.toLowerCase().includes(query) ||
        asset.status?.toLowerCase().includes(query) ||
        asset.current_company?.toLowerCase().includes(query);
      
      if (showPendingOnly) {
        const paymentCompletion = calculatePaymentCompletion(asset);
        return matchesSearch && paymentCompletion < 100;
      }
      
      return matchesSearch;
    });
  }, [assets, searchQuery, showPendingOnly, calculatePaymentCompletion]);

  // Amortization schedule
  const getAssetAmortizationSchedule = React.useCallback(() => {
    if (!selectedAsset || !amortizationDates.start || !amortizationDates.end) return [];

    const start = new Date(amortizationDates.start);
    const end = new Date(amortizationDates.end);
    const schedule = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();

    const [pYear, pMonth] = selectedAsset.purchase_date.split("-").map(Number);
    const startDepreciationDate = new Date(pYear, pMonth - 1, 1);

    const lifeYears = parseFloat(selectedAsset.useful_life_years) || 0;
    const endDepreciationDate = new Date(startDepreciationDate);
    endDepreciationDate.setFullYear(endDepreciationDate.getFullYear() + lifeYears);

    const cost = parseFloat(selectedAsset.total_cost) || 0;
    const salvage = parseFloat(selectedAsset.salvage_value) || 0;
    const monthlyDep = lifeYears > 0 ? (cost - salvage) / (lifeYears * 12) : 0;

    while (current.getTime() <= endTime) {
      const amount = current >= startDepreciationDate && current < endDepreciationDate ? monthlyDep : 0;
      schedule.push({
        date: current.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        amount,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return schedule;
  }, [selectedAsset, amortizationDates]);

  const schedule = React.useMemo(() => {
    return modalMode === "amortization" ? getAssetAmortizationSchedule() : [];
  }, [modalMode, getAssetAmortizationSchedule]);
  
  const scheduleTotal = React.useMemo(() => {
    return schedule.reduce((sum, i) => sum + i.amount, 0);
  }, [schedule]);

  useEffect(() => {
    if (modalMode) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [modalMode]);

  const downloadExcel = async (workbook, filename) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportAsset = async () => {
    const assetDetails = [{
      "Asset Name": selectedAsset.name,
      "Tag Number": selectedAsset.tag_number,
      Category: selectedAsset.category || "",
      Status: selectedAsset.status || "",
      LOB: selectedAsset.current_company || "",
      "Total Cost": selectedAsset.total_cost || 0,
      "Salvage Value": selectedAsset.salvage_value || 0,
      "Useful Life (Years)": selectedAsset.useful_life_years || 0,
      "Purchase Date": selectedAsset.purchase_date || "",
      "Reference Number": selectedAsset.reference_number || "",
      "Serial Number": selectedAsset.serial_number || "",
      Description: selectedAsset.description || "",
      Location: selectedAsset.location || "",
      "Assigned To": selectedAsset.assigned_to || "",
      "Monthly Amortization": calculateAmortization(selectedAsset),
    }];

    const amortSchedule = getAssetAmortizationSchedule();
    const scheduleData = amortSchedule.map((item) => ({
      "Period": item.date,
      "Monthly Depreciation": item.amount,
    }));
    
    scheduleData.push({ "Period": "Total", "Monthly Depreciation": scheduleTotal });

    const workbook = new ExcelJS.Workbook();
    const ws1 = workbook.addWorksheet("Asset Details");
    ws1.columns = [
      { header: "Asset Name", key: "Asset Name", width: 25 },
      { header: "Tag Number", key: "Tag Number", width: 15 },
      { header: "Category", key: "Category", width: 15 },
      { header: "Status", key: "Status", width: 12 },
      { header: "Company", key: "Company", width: 15 },
      { header: "Total Cost", key: "Total Cost", width: 12 },
      { header: "Salvage Value", key: "Salvage Value", width: 12 },
      { header: "Useful Life (Years)", key: "Useful Life (Years)", width: 18 },
      { header: "Purchase Date", key: "Purchase Date", width: 14 },
      { header: "Reference Number", key: "Reference Number", width: 15 },
      { header: "Serial Number", key: "Serial Number", width: 15 },
      { header: "Description", key: "Description", width: 30 },
      { header: "Location", key: "Location", width: 20 },
      { header: "Assigned To", key: "Assigned To", width: 20 },
      { header: "Monthly Amortization", key: "Monthly Amortization", width: 18 },
    ];
    assetDetails.forEach(row => ws1.addRow(row));
    
    const ws2 = workbook.addWorksheet("Amortization Schedule");
    ws2.columns = [
      { header: "Period", key: "Period", width: 20 },
      { header: "Monthly Depreciation", key: "Monthly Depreciation", width: 22 },
    ];
    scheduleData.forEach(row => ws2.addRow(row));

    await downloadExcel(workbook, `Asset_${selectedAsset.tag_number}.xlsx`);
  };

  const handleTransfer = async () => {
    if (!transferCompany) return alert("Please select a company");
    setLoading(true);
    const data = [{
      "Asset Name": selectedAsset.name,
      "Tag Number": selectedAsset.tag_number,
      "Previous Company": selectedAsset.current_company,
      "New Company": transferCompany,
      "Transferred By": userEmail,
      Date: format(new Date(), "yyyy-MM-dd"),
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer Proof");
    XLSX.writeFile(wb, `Transfer_${selectedAsset.tag_number}.xlsx`);
    
    const { error } = await supabase
      .from("assets")
      .update({ status: "Transferred", current_company: transferCompany })
      .eq("id", selectedAsset.id);
    
    if (error) { alert(error.message); setLoading(false); return; }
    
    await supabase.from("logs").insert({
      user_email: userEmail || "unknown",
      action_type: "TRANSFER_ASSET",
      details: { asset_name: selectedAsset.name, tag_number: selectedAsset.tag_number, from_company: selectedAsset.current_company, to_company: transferCompany, status: "Transferred", transferred_by: userEmail, transfer_date: new Date().toISOString(), message: `Asset "${selectedAsset.name}" transferred from ${selectedAsset.current_company} to ${transferCompany}` }
    });

    setLoading(false);
    closeModal();
    refreshData();
  };

  const handleDispose = async () => {
    setLoading(true);
    try {
      const quantity = Number(selectedAsset.quantity) || 0;
      const unitCost = Number(selectedAsset.unit_cost) || 0;
      const totalCost = quantity * unitCost;
      const salvageValue = Number(selectedAsset.salvage_value) || 0;
      const usefulLifeYears = Number(selectedAsset.useful_life_years) || 0;
      let monthlyAmortization = 0;
      if (usefulLifeYears > 0) monthlyAmortization = (totalCost - salvageValue) / (usefulLifeYears * 12);

      const exportData = [{
        "Asset Name": selectedAsset.name,
        Category: selectedAsset.category,
        Tag: selectedAsset.tag_number,
        Reference: selectedAsset.reference_number,
        Qty: quantity,
        "Unit Cost": unitCost,
        "Total Cost": totalCost,
        "Salvage Value": salvageValue,
        "Useful Life": usefulLifeYears,
        "Purchase Date": selectedAsset.purchase_date,
        "Disposed By": userEmail,
        "Disposal Date": format(new Date(), "yyyy-MM-dd"),
        "Monthly Amortization": monthlyAmortization.toFixed(2),
      }];
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Disposed Asset");
      XLSX.writeFile(wb, `Disposed_${selectedAsset.tag_number}.csv`);

      const { error: updateError } = await supabase
        .from("assets")
        .update({ status: "Disposed" })
        .eq("id", selectedAsset.id);

      if (updateError) throw updateError;

      setLoading(false);
      closeModal();
      if (refreshData) await refreshData();
      else window.location.reload();
      alert("Asset marked as Disposed and data exported to CSV successfully.");
    } catch (error) {
      console.error("Error disposing asset:", error);
      alert(`Failed to dispose asset: ${error.message}`);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from("assets").delete().eq("id", selectedAsset.id);
    if (error) { alert(error.message); setLoading(false); return; }
    
    await supabase.from("logs").insert({
      user_email: userEmail || "unknown",
      action_type: "DELETE_ASSET",
      details: { asset_name: selectedAsset.name, tag_number: selectedAsset.tag_number, category: selectedAsset.category, total_cost: selectedAsset.total_cost, status: selectedAsset.status, deleted_by: userEmail, deletion_date: new Date().toISOString(), message: `Asset "${selectedAsset.name}" deleted by ${userEmail}` }
    });

    setLoading(false);
    closeModal();
    if (refreshData) await refreshData();
    else window.location.reload();
  };

  const handleEditSave = async () => {
    setLoading(true);
    const quantity = parseInt(editForm.quantity) || 1;
    const unitCost = parseFloat(editForm.unit_cost) || 0;
    const totalCost = quantity * unitCost;
    
    const { ...updatePayload } = editForm;
    updatePayload.quantity = quantity;
    updatePayload.unit_cost = unitCost;
    updatePayload.total_cost = totalCost;
    
    const { error } = await supabase.from("assets").update(updatePayload).eq("id", selectedAsset.id);
    if (error) { alert(error.message); setLoading(false); return; }
    
    await supabase.from("logs").insert({
      user_email: userEmail || "unknown",
      action_type: "EDIT_ASSET",
      details: { asset_name: selectedAsset.name, tag_number: selectedAsset.tag_number, category: editForm.category || selectedAsset.category, status: editForm.status || selectedAsset.status, company: editForm.current_company || selectedAsset.current_company, edited_by: userEmail, edit_date: new Date().toISOString(), message: `Asset "${selectedAsset.name}" edited by ${userEmail}` }
    });

    setLoading(false);
    closeModal();
    refreshData();
  };

  const openModal = (asset, mode) => {
    setSelectedAsset(asset);
    setModalMode(mode);
    if (mode === "edit") setEditForm(asset);
    if (mode === "transfer") setTransferCompany("");
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const closeModal = () => { setSelectedAsset(null); setModalMode(null); };

  const statusClass = (s) => (s === "Active" ? "active" : s === "Transferred" ? "transferred" : s === "Pending" ? "pending" : "disposed");

  const handleApprove = async (assetId) => {
    setLoading(true);
    const { error } = await supabase.from("assets").update({ status: "Active" }).eq("id", assetId);
    if (error) { alert("Error: " + error.message); setLoading(false); return; }
    setLoading(false);
    if (refreshData) await refreshData();
    else window.location.reload();
  };

  const handleReject = async (assetId) => {
    setLoading(true);
    const { error } = await supabase.from("assets").update({ status: "Rejected" }).eq("id", assetId);
    if (error) { alert("Error: " + error.message); setLoading(false); return; }
    setLoading(false);
    if (refreshData) await refreshData();
    else window.location.reload();
  };

  // Export functions
  const openExportLobModal = () => {
    const lobs = [...new Set(filteredAssets.map(a => a.current_company).filter(Boolean))];
    setAvailableLobs(lobs);
    setSelectedLobs(lobs);
    setShowExportLobModal(true);
  };

  const handleExportByLob = async () => {
    if (selectedLobs.length === 0) { alert("Please select at least one LOB."); return; }
    const workbook = new ExcelJS.Workbook();

    selectedLobs.forEach(lob => {
      const lobAssets = filteredAssets.filter(a => a.current_company === lob);
      if (lobAssets.length === 0) return;

      const sheetName = lob.length > 30 ? lob.substring(0, 30) : lob;
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { header: "Tag #", key: "tagNumber", width: 15 },
        { header: "Asset Name", key: "assetName", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "LOB", key: "lob", width: 20 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit Cost", key: "unitCost", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Total Cost", key: "totalCost", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Salvage Value", key: "salvageValue", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Useful Life", key: "usefulLife", width: 12 },
        { header: "Purchase Date", key: "purchaseDate", width: 15 },
        { header: "Reference #", key: "referenceNumber", width: 15 },
        { header: "Serial #", key: "serialNumber", width: 15 },
        { header: "Location", key: "location", width: 20 },
        { header: "Assigned To", key: "assignedTo", width: 20 },
        { header: "Description", key: "description", width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true };

      lobAssets.forEach(asset => {
        worksheet.addRow({
          tagNumber: asset.tag_number || "",
          assetName: asset.name || "",
          category: asset.category || "",
          status: asset.status || "",
          lob: asset.current_company || "",
          quantity: asset.quantity || 0,
          unitCost: asset.unit_cost != null ? parseFloat(asset.unit_cost) : 0,
          totalCost: asset.total_cost != null ? parseFloat(asset.total_cost) : undefined,
          salvageValue: asset.salvage_value != null ? parseFloat(asset.salvage_value) : 0,
          usefulLife: asset.useful_life_years || 0,
          purchaseDate: asset.purchase_date || "",
          referenceNumber: asset.reference_number || "",
          serialNumber: asset.serial_number || "",
          location: asset.location || "",
          assignedTo: asset.assigned_to || "",
          description: asset.description || "",
        });
      });
    });

    await downloadExcel(workbook, `Assets_By_LOB_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportLobModal(false);
  };

  const openExportCategoryModal = () => {
    const categories = [...new Set(filteredAssets.map(a => a.category).filter(Boolean))];
    setAvailableCategories(categories);
    setSelectedCategories(categories);
    setShowExportCategoryModal(true);
  };

  const handleExportByCategory = async () => {
    if (selectedCategories.length === 0) { alert("Please select at least one category."); return; }
    const workbook = new ExcelJS.Workbook();

    selectedCategories.forEach(category => {
      const categoryAssets = filteredAssets.filter(a => a.category === category);
      if (categoryAssets.length === 0) return;
      const sheetName = category.length > 30 ? category.substring(0, 30) : category;
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { header: "Tag #", key: "tagNumber", width: 15 },
        { header: "Asset Name", key: "assetName", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "LOB", key: "lob", width: 20 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit Cost", key: "unitCost", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Total Cost", key: "totalCost", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Salvage Value", key: "salvageValue", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Useful Life", key: "usefulLife", width: 12 },
        { header: "Purchase Date", key: "purchaseDate", width: 15 },
        { header: "Reference #", key: "referenceNumber", width: 15 },
        { header: "Serial #", key: "serialNumber", width: 15 },
        { header: "Location", key: "location", width: 20 },
        { header: "Assigned To", key: "assignedTo", width: 20 },
        { header: "Description", key: "description", width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true };

      categoryAssets.forEach(asset => {
        worksheet.addRow({
          tagNumber: asset.tag_number || "",
          assetName: asset.name || "",
          category: asset.category || "",
          status: asset.status || "",
          lob: asset.current_company || "",
          quantity: asset.quantity || 0,
          unitCost: asset.unit_cost != null ? parseFloat(asset.unit_cost) : 0,
          totalCost: asset.total_cost != null ? parseFloat(asset.total_cost) : undefined,
          salvageValue: asset.salvage_value != null ? parseFloat(asset.salvage_value) : 0,
          usefulLife: asset.useful_life_years || 0,
          purchaseDate: asset.purchase_date || "",
          referenceNumber: asset.reference_number || "",
          serialNumber: asset.serial_number || "",
          location: asset.location || "",
          assignedTo: asset.assigned_to || "",
          description: asset.description || "",
        });
      });
    });

    await downloadExcel(workbook, `Assets_By_Category_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportCategoryModal(false);
  };

  const toggleLob = (lob) => {
    setSelectedLobs(prev => prev.includes(lob) ? prev.filter(l => l !== lob) : [...prev, lob]);
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  // Render table row
  const renderTableRow = (asset) => {
    const statusVariant = statusClass(asset.status);
    
    return (
      <div key={asset.id} className="dash-log-row hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <span className="text-center">
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{asset.tag_number}</span>
        </span>
        <span className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{asset.name}</span>
            {asset.is_existing && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                Existing
              </span>
            )}
          </div>
        </span>
        <span className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{asset.category || "—"}</span>
        </span>
        <span className="text-center">
          <StatusBadge status={statusVariant} />
        </span>
        <span className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{asset.current_company || "—"}</span>
        </span>
        <span className="text-center">
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            ₱{parseFloat(asset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </span>
        {showPendingOnly && (
          <span className="text-center">
            <div className="flex flex-col gap-1 items-center">
              <span className={`text-xs font-semibold ${calculatePaymentCompletion(asset) >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {calculatePaymentCompletion(asset).toFixed(1)}%
              </span>
              <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${calculatePaymentCompletion(asset) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${calculatePaymentCompletion(asset)}%` }}
                />
              </div>
            </div>
          </span>
        )}
        <span className="text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => openModal(asset, "view")}
              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            {(userRole === "head" || userRole === "admin") && (
              <button
                onClick={() => openWithPin(() => openModal(asset, "edit"))}
                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => openWithPin(() => openModal(asset, "delete"))}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {asset.status === "Active" && (
              <>
                <button
                  onClick={() => openWithPin(() => openModal(asset, "transfer"))}
                  className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors rounded-md"
                  title="Transfer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openWithPin(() => openModal(asset, "dispose"))}
                  className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors rounded-md"
                  title="Dispose"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </>
            )}
            {asset.status === "Pending" && userRole === "admin" && (
              <>
                <button
                  onClick={() => handleApprove(asset.id)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors rounded-md"
                  title="Approve"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReject(asset.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md"
                  title="Reject"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </span>
      </div>
    );
  };

  return (
    <>
      {/* ── Modern Toolbar ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
        <ModernSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, tag, category, status..."
          className="flex-1 max-w-sm"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
            {filteredAssets.length} of {assets.length} results
          </span>
          
          <ModernButton variant="secondary" size="sm" icon={Building2} onClick={openExportLobModal}>
            Export by LOB
          </ModernButton>
          
          <ModernButton variant="secondary" size="sm" icon={FolderOutput} onClick={openExportCategoryModal}>
            Export by Category
          </ModernButton>
        </div>
      </div>

      {/* ── Modern Table ── */}
      <div className={`dash-logs-list asset-inventory ${showPendingOnly ? 'has-payment' : ''}`}>
        <div className="dash-log-header">
          <span className="text-center">Tag #</span>
          <span className="text-center">Asset Name</span>
          <span className="text-center">Category</span>
          <span className="text-center">Status</span>
          <span className="text-center">LOB</span>
          <span className="text-center">Total Cost</span>
          {showPendingOnly && <span className="text-center">Payment</span>}
          <span className="text-center">Actions</span>
        </div>
        {filteredAssets.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="inline-block p-4 bg-gray-200 dark:bg-gray-700 rounded-full">
                <Search size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
                No assets match your search
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search terms to find what you're looking for.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="inline-block p-4 bg-gray-200 dark:bg-gray-700 rounded-full">
                <Package size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
                No assets yet
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new asset to your inventory.
              </p>
              <div className="mt-6">
                <button className="dash-btn dash-btn-primary" onClick={onAddAsset} style={{ background: '#dc2626' }}><Plus size={16} /> Add Asset</button>
              </div>
            </div>
          )
        ) : (
          filteredAssets.map(renderTableRow)
        )}
      </div>

      {/* ── Modals ── */}
      {modalMode && selectedAsset && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          {/* VIEW MODAL */}
          {modalMode === "view" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Asset Details</h3>
                    <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Tag Number</p>
                    <p className="font-mono font-semibold text-gray-900">{selectedAsset.tag_number}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
                    <p className="font-medium text-gray-900">{selectedAsset.category || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                    <StatusBadge status={statusClass(selectedAsset.status)} />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">LOB</p>
                    <p className="font-medium text-gray-900">{selectedAsset.current_company || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Cost</p>
                    <p className="font-mono font-semibold text-gray-900">₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Salvage Value</p>
                    <p className="font-mono text-gray-900">₱{parseFloat(selectedAsset.salvage_value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Useful Life</p>
                    <p className="font-medium text-gray-900">{selectedAsset.useful_life_years} years</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Purchase Date</p>
                    <p className="font-medium text-gray-900">{selectedAsset.purchase_date || "—"}</p>
                  </div>
                </div>
                
                {/* Amortization Box */}
                <div 
                  className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 border border-primary-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setModalMode("amortization")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Amortization</p>
                      <p className="text-2xl font-bold text-primary-600">₱{calculateAmortization(selectedAsset)}</p>
                      <p className="text-xs text-gray-500 mt-1">Straight-line depreciation</p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-primary-400" />
                  </div>
                  <p className="text-xs text-primary-600 mt-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Click to view full schedule
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                <button onClick={handleExportAsset} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>
          )}

          {/* AMORTIZATION MODAL */}
          {modalMode === "amortization" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setModalMode("view")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Amortization Schedule</h3>
                    <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">From</label>
                    <input type="month" value={amortizationDates.start} onChange={(e) => setAmortizationDates({ ...amortizationDates, start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">To</label>
                    <input type="month" value={amortizationDates.end} onChange={(e) => setAmortizationDates({ ...amortizationDates, end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-emerald-600 font-medium">{paidMonths.size} paid</span>
                  <span className="text-amber-600 font-medium">{schedule.filter(s => s.amount > 0).length - paidMonths.size} remaining</span>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {schedule.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0 ${paidMonths.has(item.date) ? 'bg-emerald-50' : ''}`}
                    >
                      <span className={`text-sm ${paidMonths.has(item.date) ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>{item.date}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm ${paidMonths.has(item.date) ? 'text-emerald-700' : 'text-gray-900'}`}>
                          ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {item.amount > 0 && (
                          <button
                            onClick={() => {
                              const newPaid = new Set(paidMonths);
                              const isPaid = !paidMonths.has(item.date);
                              if (isPaid) newPaid.add(item.date);
                              else newPaid.delete(item.date);
                              setPaidMonths(newPaid);
                              savePaidMonth(selectedAsset.id, item.date, isPaid);
                            }}
                            className={`w-5 h-5 rounded flex items-center justify-center text-xs ${paidMonths.has(item.date) ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-300 hover:border-emerald-300'}`}
                          >
                            {paidMonths.has(item.date) ? '✓' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Total</span>
                    <span className="font-mono font-bold text-gray-900">₱{scheduleTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200">
                <button onClick={closeModal} className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          )}

          {/* TRANSFER MODAL */}
          {modalMode === "transfer" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Transfer Asset</h3>
                    <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">Transferring from <strong>{selectedAsset.current_company}</strong>. A transfer proof will be downloaded.</p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination LOB</label>
                <select value={transferCompany} onChange={(e) => setTransferCompany(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select LOB…</option>
                  <option value="CY Caloocan">CY Caloocan</option>
                  <option value="CY Bustos">CY Bustos</option>
                  <option value="Chassis Leasing">Chassis Leasing</option>
                  <option value="Reefer">Reefer</option>
                  <option value="Trucking">Trucking</option>
                  <option value="Technical Service">Technical Service</option>
                  <option value="Outports">Outports</option>
                  <option value="CY Valenzuela">CY Valenzuela</option>
                  <option value="HO">HO</option>
                </select>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleTransfer} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                  {loading ? "Processing…" : <><ArrowRight className="w-4 h-4" /> Confirm</>}
                </button>
              </div>
            </div>
          )}

          {/* DISPOSE MODAL */}
          {modalMode === "dispose" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Archive className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Dispose Asset</h3>
                    <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">This will export data to CSV and <strong>permanently delete</strong> the record.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Cost</p>
                    <p className="font-mono font-semibold">₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Salvage Value</p>
                    <p className="font-mono">₱{parseFloat(selectedAsset.salvage_value || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleDispose} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {loading ? "Processing…" : <><CheckCircle2 className="w-4 h-4" /> Confirm</>}
                </button>
              </div>
            </div>
          )}

          {/* DELETE MODAL */}
          {modalMode === "delete" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Asset</h3>
                    <p className="text-sm text-gray-500">This action is permanent</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">You are about to <strong>permanently delete</strong> <strong>{selectedAsset.name}</strong>. This cannot be undone.</p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleDelete} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {loading ? "Deleting…" : <><Trash2 className="w-4 h-4" /> Delete</>}
                </button>
              </div>
            </div>
          )}

          {/* EDIT MODAL */}
          {modalMode === "edit" && (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Edit Asset</h3>
                    <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                      <input name="name" value={editForm.name || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input name="category" value={editForm.category || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tag Number</label>
                      <input name="tag_number" value={editForm.tag_number || ""} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                      <input name="reference_number" value={editForm.reference_number || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Valuation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input type="number" name="quantity" value={editForm.quantity || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (₱)</label>
                      <input type="number" step="0.01" name="unit_cost" value={editForm.unit_cost || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value (₱)</label>
                      <input type="number" step="0.01" name="salvage_value" value={editForm.salvage_value || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label>
                      <input type="number" name="useful_life_years" value={editForm.useful_life_years || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Logistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                      <input type="date" name="purchase_date" value={editForm.purchase_date || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LOB</label>
                      <select name="current_company" value={editForm.current_company || "HO"} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="HO">HO</option>
                        <option value="CY Caloocan">CY Caloocan</option>
                        <option value="CY Bustos">CY Bustos</option>
                        <option value="Chassis Leasing">Chassis Leasing</option>
                        <option value="Reefer">Reefer</option>
                        <option value="Trucking">Trucking</option>
                        <option value="Technical Service">Technical Service</option>
                        <option value="Outports">Outports</option>
                        <option value="CY Valenzuela">CY Valenzuela</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input name="location" value={editForm.location || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                      <input name="assigned_to" value={editForm.assigned_to || ""} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
                <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleEditSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {loading ? "Saving…" : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* PIN Modal */}
      {showPinModal && createPortal(
        <PinVerificationModal
          isOpen={showPinModal}
          onClose={() => { setShowPinModal(false); setPendingAction(null); setPinError(""); }}
          onVerify={handlePinVerify}
          title="Security Verification"
          subtitle="Enter your 4-digit PIN to proceed"
          error={pinError}
          clearError={() => setPinError("")}
        />,
        document.body
      )}

      {/* Export by Category Modal */}
      {showExportCategoryModal && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowExportCategoryModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Export by Category</h3>
              <button onClick={() => setShowExportCategoryModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto">
              {availableCategories.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No categories found.</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setSelectedCategories([...availableCategories])} className="text-xs px-3 py-1.5 bg-gray-100 rounded-md">Select All</button>
                    <button onClick={() => setSelectedCategories([])} className="text-xs px-3 py-1.5 bg-gray-100 rounded-md">Deselect All</button>
                  </div>
                  <div className="space-y-2">
                    {availableCategories.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="w-4 h-4" />
                        <span className="text-sm">{cat}</span>
                        <span className="text-xs text-gray-400 ml-auto">{assets.filter(a => a.category === cat).length}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => setShowExportCategoryModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleExportByCategory} disabled={selectedCategories.length === 0} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Export by LOB Modal */}
      {showExportLobModal && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowExportLobModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Export by LOB</h3>
              <button onClick={() => setShowExportLobModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto">
              {availableLobs.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No LOBs found.</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setSelectedLobs([...availableLobs])} className="text-xs px-3 py-1.5 bg-gray-100 rounded-md">Select All</button>
                    <button onClick={() => setSelectedLobs([])} className="text-xs px-3 py-1.5 bg-gray-100 rounded-md">Deselect All</button>
                  </div>
                  <div className="space-y-2">
                    {availableLobs.map(lob => (
                      <label key={lob} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedLobs.includes(lob)} onChange={() => toggleLob(lob)} className="w-4 h-4" />
                        <span className="text-sm">{lob}</span>
                        <span className="text-xs text-gray-400 ml-auto">{assets.filter(a => a.current_company === lob).length}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => setShowExportLobModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleExportByLob} disabled={selectedLobs.length === 0} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

AssetSummary.displayName = 'AssetSummary';

export default AssetSummary;
