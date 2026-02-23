import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import {
  Eye,
  Edit,
  Trash2,
  X,
  Plus,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Receipt,
} from "lucide-react";

const DownpaymentTable = ({ assets, userRole, userEmail, refreshData }) => {
  const [transactions, setTransactions] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [expandedAssets, setExpandedAssets] = useState({});
  const [modalMode, setModalMode] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [addAssetForm, setAddAssetForm] = useState({
    name: "",
    category: "",
    tag_number: "",
    total_cost: 0,
    status: "Pending",
  });
  const [addTransactionForm, setAddTransactionForm] = useState({
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch transactions from the new table
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("downpayment_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    // Group transactions by asset_id
    const grouped = {};
    data.forEach((txn) => {
      if (!grouped[txn.asset_id]) {
        grouped[txn.asset_id] = [];
      }
      grouped[txn.asset_id].push(txn);
    });
    setTransactions(grouped);
  };

  // Listen for open add modal event from parent
  useEffect(() => {
    const handleOpenAdd = () => setShowAddAssetModal(true);
    window.addEventListener('openAddDownpayment', handleOpenAdd);
    return () => window.removeEventListener('openAddDownpayment', handleOpenAdd);
  }, []);

  // Filter assets that have transactions OR have legacy downpayment data
  const downpaymentAssets = assets.filter((asset) => {
    const assetTransactions = transactions[asset.id] || [];
    const hasTransactions = assetTransactions.length > 0;
    const hasLegacyDownpayment = parseFloat(asset.downpayment_amount) > 0;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      asset.name?.toLowerCase().includes(query) ||
      asset.tag_number?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query);
    return (hasTransactions || hasLegacyDownpayment) && matchesSearch;
  });

  // Calculate total downpayment for an asset (from transactions + legacy)
  const getTotalDownpayment = (asset) => {
    const assetTransactions = transactions[asset.id] || [];
    const txnTotal = assetTransactions.reduce(
      (sum, txn) => sum + (parseFloat(txn.amount) || 0),
      0
    );
    const legacyTotal = parseFloat(asset.downpayment_amount) || 0;
    return txnTotal + legacyTotal;
  };

  const calculatePaymentCompletion = (asset) => {
    const totalCost = parseFloat(asset.total_cost) || 0;
    const downpayment = getTotalDownpayment(asset);
    if (totalCost === 0) return 0;
    return Math.min((downpayment / totalCost) * 100, 100);
  };

  // Toggle asset expansion to show transactions
  const toggleAssetExpansion = (assetId) => {
    setExpandedAssets((prev) => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  };

  // Handle adding a new asset (with initial downpayment)
  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const totalCost = parseFloat(addAssetForm.total_cost) || 0;

    const assetData = {
      name: addAssetForm.name,
      category: addAssetForm.category || "General",
      tag_number: addAssetForm.tag_number,
      total_cost: totalCost,
      downpayment_amount: 0, // Will be managed through transactions
      downpayment_description: "",
      quantity: 1,
      unit_cost: totalCost,
      salvage_value: 0,
      useful_life_years: 1,
      status: "Pending",
      current_company: "HQ",
      purchase_date: new Date().toISOString().split("T")[0],
    };

    const { data: assetDataResult, error } = await supabase
      .from("assets")
      .insert([assetData])
      .select();

    if (error) {
      alert("Error adding asset: " + error.message);
      setLoading(false);
      return;
    }

    // If there's an initial downpayment amount, create a transaction
    const initialAmount = parseFloat(addAssetForm.downpayment_amount || 0);
    if (initialAmount > 0 && assetDataResult && assetDataResult[0]) {
      await supabase.from("downpayment_transactions").insert([
        {
          asset_id: assetDataResult[0].id,
          amount: initialAmount,
          description: addAssetForm.downpayment_description || "Initial downpayment",
          transaction_date: new Date().toISOString().split("T")[0],
          created_by: userEmail,
        },
      ]);
    }

    setLoading(false);
    setShowAddAssetModal(false);
    setAddAssetForm({
      name: "",
      category: "",
      tag_number: "",
      total_cost: 0,
      status: "Pending",
    });
    refreshData();
    fetchTransactions();
  };

  // Handle adding a new transaction to an existing asset
  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setLoading(true);

    const { error } = await supabase
      .from("downpayment_transactions")
      .insert([
        {
          asset_id: selectedAsset.id,
          amount: parseFloat(addTransactionForm.amount) || 0,
          description: addTransactionForm.description,
          transaction_date: addTransactionForm.transaction_date,
          created_by: userEmail,
        },
      ]);

    if (error) {
      alert("Error adding transaction: " + error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowAddTransactionModal(false);
    setAddTransactionForm({
      amount: "",
      description: "",
      transaction_date: new Date().toISOString().split("T")[0],
    });
    fetchTransactions();
    refreshData();
  };

  // Handle updating a transaction
  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return;
    setLoading(true);

    const { error } = await supabase
      .from("downpayment_transactions")
      .update({
        amount: parseFloat(editForm.amount) || 0,
        description: editForm.description,
        transaction_date: editForm.transaction_date,
      })
      .eq("id", selectedTransaction.id);

    if (error) {
      alert("Error updating transaction: " + error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setModalMode(null);
    setSelectedTransaction(null);
    fetchTransactions();
    refreshData();
  };

  // Handle deleting a transaction
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    setLoading(true);
    const { error } = await supabase
      .from("downpayment_transactions")
      .delete()
      .eq("id", selectedTransaction.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setModalMode(null);
    setSelectedTransaction(null);
    fetchTransactions();
    refreshData();
  };

  // Handle deleting an asset and all its transactions
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    if (!confirm(`Are you sure you want to delete the asset "${selectedAsset.name}" and all its transactions? This action cannot be undone.`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", selectedAsset.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setModalMode(null);
    setSelectedAsset(null);
    refreshData();
    fetchTransactions();
  };

  // Open modal for editing a transaction
  const openTransactionModal = (asset, transaction, mode) => {
    setSelectedAsset(asset);
    setSelectedTransaction(transaction);
    setModalMode(mode);
    if (mode === "edit") {
      setEditForm({
        amount: transaction.amount,
        description: transaction.description,
        transaction_date: transaction.transaction_date,
      });
    }
  };

  // Open modal for adding transaction to an asset
  const openAddTransaction = (asset) => {
    setSelectedAsset(asset);
    setShowAddTransactionModal(true);
  };

  const closeModal = () => {
    setSelectedAsset(null);
    setSelectedTransaction(null);
    setModalMode(null);
  };

  return (
    <>
      <style>{`
        .dp-search-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #fde8e8;
        }
        .dp-search-input-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }
        .dp-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .dp-search-input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          border: 1.5px solid #f3e8e8;
          border-radius: 10px;
          outline: none;
        }
        .dp-search-input:focus {
          border-color: #ef4444;
          background: #fff;
        }
        .dp-add-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .dp-add-btn:hover {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
        }

        .dp-table-wrap {
          background: #fff;
          overflow: hidden;
        }
        .dp-scroll {
          overflow-x: auto;
        }
        .dp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        .dp-thead th {
          background: #fff7f7;
          padding: 13px 22px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ef4444;
          text-align: left;
          border-bottom: 1px solid #fde8e8;
          white-space: nowrap;
        }
        .dp-row {
          border-bottom: 1px solid #fff1f1;
          transition: background 0.12s;
        }
        .dp-row:hover {
          background: #fff8f8;
        }
        .dp-td {
          padding: 15px 22px;
          font-size: 14px;
          color: #374151;
          white-space: nowrap;
          vertical-align: middle;
        }
        .dp-tag {
          font-weight: 700;
          color: #111827;
          font-family: monospace;
        }
        .dp-name {
          font-weight: 500;
          color: #1f2937;
        }
        .dp-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 4px 11px;
          border-radius: 99px;
          border: 1px solid;
        }
        .dp-status-pending {
          background: #fef3c7;
          color: #d97706;
          border-color: #fde68a;
        }
        .dp-status-active {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        .dp-progress-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }
        .dp-progress-text {
          font-size: 13px;
          font-weight: 600;
        }
        .dp-progress-bar {
          width: 100px;
          height: 6px;
          background: #f3e8e8;
          border-radius: 3px;
          overflow: hidden;
        }
        .dp-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .dp-progress-fill.pending {
          background: #f59e0b;
        }
        .dp-progress-fill.complete {
          background: #16a34a;
        }
        .dp-amount {
          font-weight: 600;
          color: #111827;
        }
        .dp-desc {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #6b7280;
          font-size: 13px;
        }
        .dp-empty {
          padding: 64px 24px;
          text-align: center;
          color: #d1d5db;
          font-size: 15px;
        }

        .dp-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid transparent;
          cursor: pointer;
          background: transparent;
          transition: all 0.13s;
          margin-left: 4px;
        }
        .dp-action-btn:first-child {
          margin-left: 0;
        }
        .dp-btn-edit {
          color: #6366f1;
        }
        .dp-btn-edit:hover {
          background: #eef2ff;
          border-color: #c7d2fe;
        }
        .dp-btn-delete {
          color: #dc2626;
        }
        .dp-btn-delete:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .dp-btn-view {
          color: #0891b2;
        }
        .dp-btn-view:hover {
          background: #ecfeff;
          border-color: #a5f3fc;
        }
        .dp-btn-add {
          color: #16a34a;
        }
        .dp-btn-add:hover {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        /* Expandable row styles */
        .dp-expand-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          background: #fff;
          transition: all 0.13s;
          margin-right: 8px;
        }
        .dp-expand-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        /* Transaction list styles */
        .dp-transactions-container {
          background: #fafafa;
          border-bottom: 1px solid #fde8e8;
        }
        .dp-transactions-list {
          padding: 0 22px 16px 70px;
        }
        .dp-txn-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          margin-bottom: 8px;
        }
        .dp-txn-title {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dp-txn-count {
          background: #e5e7eb;
          color: #374151;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .dp-txn-add-btn {
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .dp-txn-add-btn:hover {
          background: #dcfce7;
        }
        .dp-txn-item {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr 1fr;
          gap: 16px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 8px;
          align-items: center;
        }
        .dp-txn-item:last-child {
          margin-bottom: 0;
        }
        .dp-txn-date {
          font-size: 13px;
          color: #6b7280;
          font-family: monospace;
        }
        .dp-txn-amount {
          font-weight: 600;
          color: #059669;
        }
        .dp-txn-desc {
          font-size: 13px;
          color: #374151;
        }
        .dp-txn-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }
        .dp-txn-action-btn {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          cursor: pointer;
          background: transparent;
          transition: all 0.13s;
        }
        .dp-txn-action-edit {
          color: #6366f1;
        }
        .dp-txn-action-edit:hover {
          background: #eef2ff;
          border-color: #c7d2fe;
        }
        .dp-txn-action-delete {
          color: #dc2626;
        }
        .dp-txn-action-delete:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .dp-txn-empty {
          padding: 16px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
          background: #fff;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
        }

        /* Modal Styles */
        .dp-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 5, 5, 0.48);
          backdrop-filter: blur(7px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .dp-modal {
          font-family: 'DM Sans', sans-serif;
          background: #ffffff;
          border-radius: 22px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 32px 96px rgba(220,38,38,0.16);
          border: 1px solid #fde8e8;
        }
        .dp-modal-header {
          padding: 22px 26px 18px;
          border-bottom: 1px solid #fef0f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dp-modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: #111827;
        }
        .dp-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1.5px solid #fde8e8;
          background: #fff5f5;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dp-modal-close:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .dp-modal-body {
          padding: 22px 26px;
          max-height: 60vh;
          overflow-y: auto;
        }
        .dp-modal-footer {
          padding: 16px 26px 22px;
          display: flex;
          gap: 10px;
          border-top: 1px solid #fef0f0;
        }
        .dp-form-group {
          margin-bottom: 16px;
        }
        .dp-form-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
        }
        .dp-form-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          border: 1.5px solid #f3e8e8;
          border-radius: 10px;
          padding: 10px 13px;
          width: 100%;
          outline: none;
        }
        .dp-form-input:focus {
          border-color: #ef4444;
          background: #fff;
        }
        .dp-form-textarea {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          border: 1.5px solid #f3e8e8;
          border-radius: 10px;
          padding: 10px 13px;
          width: 100%;
          outline: none;
          min-height: 80px;
          resize: vertical;
        }
        .dp-form-textarea:focus {
          border-color: #ef4444;
          background: #fff;
        }
        .dp-btn-cancel {
          flex: 1;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 11px;
          padding: 11px;
          cursor: pointer;
        }
        .dp-btn-submit {
          flex: 2;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          border: none;
          border-radius: 11px;
          padding: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .dp-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .dp-info-box {
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dp-info-box.pending {
          background: #fef3c7;
        }
      `}</style>

      {/* Toolbar */}
      <div className="dp-search-bar">
        <div className="dp-search-input-wrapper">
          <Eye className="dp-search-icon" size={18} />
          <input
            type="text"
            className="dp-search-input"
            placeholder="Search by name, tag, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="dp-add-btn"
          onClick={() => setShowAddAssetModal(true)}
        >
          <Plus size={16} /> Add Downpayment Asset
        </button>
      </div>

      {/* Table */}
      <div className="dp-table-wrap">
        <div className="dp-scroll">
          <table className="dp-table">
            <thead className="dp-thead">
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Tag #</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Total Cost</th>
                <th>Total Downpayment</th>
                <th>Payment Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {downpaymentAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dp-empty">
                    {searchQuery
                      ? "No downpayment assets match your search."
                      : "No downpayment assets found. Click 'Add Downpayment Asset' to get started."}
                  </td>
                </tr>
              ) : (
                downpaymentAssets.map((asset) => {
                  const paymentPercent = calculatePaymentCompletion(asset);
                  const assetTransactions = transactions[asset.id] || [];
                  const isExpanded = expandedAssets[asset.id];

                  return (
                    <React.Fragment key={asset.id}>
                      <tr className="dp-row">
                        <td className="dp-td">
                          <button
                            className="dp-expand-btn"
                            onClick={() => toggleAssetExpansion(asset.id)}
                            title={isExpanded ? "Hide transactions" : "View transactions"}
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </td>
                        <td className="dp-td">
                          <span className="dp-tag">{asset.tag_number}</span>
                        </td>
                        <td className="dp-td">
                          <span className="dp-name">{asset.name}</span>
                        </td>
                        <td className="dp-td" style={{ color: "#6b7280" }}>
                          {asset.category || "—"}
                        </td>
                        <td className="dp-td">
                          <span
                            className={`dp-status ${
                              paymentPercent >= 100
                                ? "dp-status-active"
                                : "dp-status-pending"
                            }`}
                          >
                            {paymentPercent >= 100 ? "Completed" : "Pending"}
                          </span>
                        </td>
                        <td className="dp-td">
                          <span className="dp-amount">
                            ₱{parseFloat(asset.total_cost || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="dp-td">
                          <span className="dp-amount" style={{ color: "#059669" }}>
                            ₱{getTotalDownpayment(asset).toLocaleString()}
                          </span>
                        </td>
                        <td className="dp-td">
                          <div className="dp-progress-cell">
                            <span
                              className="dp-progress-text"
                              style={{
                                color: paymentPercent >= 100 ? "#16a34a" : "#d97706",
                              }}
                            >
                              {paymentPercent.toFixed(1)}%
                            </span>
                            <div className="dp-progress-bar">
                              <div
                                className={`dp-progress-fill ${
                                  paymentPercent >= 100 ? "complete" : "pending"
                                }`}
                                style={{ width: `${paymentPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="dp-td">
                          <button
                            className="dp-action-btn dp-btn-add"
                            title="Add Transaction"
                            onClick={() => openAddTransaction(asset)}
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            className="dp-action-btn dp-btn-delete"
                            title="Delete Asset"
                            onClick={() => {
                              setSelectedAsset(asset);
                              setModalMode("deleteAsset");
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="dp-transactions-container">
                          <td colSpan={9} className="dp-td" style={{ padding: 0 }}>
                            <div className="dp-transactions-list">
                              <div className="dp-txn-header">
                                <div className="dp-txn-title">
                                  <Receipt size={14} />
                                  Transaction History
                                  <span className="dp-txn-count">
                                    {assetTransactions.length} payment(s)
                                  </span>
                                </div>
                                <button
                                  className="dp-txn-add-btn"
                                  onClick={() => openAddTransaction(asset)}
                                >
                                  <Plus size={14} /> Add Payment
                                </button>
                              </div>
                              {assetTransactions.length === 0 ? (
                                <div className="dp-txn-empty">
                                  No transactions yet. Click "Add Payment" to record a downpayment.
                                </div>
                              ) : (
                                assetTransactions.map((txn) => (
                                  <div key={txn.id} className="dp-txn-item">
                                    <div className="dp-txn-date">
                                      <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                      {new Date(txn.transaction_date).toLocaleDateString()}
                                    </div>
                                    <div className="dp-txn-amount">
                                      ₱{parseFloat(txn.amount || 0).toLocaleString()}
                                    </div>
                                    <div className="dp-txn-desc" title={txn.description}>
                                      {txn.description || "—"}
                                    </div>
                                    <div className="dp-txn-actions">
                                      <button
                                        className="dp-txn-action-btn dp-txn-action-edit"
                                        title="Edit"
                                        onClick={() => openTransactionModal(asset, txn, "edit")}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        className="dp-txn-action-btn dp-txn-action-delete"
                                        title="Delete"
                                        onClick={() => openTransactionModal(asset, txn, "delete")}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddAssetModal &&
        createPortal(
          <div
            className="dp-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowAddAssetModal(false)}
          >
            <div className="dp-modal">
              <div className="dp-modal-header">
                <h3 className="dp-modal-title">Add Downpayment Asset</h3>
                <button
                  className="dp-modal-close"
                  onClick={() => setShowAddAssetModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddAssetSubmit}>
                <div className="dp-modal-body">
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      <FileText size={13} /> Asset Name *
                    </label>
                    <input
                      required
                      type="text"
                      className="dp-form-input"
                      value={addAssetForm.name}
                      onChange={(e) =>
                        setAddAssetForm({ ...addAssetForm, name: e.target.value })
                      }
                      placeholder="e.g. Office Equipment"
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      <FileText size={13} /> Tag Number *
                    </label>
                    <input
                      required
                      type="text"
                      className="dp-form-input"
                      value={addAssetForm.tag_number}
                      onChange={(e) =>
                        setAddAssetForm({ ...addAssetForm, tag_number: e.target.value })
                      }
                      placeholder="e.g. TAG-001"
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      ₱ Total Cost *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="dp-form-input"
                      value={addAssetForm.total_cost}
                      onChange={(e) =>
                        setAddAssetForm({
                          ...addAssetForm,
                          total_cost: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      ₱ Initial Downpayment 
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="dp-form-input"
                      value={addAssetForm.downpayment_amount || ""}
                      onChange={(e) =>
                        setAddAssetForm({
                          ...addAssetForm,
                          downpayment_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter initial downpayment (optional)"
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      <FileText size={13} /> Initial Payment Description
                    </label>
                    <textarea
                      className="dp-form-textarea"
                      value={addAssetForm.downpayment_description || ""}
                      onChange={(e) =>
                        setAddAssetForm({
                          ...addAssetForm,
                          downpayment_description: e.target.value,
                        })
                      }
                      placeholder="Describe the initial payment terms, installment plan, etc."
                    />
                  </div>
                </div>
                <div className="dp-modal-footer">
                  <button
                    type="button"
                    className="dp-btn-cancel"
                    onClick={() => setShowAddAssetModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="dp-btn-submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal &&
        selectedAsset &&
        createPortal(
          <div
            className="dp-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowAddTransactionModal(false)}
          >
            <div className="dp-modal">
              <div className="dp-modal-header">
                <h3 className="dp-modal-title">Add Payment Transaction</h3>
                <button
                  className="dp-modal-close"
                  onClick={() => setShowAddTransactionModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddTransactionSubmit}>
                <div className="dp-modal-body">
                  <div className="dp-info-box pending">
                    <AlertCircle size={16} color="#d97706" />
                    <span style={{ fontSize: 13, color: "#92400e" }}>
                      Adding payment for: <strong>{selectedAsset.name}</strong> (Total: ₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString()})
                    </span>
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      <Calendar size={13} /> Payment Date *
                    </label>
                    <input
                      required
                      type="date"
                      className="dp-form-input"
                      value={addTransactionForm.transaction_date}
                      onChange={(e) =>
                        setAddTransactionForm({
                          ...addTransactionForm,
                          transaction_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      ₱ Payment Amount
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="dp-form-input"
                      value={addTransactionForm.amount}
                      onChange={(e) =>
                        setAddTransactionForm({
                          ...addTransactionForm,
                          amount: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter payment amount"
                    />
                  </div>
                  <div className="dp-form-group">
                    <label className="dp-form-label">
                      <FileText size={13} /> Payment Description
                    </label>
                    <textarea
                      className="dp-form-textarea"
                      value={addTransactionForm.description}
                      onChange={(e) =>
                        setAddTransactionForm({
                          ...addTransactionForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe this payment (e.g., 1st installment, deposit, etc.)"
                    />
                  </div>
                </div>
                <div className="dp-modal-footer">
                  <button
                    type="button"
                    className="dp-btn-cancel"
                    onClick={() => setShowAddTransactionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="dp-btn-submit" disabled={loading}>
                    {loading ? "Saving..." : "Add Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Transaction Modal */}
      {modalMode === "edit" &&
        selectedTransaction &&
        createPortal(
          <div
            className="dp-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="dp-modal">
              <div className="dp-modal-header">
                <h3 className="dp-modal-title">Edit Payment</h3>
                <button className="dp-modal-close" onClick={closeModal}>
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body">
                <div className="dp-form-group">
                  <label className="dp-form-label">
                    <Calendar size={13} /> Payment Date
                  </label>
                  <input
                    type="date"
                    className="dp-form-input"
                    value={editForm.transaction_date}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        transaction_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="dp-form-group">
                  <label className="dp-form-label">
                    <DollarSign size={13} /> Payment Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="dp-form-input"
                    value={editForm.amount || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        amount: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter payment amount"
                  />
                </div>
                <div className="dp-form-group">
                  <label className="dp-form-label">
                    <FileText size={13} /> Payment Description
                  </label>
                  <textarea
                    className="dp-form-textarea"
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe this payment"
                  />
                </div>
              </div>
              <div className="dp-modal-footer">
                <button className="dp-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="dp-btn-submit"
                  onClick={handleUpdateTransaction}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Update Payment"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Transaction Modal */}
      {modalMode === "delete" &&
        selectedTransaction &&
        createPortal(
          <div
            className="dp-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="dp-modal">
              <div className="dp-modal-header">
                <h3 className="dp-modal-title">Delete Payment</h3>
                <button className="dp-modal-close" onClick={closeModal}>
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body">
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  Are you sure you want to delete this payment of{" "}
                  <strong>₱{parseFloat(selectedTransaction.amount || 0).toLocaleString()}</strong>?
                  {selectedTransaction.description && (
                    <> ("{selectedTransaction.description}")</>
                  )}
                  <br /><br />
                  This action cannot be undone.
                </p>
              </div>
              <div className="dp-modal-footer">
                <button className="dp-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="dp-btn-submit"
                  onClick={handleDeleteTransaction}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #991b1b, #dc2626)",
                  }}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Asset Modal */}
      {modalMode === "deleteAsset" &&
        selectedAsset &&
        createPortal(
          <div
            className="dp-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="dp-modal">
              <div className="dp-modal-header">
                <h3 className="dp-modal-title">Delete Asset</h3>
                <button className="dp-modal-close" onClick={closeModal}>
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body">
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  Are you sure you want to delete the asset{" "}
                  <strong>{selectedAsset.name}</strong> and all its payment transactions?
                  <br /><br />
                  This action cannot be undone.
                </p>
              </div>
              <div className="dp-modal-footer">
                <button className="dp-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="dp-btn-submit"
                  onClick={handleDeleteAsset}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #991b1b, #dc2626)",
                  }}
                >
                  {loading ? "Deleting..." : "Delete Asset"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default DownpaymentTable;
