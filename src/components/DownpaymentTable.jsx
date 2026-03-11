
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
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
  DollarSign,
  FileText,
  CheckCircle2,
  Tag,
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
  const [addAssetForm, setAddAssetForm] = useState({ name: "", category: "", tag_number: "", total_cost: 0, status: "Pending", downpayment_amount: 0, downpayment_description: "" });
  const [addTransactionForm, setAddTransactionForm] = useState({ amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTransactions();
    if (showAddAssetModal) {
      const generateTagNumber = async () => {
        const { data } = await supabase.from("assets").select("tag_number").not("tag_number", "is", null).order("tag_number", { ascending: false });
        let nextNum = 1;
        if (data?.length) {
          data.forEach((item) => { const match = item.tag_number?.match(/^TAG-(\d+)$/); if (match) { const num = parseInt(match[1], 10); if (num >= nextNum) nextNum = num + 1; } });
        }
        setAddAssetForm((prev) => ({ ...prev, tag_number: `TAG-${nextNum.toString().padStart(3, "0")}` }));
      };
      generateTagNumber();
    }
  }, [showAddAssetModal]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from("downpayment_transactions").select("*").order("transaction_date", { ascending: false });
    if (error) { console.error("Error:", error); return; }
    const grouped = {};
    (data || []).forEach((txn) => { if (!grouped[txn.asset_id]) grouped[txn.asset_id] = []; grouped[txn.asset_id].push(txn); });
    setTransactions(grouped);
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

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const totalCost = parseFloat(addAssetForm.total_cost) || 0;
    const assetData = { name: addAssetForm.name, category: addAssetForm.category || "General", tag_number: addAssetForm.tag_number, total_cost: totalCost, downpayment_amount: 0, quantity: 1, unit_cost: totalCost, salvage_value: 0, useful_life_years: 1, status: "Pending", current_company: "HO", purchase_date: new Date().toISOString().split("T")[0] };
    const { data: assetDataResult, error } = await supabase.from("assets").insert([assetData]).select();
    if (error) { alert("Error: " + error.message); setLoading(false); return; }
    const initialAmount = parseFloat(addAssetForm.downpayment_amount || 0);
    if (initialAmount > 0 && assetDataResult?.[0]) {
      await supabase.from("downpayment_transactions").insert([{ asset_id: assetDataResult[0].id, amount: initialAmount, description: addAssetForm.downpayment_description || "Initial downpayment", transaction_date: new Date().toISOString().split("T")[0], created_by: userEmail }]);
    }
    await supabase.from("logs").insert({ user_email: userEmail || "unknown", action_type: "CREATE_ASSET", details: { asset_name: addAssetForm.name, message: `Asset "${addAssetForm.name}" created via Downpayment` } });
    setLoading(false); setShowAddAssetModal(false); setAddAssetForm({ name: "", category: "", tag_number: "", total_cost: 0, status: "Pending" }); refreshData(); fetchTransactions();
  };

  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault(); if (!selectedAsset) return; setLoading(true);
    await supabase.from("downpayment_transactions").insert([{ asset_id: selectedAsset.id, amount: parseFloat(addTransactionForm.amount) || 0, description: addTransactionForm.description, transaction_date: addTransactionForm.transaction_date, created_by: userEmail }]);
    setLoading(false); setShowAddTransactionModal(false); setAddTransactionForm({ amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); fetchTransactions(); refreshData();
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return; setLoading(true);
    await supabase.from("downpayment_transactions").update({ amount: parseFloat(editForm.amount) || 0, description: editForm.description, transaction_date: editForm.transaction_date }).eq("id", selectedTransaction.id);
    setLoading(false); setModalMode(null); setSelectedTransaction(null); fetchTransactions(); refreshData();
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return; setLoading(true);
    await supabase.from("downpayment_transactions").delete().eq("id", selectedTransaction.id);
    setLoading(false); setModalMode(null); setSelectedTransaction(null); fetchTransactions(); refreshData();
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return; setLoading(true);
    await supabase.from("assets").delete().eq("id", selectedAsset.id);
    setLoading(false); setModalMode(null); setSelectedAsset(null); refreshData(); fetchTransactions();
  };

  const openTransactionModal = (asset, transaction, mode) => { setSelectedAsset(asset); setSelectedTransaction(transaction); setModalMode(mode); if (mode === "edit") setEditForm({ amount: transaction.amount, description: transaction.description, transaction_date: transaction.transaction_date }); };
  const openAddTransaction = (asset) => { setSelectedAsset(asset); setShowAddTransactionModal(true); };
  const closeModal = () => { setSelectedAsset(null); setSelectedTransaction(null); setModalMode(null); };

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
    .dp-form-grid { display: grid; gap: 12px; margin-bottom: 16px; }
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
<button className="dash-btn dash-btn-primary" onClick={() => setShowAddAssetModal(true)} style={{ background: '#dc2626' }}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      <div className="dash-logs-list">
        <div className="dash-log-header">
          <span></span>
          <span>Tag #</span>
          <span>Asset Name</span>
          <span>Category</span>
          <span>Status</span>
          <span>Total Cost</span>
          <span>Downpayment</span>
          <span>Progress</span>
          <span>Actions</span>
        </div>
        {downpaymentAssets.length === 0 ? (
          <div className="dash-log-empty">{searchQuery ? "No assets match your search." : "No downpayment assets found."}</div>
        ) : (
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
                      <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedAsset(asset); setModalMode("deleteAsset"); }} />
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
                                <ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => openTransactionModal(asset, txn, "delete")} />
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
                    <label className="dp-field-label"><Tag size={12} /> Tag Number</label>
                    <input type="text" value={addAssetForm.tag_number} readOnly className="dp-field-input" style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} />
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Auto-generated</p>
                  </div>
                </div>
                <p className="dp-section-label">Valuation</p>
                <div className="dp-form-grid">
                  <div className="dp-field">
                    <label className="dp-field-label"><DollarSign size={12} /> Total Cost (₱) <span className="dp-required-dot" /></label>
                    <input required type="number" step="0.01" value={addAssetForm.total_cost} onChange={(e) => setAddAssetForm({ ...addAssetForm, total_cost: parseFloat(e.target.value) || 0 })} className="dp-field-input" placeholder="0.00" />
                  </div>
                  <div className="dp-field">
                    <label className="dp-field-label"><DollarSign size={12} /> Initial Downpayment (₱)</label>
                    <input type="number" step="0.01" value={addAssetForm.downpayment_amount || ""} onChange={(e) => setAddAssetForm({ ...addAssetForm, downpayment_amount: parseFloat(e.target.value) || 0 })} className="dp-field-input" placeholder="Optional" />
                  </div>
                </div>
                <div className="dp-field">
                  <label className="dp-field-label"><FileText size={12} /> Payment Description</label>
                  <input type="text" value={addAssetForm.downpayment_description || ""} onChange={(e) => setAddAssetForm({ ...addAssetForm, downpayment_description: e.target.value })} className="dp-field-input" placeholder="Describe payment terms..." />
                </div>
              </div>
              <div className="dp-modal-footer">
                <button type="button" className="dp-btn-cancel" onClick={() => setShowAddAssetModal(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="dp-btn-submit">{loading ? "Saving..." : <>Save Asset</>}</button>
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
                <div className="dp-modal-icon"><DollarSign size={18} color="#fff" strokeWidth={2.2} /></div>
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
                    <label className="dp-field-label"><DollarSign size={12} /> Amount (₱) <span className="dp-required-dot" /></label>
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
                  <label className="dp-field-label"><DollarSign size={12} /> Amount (₱)</label>
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
                <p className="dp-info-text">Delete payment of <strong>₱{parseFloat(selectedTransaction.amount || 0).toLocaleString()}</strong>?<br/>{selectedTransaction.description && <span>"{selectedTransaction.description}"</span>}<br/><br/>This action cannot be undone.</p>
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
                <div><p className="dp-modal-title">Delete Asset</p></div>
              </div>
              <button className="dp-close-btn" onClick={closeModal}><X size={15} strokeWidth={2.5} /></button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-info-box danger">
                <p className="dp-info-text">Delete asset <strong>{selectedAsset.name}</strong> and all its payment transactions?<br/><br/>This action cannot be undone.</p>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button className="dp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button onClick={handleDeleteAsset} disabled={loading} className="dp-btn-submit dp-btn-danger">{loading ? "Deleting..." : "Delete Asset"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DownpaymentTable;

