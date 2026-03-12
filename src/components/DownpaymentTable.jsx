
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import PinVerificationModal from "./PinVerificationModal";
import { ModernSearchBar, ModernButton, StatusBadge, ActionButton } from "./ui/ModernTable";
import {
  Edit,
  Trash2,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Receipt,
  Search,
  Package,
  FileText,
  CheckCircle2,
  Tag,
  Download,
  Layers,
  MapPin,
  User,
  Hash,
  Building2,
  Clock,
} from "lucide-react";

const DownpaymentTable = ({ assets, userRole, userEmail, refreshData }) => {
  const { user, verifyPin } = useAuth();
  const [transactions, setTransactions] = useState({});
  const [pendingDownpayments, setPendingDownpayments] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [expandedAssets, setExpandedAssets] = useState({});
  const [modalMode, setModalMode] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [addAssetForm, setAddAssetForm] = useState({ name: "", category: "", tag_number: "", total_cost: "", status: "Pending", downpayment_amount: "", downpayment_description: "", reference_number: "", serial_number: "", description: "", quantity: "1", unit_cost: "", purchase_date: new Date().toISOString().split("T")[0], current_company: "HO", location: "", assigned_to: "" });
  const [addTransactionForm, setAddTransactionForm] = useState({ amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [promotionForm, setPromotionForm] = useState({ salvage_value: "0", useful_life_years: "5", tag_number: "" });
  const [searchQuery, setSearchQuery] = useState("");
  
  // PIN Verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pinError, setPinError] = useState("");

  // Extract unique categories from assets for the dropdown
  const uniqueCategories = useMemo(() => {
    return [...new Set((assets || []).map(a => a.category).filter(Boolean))].sort();
  }, [assets]);

  useEffect(() => {
    fetchTransactions();
    fetchPendingDownpayments();
  }, [showAddAssetModal]);

  useEffect(() => {
    if (showPromotionModal) {
      const generateTagNumber = async () => {
        const { data } = await supabase.from("assets").select("tag_number").not("tag_number", "is", null).order("tag_number", { ascending: false });
        let nextNum = 1;
        if (data?.length) {
          data.forEach((item) => { const match = item.tag_number?.match(/^TAG-(\d+)$/); if (match) { const num = parseInt(match[1], 10); if (num >= nextNum) nextNum = num + 1; } });
        }
        setPromotionForm((prev) => ({ ...prev, tag_number: `TAG-${nextNum.toString().padStart(3, "0")}` }));
      };
      generateTagNumber();
    }
  }, [showPromotionModal]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from("downpayment_transactions").select("*").order("transaction_date", { ascending: false });
    if (error) { console.error("Error:", error); return; }
    const grouped = {};
    (data || []).forEach((txn) => { if (!grouped[txn.asset_id]) grouped[txn.asset_id] = []; grouped[txn.asset_id].push(txn); });
    setTransactions(grouped);
  };

const fetchPendingDownpayments = async () => {
    // Fetch transactions that are pending (not yet in inventory)
    // Use correct PostgREST syntax: is.null instead of is_null
    try {
      const { data, error } = await supabase
        .from("downpayment_transactions")
        .select("*")
        .or("asset_id.is.null,is_pending.eq.true")
        .order("transaction_date", { ascending: false });
      
      if (error) { 
        // If is_pending column doesn't exist, fallback to just checking asset_id IS NULL
        if (error.code === 'PGRST100' || error.message.includes('is_pending')) {
          const { data: fallbackData } = await supabase
            .from("downpayment_transactions")
            .select("*")
            .is("asset_id", null)
            .order("transaction_date", { ascending: false });
          setPendingDownpayments(groupPendingTransactions(fallbackData || []));
          return;
        }
        console.error("Error fetching pending:", error); 
        return; 
      }
      setPendingDownpayments(groupPendingTransactions(data || []));
    } catch (err) {
      console.error("Error fetching pending:", err);
      setPendingDownpayments([]);
    }
  };

  const groupPendingTransactions = (transactions) => {
    const groups = {};
    transactions.forEach(txn => {
      let details;
      try {
        details = JSON.parse(txn.description);
      } catch (e) {
        details = { name: txn.description || "Unknown", category: "General", total_cost: 0 };
      }
      
      const key = details.name || "Unknown";
      if (!groups[key]) {
        groups[key] = {
          id: `pending-${key.replace(/\s+/g, '-').toLowerCase()}`,
          name: key,
          category: details.category,
          total_cost: parseFloat(details.total_cost) || 0,
          is_pending_virtual: true,
          description_template: txn.description,
          original_created_by: txn.created_by,
          transactions: [],
          total_paid: 0
        };
      }
      groups[key].transactions.push(txn);
      groups[key].total_paid += (parseFloat(txn.amount) || 0);
    });
    return Object.values(groups);
  };

  useEffect(() => { const handleOpenAdd = () => setShowAddAssetModal(true); window.addEventListener('openAddDownpayment', handleOpenAdd); return () => window.removeEventListener('openAddDownpayment', handleOpenAdd); }, []);

  const downpaymentAssets = assets.filter((asset) => {
    const assetTransactions = transactions[asset.id] || [];
    const hasTransactions = assetTransactions.length > 0;
    const hasLegacyDownpayment = parseFloat(asset.downpayment_amount) > 0;
    const query = searchQuery.toLowerCase();
    const matchesSearch = asset.name?.toLowerCase().includes(query) || asset.tag_number?.toLowerCase().includes(query) || asset.category?.toLowerCase().includes(query);
    return (hasTransactions || hasLegacyDownpayment) && matchesSearch;
  });

  const getTotalDownpayment = (asset) => { const assetTransactions = transactions[asset.id] || []; const txnTotal = assetTransactions.reduce((sum, txn) => sum + (parseFloat(txn.amount) || 0), 0); const legacyTotal = parseFloat(asset.downpayment_amount) || 0; return txnTotal + legacyTotal; };

  const calculatePaymentCompletion = (asset) => { const totalCost = parseFloat(asset.total_cost) || 0; const downpayment = getTotalDownpayment(asset); if (totalCost === 0) return 0; return Math.min((downpayment / totalCost) * 100, 100); };

  const toggleAssetExpansion = (assetId) => { setExpandedAssets((prev) => ({ ...prev, [assetId]: !prev[assetId] })); };

  const handleExportDownpaymentAssets = async () => {
    if (downpaymentAssets.length === 0) {
      alert("No downpayment assets to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Downpayment Assets");

    worksheet.columns = [
      { header: "Tag #", key: "tagNumber", width: 15 },
      { header: "Asset Name", key: "assetName", width: 35 },
      { header: "Category", key: "category", width: 18 },
      { header: "Status", key: "status", width: 12 },
      { header: "Total Cost", key: "totalCost", width: 18, style: { numFmt: '"₱"#,##0.00' } },
      { header: "Downpayment", key: "totalDownpayment", width: 18, style: { numFmt: '"₱"#,##0.00' } },
      { header: "Progress", key: "paymentProgress", width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };

    downpaymentAssets.forEach(asset => {
      const paymentPercent = calculatePaymentCompletion(asset);
      const isComplete = paymentPercent >= 100;

      worksheet.addRow({
        tagNumber: asset.tag_number || "",
        assetName: asset.name || "",
        category: asset.category || "—",
        status: isComplete ? "Completed" : "Pending",
        totalCost: parseFloat(asset.total_cost || 0),
        totalDownpayment: getTotalDownpayment(asset),
        paymentProgress: `${paymentPercent.toFixed(1)}%`,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Downpayment_Assets_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const totalCost = parseFloat(addAssetForm.total_cost) || 0;
    const initialAmount = parseFloat(addAssetForm.downpayment_amount) || 0;
    
    if (totalCost <= 0) { alert("Total cost must be greater than 0"); setLoading(false); return; }
    
    // Create a temporary record with name and total_cost stored in description
    // This allows tracking the asset before it's fully paid
    const assetDescription = JSON.stringify({
      name: addAssetForm.name,
      category: addAssetForm.category || "General",
      total_cost: totalCost,
      description: addAssetForm.downpayment_description || "",
      reference_number: addAssetForm.reference_number,
      serial_number: addAssetForm.serial_number,
      asset_description: addAssetForm.description,
      quantity: addAssetForm.quantity,
      unit_cost: addAssetForm.unit_cost,
      purchase_date: addAssetForm.purchase_date,
      current_company: addAssetForm.current_company,
      location: addAssetForm.location,
      assigned_to: addAssetForm.assigned_to
    });
    
    // Create only the downpayment transaction (not the asset in inventory)
    const { data: txnData, error: txnError } = await supabase.from("downpayment_transactions").insert([{ 
      asset_id: null, // No asset_id yet - not in inventory
      amount: initialAmount, 
      description: assetDescription,
      transaction_date: new Date().toISOString().split("T")[0], 
      created_by: userEmail,
      is_pending: true // Mark as pending - not yet in inventory
    }]).select();
    
    if (txnError) { alert("Error: " + txnError.message); setLoading(false); return; }
    
    // Check if initial downpayment equals or exceeds total cost - auto-promote to inventory
    // If fully paid, show promotion modal to get salvage value and useful life
    if (initialAmount >= totalCost && txnData?.[0]) {
      // Wait for user to confirm salvage value and useful life before promoting
      await supabase.from("logs").insert({ user_email: userEmail || "unknown", action_type: "CREATE_DOWNPAYMENT", details: { asset_name: addAssetForm.name, message: `Downpayment for "${addAssetForm.name}" created` } });
      setPromotionData({ transaction: txnData[0], totalCost });
      setShowPromotionModal(true);
      setLoading(false); setShowAddAssetModal(false); setIsNewCategory(false); setAddAssetForm({ name: "", category: "", tag_number: "", total_cost: "", status: "Pending", downpayment_amount: "", downpayment_description: "", reference_number: "", serial_number: "", description: "", quantity: "1", unit_cost: "", purchase_date: new Date().toISOString().split("T")[0], current_company: "HO", location: "", assigned_to: "" }); fetchTransactions(); fetchPendingDownpayments();
      return;
    }
    
    await supabase.from("logs").insert({ user_email: userEmail || "unknown", action_type: "CREATE_DOWNPAYMENT", details: { asset_name: addAssetForm.name, message: `Downpayment for "${addAssetForm.name}" created` } });
    setLoading(false); setShowAddAssetModal(false); setIsNewCategory(false); setAddAssetForm({ name: "", category: "", tag_number: "", total_cost: "", status: "Pending", downpayment_amount: "", downpayment_description: "", reference_number: "", serial_number: "", description: "", quantity: "1", unit_cost: "", purchase_date: new Date().toISOString().split("T")[0], current_company: "HO", location: "", assigned_to: "" }); refreshData(); fetchTransactions(); fetchPendingDownpayments();
  };

  // Function to promote a pending downpayment to asset inventory when fully paid
  const promoteToInventory = async (transaction, totalCost, extraData = {}) => {
    try {
      // Parse the asset details from the transaction description
      let assetDetails;
      try {
        assetDetails = JSON.parse(transaction.description);
      } catch (e) {
        // If not JSON, it's a legacy transaction - use default values
        assetDetails = { name: "Unknown Asset", category: "General", total_cost: totalCost };
      }

      // Use provided tag number or generate one
      let tagNumber = extraData.tag_number;
      if (!tagNumber) {
        const { data: tagData } = await supabase.from("assets").select("tag_number").not("tag_number", "is", null).order("tag_number", { ascending: false });
        let nextNum = 1;
        if (tagData?.length) {
          tagData.forEach((item) => { const match = item.tag_number?.match(/^TAG-(\d+)$/); if (match) { const num = parseInt(match[1], 10); if (num >= nextNum) nextNum = num + 1; } });
        }
        tagNumber = `TAG-${nextNum.toString().padStart(3, "0")}`;
      }

      // Create the asset in inventory
      const assetData = { 
        name: assetDetails.name, 
        category: assetDetails.category || "General", 
        tag_number: tagNumber, 
        total_cost: parseFloat(assetDetails.total_cost) || totalCost, 
        quantity: parseInt(assetDetails.quantity) || 1, 
        unit_cost: parseFloat(assetDetails.unit_cost) || totalCost, 
        salvage_value: 0, 
        useful_life_years: 1, 
        salvage_value: parseFloat(extraData.salvage_value) || 0, 
        useful_life_years: parseInt(extraData.useful_life_years) || 1, 
        status: "Pending", 
        current_company: assetDetails.current_company || "HO", 
        purchase_date: assetDetails.purchase_date || new Date().toISOString().split("T")[0],
        reference_number: assetDetails.reference_number,
        serial_number: assetDetails.serial_number,
        description: assetDetails.asset_description,
        location: assetDetails.location,
        assigned_to: assetDetails.assigned_to
      };
      
      const { data: newAsset, error: assetError } = await supabase.from("assets").insert([assetData]).select();
      if (assetError) { console.error("Error creating asset:", assetError); return null; }

      // Update the transaction to link it to the new asset and mark as not pending
      await supabase.from("downpayment_transactions").update({ 
        asset_id: newAsset[0].id,
        is_pending: false,
        description: assetDetails.description || "Downpayment"
      }).eq("id", transaction.id);

      // Update any other pending transactions for this asset
      const { data: otherTxns } = await supabase.from("downpayment_transactions")
        .select("*")
        .is("asset_id", null)
        .eq("is_pending", true)
        .eq("created_by", transaction.created_by);
      
      if (otherTxns && otherTxns.length > 0) {
        // Update all pending transactions with same description pattern
        for (const txn of otherTxns) {
          let txnDetails;
          try {
            txnDetails = JSON.parse(txn.description);
          } catch (e) { continue; }
          
          if (txnDetails.name === assetDetails.name) {
            await supabase.from("downpayment_transactions").update({ 
              asset_id: newAsset[0].id,
              is_pending: false 
            }).eq("id", txn.id);
          }
        }
      }

      // Log the promotion
      await supabase.from("logs").insert({ 
        user_email: transaction.created_by || "unknown", 
        action_type: "PROMOTE_TO_INVENTORY", 
        details: { asset_name: assetDetails.name, message: `Asset "${assetDetails.name}" promoted to inventory after full payment` } 
      });

      return newAsset[0];
    } catch (error) {
      console.error("Error promoting to inventory:", error);
      return null;
    }
  };

  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault(); if (!selectedAsset) return; setLoading(true);
    
    const newAmount = parseFloat(addTransactionForm.amount) || 0;
    let assetId = selectedAsset.id;
    let isPending = false;
    let description = addTransactionForm.description;

    if (selectedAsset.is_pending_virtual) {
      assetId = null;
      isPending = true;
      try {
        const baseDetails = JSON.parse(selectedAsset.description_template);
        baseDetails.description = addTransactionForm.description;
        description = JSON.stringify(baseDetails);
      } catch (err) {
        description = JSON.stringify({
          name: selectedAsset.name,
          category: selectedAsset.category,
          total_cost: selectedAsset.total_cost,
          description: addTransactionForm.description
        });
      }
    }
    
    const { data: txnData, error: txnError } = await supabase.from("downpayment_transactions").insert([{ 
      asset_id: assetId, 
      amount: newAmount, 
      description: description, 
      transaction_date: addTransactionForm.transaction_date, 
      created_by: userEmail,
      is_pending: isPending 
    }]).select();
    
    if (txnError) { alert("Error: " + txnError.message); setLoading(false); return; }
    
    if (selectedAsset.is_pending_virtual) {
      const totalCost = parseFloat(selectedAsset.total_cost) || 0;
      const { data: relatedTxns } = await supabase.from("downpayment_transactions").select("*").is("asset_id", null).eq("is_pending", true).eq("created_by", selectedAsset.original_created_by || userEmail);
      let totalPaid = 0;
      if (relatedTxns) {
        relatedTxns.forEach(t => { try { const d = JSON.parse(t.description); if (d.name === selectedAsset.name) totalPaid += (parseFloat(t.amount) || 0); } catch (e) {} });
      }
      if (totalPaid >= totalCost && txnData?.[0]) {
        setPromotionData({ transaction: txnData[0], totalCost });
        setShowPromotionModal(true);
        setLoading(false); setShowAddTransactionModal(false); setAddTransactionForm({ amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); fetchTransactions(); fetchPendingDownpayments(); refreshData();
        return;
      }
    } else {
      const currentDownpayment = getTotalDownpayment(selectedAsset);
      const totalCost = parseFloat(selectedAsset.total_cost) || 0;
      if (currentDownpayment + newAmount >= totalCost && !transactions[selectedAsset.id]?.some(t => t.is_pending === false)) {
        refreshData();
      }
    }
    
    setLoading(false); setShowAddTransactionModal(false); setAddTransactionForm({ amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); fetchTransactions(); fetchPendingDownpayments(); refreshData();
  };

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    if (!promotionData) return;
    
    setLoading(true);
    await promoteToInventory(promotionData.transaction, promotionData.totalCost, promotionForm);
    
    setLoading(false);
    setShowPromotionModal(false);
    setPromotionData(null);
    setPromotionForm({ salvage_value: "0", useful_life_years: "5", tag_number: "" });
    
    refreshData(); fetchTransactions(); fetchPendingDownpayments();
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return; setLoading(true);
    await supabase.from("downpayment_transactions").update({ amount: parseFloat(editForm.amount) || 0, description: editForm.description, transaction_date: editForm.transaction_date }).eq("id", selectedTransaction.id);
    setLoading(false); setModalMode(null); setSelectedTransaction(null); fetchTransactions(); refreshData();
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return; setLoading(true);
    await supabase.from("downpayment_transactions").delete().eq("id", selectedTransaction.id);
    setLoading(false); setModalMode(null); setSelectedTransaction(null); fetchTransactions(); fetchPendingDownpayments(); refreshData();
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return; setLoading(true);
    
    if (selectedAsset.is_pending_virtual) {
      const ids = selectedAsset.transactions?.map(t => t.id) || [];
      if (ids.length > 0) {
        await supabase.from("downpayment_transactions").delete().in("id", ids);
      }
    } else {
      // For existing assets, only remove downpayment records and clear downpayment fields
      // The asset remains in inventory
      const assetTransactions = transactions[selectedAsset.id] || [];
      const txnIds = assetTransactions.map(t => t.id);
      
      if (txnIds.length > 0) {
        await supabase.from("downpayment_transactions").delete().in("id", txnIds);
      }
      
      // Clear legacy downpayment info on the asset to remove it from this view
      await supabase.from("assets").update({ downpayment_amount: 0, downpayment_description: null }).eq("id", selectedAsset.id);
    }
    
    setLoading(false); setModalMode(null); setSelectedAsset(null); refreshData(); fetchTransactions();
  };

  const openTransactionModal = (asset, transaction, mode) => { setSelectedAsset(asset); setSelectedTransaction(transaction); setModalMode(mode); if (mode === "edit") setEditForm({ amount: transaction.amount, description: transaction.description, transaction_date: transaction.transaction_date }); };
  const openAddTransaction = (asset) => { setSelectedAsset(asset); setShowAddTransactionModal(true); };
  const closeModal = () => { setSelectedAsset(null); setSelectedTransaction(null); setModalMode(null); };

  // Handle PIN required action - show modal before delete
  const handlePinRequiredAction = (action, type) => {
    setPendingAction({ action, type });
    setPinError("");
    setShowPinModal(true);
  };

  // Handle PIN verification
  const handlePinVerify = async (enteredPin) => {
    try {
      const result = await verifyPin(enteredPin);
      if (!result || !result.success) {
        return result;
      }
      
      const { action, type } = pendingAction;
      
      if (action === "deleteTransaction") {
        await handleDeleteTransaction();
      } else if (action === "deleteAsset") {
        await handleDeleteAsset();
      }
      
      setPendingAction(null);
      setModalMode(null);
      setSelectedAsset(null);
      setSelectedTransaction(null);
      return result;
    } catch (error) {
      console.error("PIN verification error:", error);
      return { success: false, error: error.message || "An error occurred" };
    }
  };

  const renderProgressBar = (percent, isComplete) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percent}%` }} /></div>
      <span className={`text-xs font-semibold min-w-[40px] ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{percent.toFixed(1)}%</span>
    </div>
  );

  // Modal styles matching AddAssetForm
  const modalStyles = `
    .dp-modal-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(17,8,8,0.45); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: overlayIn 0.2s ease both; }
    @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
    .dp-modal-box { font-family: 'DM Sans', sans-serif; background: #ffffff; border-radius: 22px; width: 100%; max-width: 480px; max-height: 92vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(220,38,38,0.15), 0 8px 32px rgba(0,0,0,0.12); border: 1px solid #fde8e8; animation: modalIn 0.28s cubic-bezier(.22,.61,.36,1) both; }
    @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .dp-modal-header { position: sticky; top: 0; z-index: 10; background: #ffffff; padding: 22px 26px 18px; border-bottom: 1px solid #fef0f0; display: flex; align-items: center; justify-content: space-between; }
    .dp-modal-header-left { display: flex; align-items: center; gap: 12px; }
    .dp-modal-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #dc2626, #f43f5e); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(220,38,38,0.3); }
    .dp-modal-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; color: #111827; }
    .dp-modal-subtitle { font-size: 11.5px; color: #9ca3af; margin-top: 1px; }
    .dp-close-btn { width: 32px; height: 32px; border-radius: 9px; border: 1.5px solid #fde8e8; background: #fff5f5; color: #9ca3af; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
    .dp-close-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .dp-modal-body { padding: 22px 26px; }
    .dp-section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: #ef4444; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .dp-section-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, #fecaca, transparent); }
    .dp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    @media (max-width: 480px) { .dp-form-grid { grid-template-columns: 1fr; } }
    .dp-field { display: flex; flex-direction: column; gap: 5px; }
    .dp-field-label { font-size: 11.5px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 5px; }
    .dp-field-label svg { color: #f87171; flex-shrink: 0; }
    .dp-required-dot { width: 4px; height: 4px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
    .dp-field-input { font-family: 'DM Sans', sans-serif; font-size: 13px; color: #111827; background: #fafafa; border: 1.5px solid #f3e8e8; border-radius: 10px; padding: 9px 12px; outline: none; transition: all 0.15s; width: 100%; }
    .dp-field-input:hover { border-color: #fca5a5; background: #fff; }
    .dp-field-input:focus { border-color: #ef4444; background: #fff; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
    .dp-field-input::placeholder { color: #c4b8b8; }
    .dp-cost-preview { background: linear-gradient(135deg, #fff1f1, #fff8f8); border: 1.5px solid #fecaca; border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .dp-cost-item { display: flex; flex-direction: column; gap: 2px; }
    .dp-cost-item-label { font-size: 10.5px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
    .dp-cost-item-value { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #dc2626; }
    .dp-cost-divider { width: 1px; height: 36px; background: #fecaca; flex-shrink: 0; }
    .dp-cost-note { font-size: 11px; color: #fca5a5; font-style: italic; }
    .dp-info-box { background: linear-gradient(135deg, #fff7ed, #fff1f1); border: 1.5px solid #fed7aa; border-radius: 13px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 11px; margin-bottom: 16px; }
    .dp-info-box.danger { background: linear-gradient(135deg, #fef2f2, #fff1f1); border-color: #fecaca; }
    .dp-info-text { font-size: 14px; color: #92400e; line-height: 1.55; }
    .dp-info-box.danger .dp-info-text { color: #991b1b; }
    .dp-modal-footer { padding: 16px 26px 22px; display: flex; gap: 10px; }
    .dp-btn-cancel { flex: 1; font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600; color: #6b7280; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 11px; cursor: pointer; transition: all 0.15s; }
    .dp-btn-cancel:hover { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
    .dp-btn-submit { flex: 2; font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #dc2626, #ef4444); border: none; border-radius: 12px; padding: 11px; cursor: pointer; box-shadow: 0 4px 18px rgba(220,38,38,0.3); transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .dp-btn-submit:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220,38,38,0.38); }
    .dp-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
    .dp-btn-danger { background: linear-gradient(135deg, #991b1b, #dc2626); box-shadow: 0 4px 18px rgba(153,27,27,0.3); }
    .dp-btn-danger:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(153,27,27,0.38); }
  `;

  return (
    <>
      <style>{modalStyles}</style>
      
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
        <ModernSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, tag, category..." className="flex-1 max-w-sm" />
        <div className="flex items-center gap-2">
          <ModernButton variant="secondary" size="sm" icon={Download} onClick={handleExportDownpaymentAssets}>
            Export
          </ModernButton>
          <button className="dash-btn dash-btn-primary" onClick={() => setShowAddAssetModal(true)} style={{ background: '#dc2626' }}>
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      <div className="dash-logs-list">
        <div className="dash-log-header items-center">
  <span></span>
  <span className="text-left">Tag #</span>
  <span className="text-left">Asset Name</span>
  <span className="text-left">Category</span>
  <span className="text-left">Status</span>
  <span className="text-right">Total Cost</span>
  <span className="text-right">Downpayment</span>
  <span className="text-left">Progress</span>
  <span className="text-right">Actions</span>
</div>
{downpaymentAssets.length === 0 && pendingDownpayments.length === 0 ? (
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
                No downpayment assets yet
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new asset with an initial downpayment.
              </p>
              <div className="mt-6">
                <button className="dash-btn dash-btn-primary" onClick={() => setShowAddAssetModal(true)} style={{ background: '#dc2626' }}><Plus size={16} /> Add Asset</button>
              </div>
            </div>
          )) : (
          downpaymentAssets.map((asset) => {
            const paymentPercent = calculatePaymentCompletion(asset);
            const assetTransactions = transactions[asset.id] || [];
            const isExpanded = expandedAssets[asset.id];
            const isComplete = paymentPercent >= 100;
            return (
              <React.Fragment key={asset.id}>
                <div className={`dash-log-row ${isExpanded ? 'expanded' : ''}`}>
                  <span>
                    <button onClick={() => toggleAssetExpansion(asset.id)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </span>
                  <span>
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{asset.tag_number}</span>
                  </span>
                  <span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{asset.name}</span>
                  </span>
                  <span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{asset.category || "—"}</span>
                  </span>
                  <span>
                    <StatusBadge status={isComplete ? "completed" : "pending"} />
                  </span>
                  <span className="text-right">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">₱{parseFloat(asset.total_cost || 0).toLocaleString()}</span>
                  </span>
                  <span className="text-right">
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₱{getTotalDownpayment(asset).toLocaleString()}</span>
                  </span>
                  <span>{renderProgressBar(paymentPercent, isComplete)}</span>
                  <span className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton icon={Plus} label="Add Payment" onClick={() => openAddTransaction(asset)} />
                      <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedAsset(asset); handlePinRequiredAction("deleteAsset"); }} />
                    </div>
                  </span>
                </div>
                {isExpanded && (
                  <div className="dash-expanded-row">
                    <div className="dash-expanded-content">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-gray-500 dark:text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction History</span>
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{assetTransactions.length}</span>
                        </div>
                        <ModernButton variant="secondary" size="sm" icon={Plus} onClick={() => openAddTransaction(asset)}>Add Payment</ModernButton>
                      </div>
                      {assetTransactions.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">No transactions yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {assetTransactions.map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                  <Calendar size={12} />
                                  {new Date(txn.transaction_date).toLocaleDateString()}
                                </div>
                                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₱{parseFloat(txn.amount || 0).toLocaleString()}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs" title={txn.description}>{txn.description || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ActionButton icon={Edit} label="Edit" onClick={() => openTransactionModal(asset, txn, "edit")} />
                                <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedTransaction(txn); handlePinRequiredAction("deleteTransaction"); }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}

        {/* Render Pending Downpayments (not yet in inventory) */}
        {pendingDownpayments.length > 0 && (
          <>
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-y border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Pending (Awaiting Full Payment)
              </p>
            </div>
            {pendingDownpayments.map((pendingGroup) => {
              const totalCost = pendingGroup.total_cost;
              const totalPaid = pendingGroup.total_paid;
              const paymentPercent = totalCost > 0 ? Math.min((totalPaid / totalCost) * 100, 100) : 0;
              const isComplete = paymentPercent >= 100;
              const isExpanded = expandedAssets[pendingGroup.id];
              
              // pendingGroup is already formatted correctly for use as selectedAsset
              
              return (
                <React.Fragment key={pendingGroup.id}>
                  <div className={`dash-log-row ${isExpanded ? 'expanded' : ''}`}>
                    <span>
                      <button onClick={() => toggleAssetExpansion(pendingGroup.id)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </span>
                    <span>
                      <span className="font-mono text-sm font-semibold text-gray-400 dark:text-gray-500">PENDING</span>
                    </span>
                    <span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{pendingGroup.name || "Unknown"}</span>
                    </span>
                    <span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{pendingGroup.category || "—"}</span>
                    </span>
                    <span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        Pending
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">₱{totalCost.toLocaleString()}</span>
                    </span>
                    <span className="text-right">
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">₱{totalPaid.toLocaleString()}</span>
                    </span>
                    <span>{renderProgressBar(paymentPercent, isComplete)}</span>
                    <span className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton icon={Plus} label="Add Payment" onClick={() => openAddTransaction(pendingGroup)} />
                        <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedAsset(pendingGroup); handlePinRequiredAction("deleteAsset"); }} />
                      </div>
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="dash-expanded-row">
                      <div className="dash-expanded-content">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Receipt size={14} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction History</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {pendingGroup.transactions.map((txn) => {
                            let txnDesc = "";
                            try { txnDesc = JSON.parse(txn.description).description; } catch(e){}
                            return (
                              <div key={txn.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar size={12} />
                                    {new Date(txn.transaction_date).toLocaleDateString()}
                                  </div>
                                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₱{parseFloat(txn.amount || 0).toLocaleString()}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs" title={txnDesc}>{txnDesc || "—"}</span>
                                </div>
                                <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedTransaction(txn); handlePinRequiredAction("deleteTransaction"); }} />
                              </div>
                            );
                          })}
                        </div>
                        {paymentPercent < 100 ? (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              <strong>Note:</strong> This asset will be added to inventory once total payments reach ₱{totalCost.toLocaleString()}.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                              <strong>Ready:</strong> Fully paid. Confirm details to add to inventory.
                            </p>
                            <button
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded shadow hover:bg-emerald-700 transition-colors"
                              onClick={() => {
                                setPromotionData({ transaction: pendingGroup.transactions[0], totalCost: pendingGroup.total_cost });
                                setShowPromotionModal(true);
                              }}
                            >
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddAssetModal && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddAssetModal(false)}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon"><Package size={18} color="#fff" strokeWidth={2.2} /></div>
                <div><p className="dp-modal-title">Add Downpayment Asset</p><p className="dp-modal-subtitle">Fill in the details below</p></div>
              </div>
              <button className="dp-close-btn" onClick={() => setShowAddAssetModal(false)}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <form onSubmit={handleAddAssetSubmit}>
              <div className="dp-modal-body">
                <p className="dp-section-label">Basic Information</p>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><Package size={12} /> Asset Name <span className="dp-required-dot" /></label>
                    <input required type="text" value={addAssetForm.name} onChange={(e) => setAddAssetForm({ ...addAssetForm, name: e.target.value })} className="dp-field-input" placeholder="e.g. Office Equipment" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><Layers size={12} /> Category</label>
                    {isNewCategory ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={addAssetForm.category}
                          onChange={(e) => setAddAssetForm({ ...addAssetForm, category: e.target.value })}
                          className="dp-field-input"
                          placeholder="Enter new category"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="dp-close-btn"
                          onClick={() => { setIsNewCategory(false); setAddAssetForm({ ...addAssetForm, category: "" }); }}
                          style={{ height: "auto", width: "42px" }}
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={addAssetForm.category}
                        onChange={(e) => { if (e.target.value === "___NEW___") { setIsNewCategory(true); setAddAssetForm({ ...addAssetForm, category: "" }); } else { setAddAssetForm({ ...addAssetForm, category: e.target.value }); } }}
                        className="dp-field-input"
                      >
                        <option value="" disabled>Select category...</option>
                        {uniqueCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                        <option value="___NEW___" style={{ fontWeight: "bold", color: "#dc2626" }}>+ Add New Category</option>
                      </select>
                    )}
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><FileText size={12} /> Reference / Invoice #</label>
                    <input type="text" value={addAssetForm.reference_number} onChange={(e) => setAddAssetForm({ ...addAssetForm, reference_number: e.target.value })} className="dp-field-input" placeholder="e.g. INV-2024-001" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><Hash size={12} /> Serial Number</label>
                    <input type="text" value={addAssetForm.serial_number} onChange={(e) => setAddAssetForm({ ...addAssetForm, serial_number: e.target.value })} className="dp-field-input" placeholder="e.g. SN12345678" />
                  </div>
                </div>
                <div className="dp-field" style={{ marginBottom: '16px' }}>
                  <label className="dp-field-label"><FileText size={12} /> Asset Description</label>
                  <input type="text" value={addAssetForm.description} onChange={(e) => setAddAssetForm({ ...addAssetForm, description: e.target.value })} className="dp-field-input" placeholder="Detailed description of the asset..." />
                </div>
                <p className="dp-section-label">Valuation</p>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><Hash size={12} /> Quantity</label>
                    <input type="number" min="1" value={addAssetForm.quantity} onChange={(e) => {
                      const qty = e.target.value;
                      const cost = addAssetForm.unit_cost;
                      setAddAssetForm({ ...addAssetForm, quantity: qty, total_cost: (parseFloat(qty || 0) * parseFloat(cost || 0)).toFixed(2) });
                    }} className="dp-field-input" placeholder="1" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Unit Cost (₱)</label>
                    <input type="number" step="0.01" value={addAssetForm.unit_cost} onChange={(e) => {
                      const cost = e.target.value;
                      const qty = addAssetForm.quantity;
                      setAddAssetForm({ ...addAssetForm, unit_cost: cost, total_cost: (parseFloat(qty || 0) * parseFloat(cost || 0)).toFixed(2) });
                    }} className="dp-field-input" placeholder="0.00" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Total Cost (₱) <span className="dp-required-dot" /></label>
                    <input required type="number" step="0.01" value={addAssetForm.total_cost} onChange={(e) => setAddAssetForm({ ...addAssetForm, total_cost: e.target.value })} className="dp-field-input" placeholder="0.00" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Initial Downpayment (₱)</label>
                    <input type="number" step="0.01" value={addAssetForm.downpayment_amount} onChange={(e) => setAddAssetForm({ ...addAssetForm, downpayment_amount: e.target.value })} className="dp-field-input" placeholder="Optional" />
                  </div>
                </div>
                <p className="dp-section-label">Logistics</p>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><Calendar size={12} /> Purchase Date</label>
                    <input type="date" value={addAssetForm.purchase_date} onChange={(e) => setAddAssetForm({ ...addAssetForm, purchase_date: e.target.value })} className="dp-field-input" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><Building2 size={12} /> LOB</label>
                    <select value={addAssetForm.current_company} onChange={(e) => setAddAssetForm({ ...addAssetForm, current_company: e.target.value })} className="dp-field-input"><option value="HO">HO</option><option value="CY Caloocan">CY Caloocan</option><option value="CY Bustos">CY Bustos</option><option value="Chassis Leasing">Chassis Leasing</option><option value="Reefer">Reefer</option><option value="Trucking">Trucking</option><option value="Technical Service">Technical Service</option><option value="Outports">Outports</option><option value="CY Valenzuela">CY Valenzuela</option></select>
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><MapPin size={12} /> Location</label>
                    <input type="text" value={addAssetForm.location} onChange={(e) => setAddAssetForm({ ...addAssetForm, location: e.target.value })} className="dp-field-input" placeholder="e.g. Building A" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><User size={12} /> Assigned To</label>
                    <input type="text" value={addAssetForm.assigned_to} onChange={(e) => setAddAssetForm({ ...addAssetForm, assigned_to: e.target.value })} className="dp-field-input" placeholder="Employee Name" />
                  </div>
                </div>
                <div className="dp-field">
                  <label className="dp-field-label"><FileText size={12} /> Payment Description</label>
                  <input type="text" value={addAssetForm.downpayment_description || ""} onChange={(e) => setAddAssetForm({ ...addAssetForm, downpayment_description: e.target.value })} className="dp-field-input" placeholder="Describe payment terms..." />
                </div>
                <div className="dp-info-box">
                  <p className="dp-info-text"><strong>Note:</strong> The asset will NOT be added to the inventory until it is fully paid. Continue adding payments until the progress reaches 100%.</p>
                </div>
              </div>
              <div className="dp-modal-footer">
                <button type="button" className="dp-btn-cancel" onClick={() => setShowAddAssetModal(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="dp-btn-submit">{loading ? "Saving..." : <>Save Downpayment</>}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && selectedAsset && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddTransactionModal(false)}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon"><span style={{ fontWeight: "800", fontSize: "20px", color: "#fff" }}>₱</span></div>
                <div><p className="dp-modal-title">Add Payment</p><p className="dp-modal-subtitle">Record a downpayment</p></div>
              </div>
              <button className="dp-close-btn" onClick={() => setShowAddTransactionModal(false)}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <form onSubmit={handleAddTransactionSubmit}>
              <div className="dp-modal-body">
                <div className="dp-info-box">
                  <p className="dp-info-text">Adding payment for: <strong>{selectedAsset.name}</strong><br/>Total: ₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString()}</p>
                </div>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><Calendar size={12} /> Payment Date <span className="dp-required-dot" /></label>
                    <input required type="date" value={addTransactionForm.transaction_date} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, transaction_date: e.target.value })} className="dp-field-input" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Amount (₱) <span className="dp-required-dot" /></label>
                    <input required type="number" step="0.01" value={addTransactionForm.amount} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, amount: e.target.value })} className="dp-field-input" placeholder="0.00" />
                  </div>
                </div>
                <div className="dp-field">
                  <label className="dp-field-label"><FileText size={12} /> Description</label>
                  <input type="text" value={addTransactionForm.description} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, description: e.target.value })} className="dp-field-input" placeholder="e.g. 1st installment, deposit..." />
                </div>
              </div>
              <div className="dp-modal-footer">
                <button type="button" className="dp-btn-cancel" onClick={() => setShowAddTransactionModal(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="dp-btn-submit">{loading ? "Saving..." : "Add Payment"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Transaction Modal */}
      {modalMode === "edit" && selectedTransaction && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon"><Edit size={18} color="#fff" strokeWidth={2.2} /></div>
                <div><p className="dp-modal-title">Edit Payment</p></div>
              </div>
              <button className="dp-close-btn" onClick={closeModal}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-form-grid">
                <div className="dp-field">
                  <label className="dp-field-label"><Calendar size={12} /> Payment Date</label>
                  <input type="date" value={editForm.transaction_date} onChange={(e) => setEditForm({ ...editForm, transaction_date: e.target.value })} className="dp-field-input" />
                </div>
                <div className="dp-field">
                  <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Amount (₱)</label>
                  <input type="number" step="0.01" value={editForm.amount || ""} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="dp-field-input" />
                </div>
              </div>
              <div className="dp-field">
                <label className="dp-field-label"><FileText size={12} /> Description</label>
                <input type="text" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="dp-field-input" />
              </div>
            </div>
            <div className="dp-modal-footer">
              <button className="dp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button onClick={handleUpdateTransaction} disabled={loading} className="dp-btn-submit">{loading ? "Saving..." : "Update"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Transaction Modal */}
      {modalMode === "delete" && selectedTransaction && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon" style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)' }}><Trash2 size={18} color="#fff" strokeWidth={2.2} /></div>
                <div><p className="dp-modal-title">Delete Payment</p></div>
              </div>
              <button className="dp-close-btn" onClick={closeModal}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-info-box danger">
<p className="dp-info-text">Delete payment of <strong>₱{parseFloat(selectedTransaction.amount || 0).toLocaleString()}</strong>?<br/>{(() => {
                  try {
                    const details = JSON.parse(selectedTransaction.description);
                    return <span>Asset: <strong>{details.name || 'Unknown'}</strong> (Total: ₱{parseFloat(details.total_cost || 0).toLocaleString()})</span>;
                  } catch (e) {
                    return selectedTransaction.description && <span>"{selectedTransaction.description}"</span>;
                  }
                })()}<br/><br/>This action cannot be undone.</p>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button className="dp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button onClick={handleDeleteTransaction} disabled={loading} className="dp-btn-submit dp-btn-danger">{loading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Asset Modal */}
      {modalMode === "deleteAsset" && selectedAsset && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon" style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)' }}><Trash2 size={18} color="#fff" strokeWidth={2.2} /></div>
                <div><p className="dp-modal-title">{selectedAsset.is_pending_virtual ? "Delete Pending Asset" : "Remove from Downpayments"}</p></div>
              </div>
              <button className="dp-close-btn" onClick={closeModal}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-info-box danger">
                {selectedAsset.is_pending_virtual ? (
                  <p className="dp-info-text">Delete pending asset <strong>{selectedAsset.name}</strong> and all its transactions?<br/><br/>This action cannot be undone.</p>
                ) : (
                  <p className="dp-info-text">Remove downpayment records for <strong>{selectedAsset.name}</strong>?<br/><br/>The asset will remain in the inventory, but all payment history will be deleted.</p>
                )}
              </div>
            </div>
            <div className="dp-modal-footer">
              <button className="dp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button onClick={handleDeleteAsset} disabled={loading} className="dp-btn-submit dp-btn-danger">{loading ? "Processing..." : (selectedAsset.is_pending_virtual ? "Delete Asset" : "Remove Records")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Promotion Modal */}
      {showPromotionModal && createPortal(
        <div className="dp-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPromotionModal(false)}>
          <div className="dp-modal-box">
            <div className="dp-modal-header">
              <div className="dp-modal-header-left">
                <div className="dp-modal-icon" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}><CheckCircle2 size={18} color="#fff" strokeWidth={2.2} /></div>
                <div><p className="dp-modal-title">Fully Paid!</p><p className="dp-modal-subtitle">Set asset parameters to finalize inventory</p></div>
              </div>
              <button className="dp-close-btn" onClick={() => setShowPromotionModal(false)}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <form onSubmit={handlePromotionSubmit}>
              <div className="dp-modal-body">
                <div className="dp-info-box">
                  <p className="dp-info-text">The asset is now 100% paid. Please provide the final details to move it to the Asset Inventory.</p>
                </div>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><Tag size={12} /> Tag Number <span className="dp-required-dot" /></label>
                    <input required type="text" value={promotionForm.tag_number} readOnly className="dp-field-input" style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} />
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Auto-generated</p>
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f87171' }}>₱</span> Salvage Value (₱)</label>
                    <input type="number" step="0.01" value={promotionForm.salvage_value} onChange={(e) => setPromotionForm({...promotionForm, salvage_value: e.target.value})} className="dp-field-input" placeholder="0.00" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><Clock size={12} /> Useful Life (Years) <span className="dp-required-dot" /></label>
                    <input required type="number" min="1" step="1" value={promotionForm.useful_life_years} onChange={(e) => setPromotionForm({...promotionForm, useful_life_years: e.target.value})} className="dp-field-input" placeholder="e.g. 5" />
                  </div>
                </div>
              </div>
              <div className="dp-modal-footer">
                <button type="button" className="dp-btn-cancel" onClick={() => setShowPromotionModal(false)}>Later</button>
                <button type="submit" disabled={loading} className="dp-btn-submit" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>{loading ? "Finalizing..." : "Confirm & Add to Inventory"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PIN Verification Modal */}
      {showPinModal && createPortal(
        <PinVerificationModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
            setPinError("");
          }}
          onVerify={handlePinVerify}
          title="Security Verification"
          subtitle="Enter your 4-digit PIN to proceed"
          error={pinError}
          clearError={() => setPinError("")}
        />,
        document.body
      )}
    </>
  );
};

export default DownpaymentTable;
