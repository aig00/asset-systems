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
  const [addAssetForm, setAddAssetForm] = useState({ name: "", category: "", tag_number: "", total_cost: 0, status: "Pending" });
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
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percent}%` }} /></div>
      <span className={`text-xs font-semibold min-w-[40px] ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>{percent.toFixed(1)}%</span>
    </div>
  );

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
        <ModernSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, tag, category..." className="flex-1 max-w-sm" />
        <ModernButton variant="primary" size="sm" icon={Plus} onClick={() => setShowAddAssetModal(true)}>Add Downpayment Asset</ModernButton>
      </div>

      <div className="bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tag #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Downpayment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Progress</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {downpaymentAssets.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center"><div className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><Search className="w-6 h-6 text-gray-400" /></div><p className="text-sm text-gray-500">{searchQuery ? "No assets match your search." : "No downpayment assets found."}</p></div></td></tr>
              ) : (
                downpaymentAssets.map((asset) => {
                  const paymentPercent = calculatePaymentCompletion(asset);
                  const assetTransactions = transactions[asset.id] || [];
                  const isExpanded = expandedAssets[asset.id];
                  const isComplete = paymentPercent >= 100;
                  return (
                    <React.Fragment key={asset.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3"><button onClick={() => toggleAssetExpansion(asset.id)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                        <td className="px-4 py-3"><span className="font-mono text-sm font-semibold text-gray-900">{asset.tag_number}</span></td>
                        <td className="px-4 py-3"><span className="font-medium text-gray-900 text-sm">{asset.name}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{asset.category || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={isComplete ? "completed" : "pending"} /></td>
                        <td className="px-4 py-3 text-right"><span className="font-mono font-semibold text-gray-900">₱{parseFloat(asset.total_cost || 0).toLocaleString()}</span></td>
                        <td className="px-4 py-3 text-right"><span className="font-mono font-semibold text-emerald-600">₱{getTotalDownpayment(asset).toLocaleString()}</span></td>
                        <td className="px-4 py-3">{renderProgressBar(paymentPercent, isComplete)}</td>
                        <td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><ActionButton icon={Plus} label="Add Payment" onClick={() => openAddTransaction(asset)} /><ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => { setSelectedAsset(asset); setModalMode("deleteAsset"); }} /></div></td>
                      </tr>
                      {isExpanded && (
                        <tr><td colSpan={9} className="bg-gray-50 border-b border-gray-200 p-4"><div className="ml-8">
                          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Receipt size={14} className="text-gray-500" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction History</span><span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{assetTransactions.length}</span></div><ModernButton variant="secondary" size="sm" icon={Plus} onClick={() => openAddTransaction(asset)}>Add Payment</ModernButton></div>
                          {assetTransactions.length === 0 ? <div className="text-sm text-gray-500 text-center py-4 bg-white rounded-lg border border-dashed border-gray-300">No transactions yet.</div> : (
                            <div className="space-y-2">{assetTransactions.map((txn) => (<div key={txn.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"><div className="flex items-center gap-4"><div className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar size={12} />{new Date(txn.transaction_date).toLocaleDateString()}</div><span className="font-mono font-semibold text-emerald-600">₱{parseFloat(txn.amount || 0).toLocaleString()}</span><span className="text-sm text-gray-600 truncate max-w-xs" title={txn.description}>{txn.description || "—"}</span></div><div className="flex items-center gap-1"><ActionButton icon={Edit} label="Edit" onClick={() => openTransactionModal(asset, txn, "edit")} /><ActionButton icon={Trash2} label="Delete" variant="danger" danger onClick={() => openTransactionModal(asset, txn, "delete")} /></div></div>))}</div>
                          )}
                        </div></td></tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddAssetModal && createPortal(<div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowAddAssetModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Add Downpayment Asset</h3><button onClick={() => setShowAddAssetModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleAddAssetSubmit}><div className="p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label><input required type="text" value={addAssetForm.name} onChange={(e) => setAddAssetForm({ ...addAssetForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tag Number</label><input type="text" value={addAssetForm.tag_number} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (₱) *</label><input required type="number" step="0.01" value={addAssetForm.total_cost} onChange={(e) => setAddAssetForm({ ...addAssetForm, total_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Initial Downpayment (₱)</label><input type="number" step="0.01" value={addAssetForm.downpayment_amount || ""} onChange={(e) => setAddAssetForm({ ...addAssetForm, downpayment_amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div><div className="px-6 py-4 border-t border-gray-200 flex gap-3"><button type="button" onClick={() => setShowAddAssetModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? "Saving..." : "Save Asset"}</button></div></form>
        </div>
      </div>, document.body)}

      {showAddTransactionModal && selectedAsset && createPortal(<div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowAddTransactionModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Add Payment</h3><button onClick={() => setShowAddTransactionModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleAddTransactionSubmit}><div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-sm text-amber-800">Adding payment for: <strong>{selectedAsset.name}</strong></p><p className="text-xs text-amber-600 mt-1">Total: ₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString()}</p></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label><input required type="date" value={addTransactionForm.transaction_date} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, transaction_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱) *</label><input required type="number" step="0.01" value={addTransactionForm.amount} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={addTransactionForm.description} onChange={(e) => setAddTransactionForm({ ...addTransactionForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px]" /></div>
          </div><div className="px-6 py-4 border-t border-gray-200 flex gap-3"><button type="button" onClick={() => setShowAddTransactionModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? "Saving..." : "Add Payment"}</button></div></form>
        </div>
      </div>, document.body)}

      {modalMode === "edit" && selectedTransaction && createPortal(<div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Edit Payment</h3><button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <div className="p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label><input type="date" value={editForm.transaction_date} onChange={(e) => setEditForm({ ...editForm, transaction_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label><input type="number" step="0.01" value={editForm.amount || ""} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px]" /></div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3"><button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleUpdateTransaction} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? "Saving..." : "Update"}</button></div>
        </div>
      </div>, document.body)}

      {modalMode === "delete" && selectedTransaction && createPortal(<div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Delete Payment</h3><button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-800">Delete payment of <strong>₱{parseFloat(selectedTransaction.amount || 0).toLocaleString()}</strong>?</p><p className="text-xs text-red-600 mt-2">This cannot be undone.</p></div></div>
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3"><button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleDeleteTransaction} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{loading ? "Deleting..." : "Delete"}</button></div>
        </div>
      </div>, document.body)}

      {modalMode === "deleteAsset" && selectedAsset && createPortal(<div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Delete Asset</h3><button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-800">Delete asset <strong>{selectedAsset.name}</strong> and all its payments?</p><p className="text-xs text-red-600 mt-2">This cannot be undone.</p></div></div>
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3"><button onClick={closeModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleDeleteAsset} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{loading ? "Deleting..." : "Delete Asset"}</button></div>
        </div>
      </div>, document.body)}
    </>
  );
};

export default DownpaymentTable;

    