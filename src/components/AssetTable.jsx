import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import PinVerificationModal from "./PinVerificationModal";
import {
  Trash2,
  ArrowRightLeft,
  Eye,
  Edit,
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
} from "lucide-react";

const AssetTable = ({ assets, refreshData }) => {
  const { user, role, hasPin, verifyPin } = useAuth();
  const [localAssets, setLocalAssets] = useState(assets || []);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);

  // PIN Verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    setLocalAssets(assets || []);
  }, [assets]);

  const handleExportCSV = () => {
    const csvData = localAssets.map((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const unitCost = Number(asset.unit_cost) || 0;
      const totalCost = quantity * unitCost;
      const salvageValue = Number(asset.salvage_value) || 0;
      const usefulLifeYears = Number(asset.useful_life_years) || 0;
      let monthlyAmortization = 0;
      if (usefulLifeYears > 0) {
        monthlyAmortization = (totalCost - salvageValue) / (usefulLifeYears * 12);
      }

      return {
        "Asset Name": asset.name,
        Category: asset.category,
        Tag: asset.tag_number,
        Reference: asset.reference_number,
        Qty: quantity,
        "Unit Cost": unitCost,
        "Total Cost": totalCost,
        "Salvage Value": salvageValue,
        "Useful Life": usefulLifeYears,
        "Purchase Date": asset.purchase_date,
        "Disposed By": asset.current_company,
        "Monthly Amortization": monthlyAmortization.toFixed(2),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, "Asset_Disposal_Report.csv");
  };

  const exportToExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet([data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Record");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleTransfer = async (asset) => {
    const destination = prompt("Enter Destination Company Name:");
    if (!destination) return;

    const exportData = {
      ...asset,
      transfer_date: new Date().toISOString(),
      destination,
    };
    exportToExcel(exportData, `Transfer_Proof_${asset.tag_number}`);

    const { error } = await supabase
      .from("assets")
      .update({ status: "Transferred", current_company: destination })
      .eq("id", asset.id);

    if (!error && refreshData) {
      refreshData();
    }
  };

  const handleDispose = async (asset) => {
    if (!window.confirm("Are you sure you want to dispose this asset?")) {
      return;
    }

    try {
      const quantity = Number(asset.quantity) || 0;
      const unitCost = Number(asset.unit_cost) || 0;
      const totalCost = quantity * unitCost;
      const salvageValue = Number(asset.salvage_value) || 0;
      const usefulLifeYears = Number(asset.useful_life_years) || 0;
      let monthlyAmortization = 0;
      if (usefulLifeYears > 0) {
        monthlyAmortization = (totalCost - salvageValue) / (usefulLifeYears * 12);
      }

      const csvData = [{
        "Asset Name": asset.name,
        Category: asset.category,
        Tag: asset.tag_number,
        Reference: asset.reference_number,
        Qty: quantity,
        "Unit Cost": unitCost,
        "Total Cost": totalCost,
        "Salvage Value": salvageValue,
        "Useful Life": usefulLifeYears,
        "Purchase Date": asset.purchase_date,
        "Disposed By": user?.email || "Unknown",
        "Disposal Date": new Date().toISOString().split("T")[0],
        "Monthly Amortization": monthlyAmortization.toFixed(2),
      }];

      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Disposed Asset");
      XLSX.writeFile(workbook, `Disposed_${asset.tag_number}.csv`);

      const { error: updateError } = await supabase
        .from("assets")
        .update({ status: "Disposed" })
        .eq("id", asset.id);

      if (updateError) throw updateError;

      if (refreshData) {
        await refreshData();
      } else {
        window.location.reload();
      }

      alert("Asset marked as Disposed successfully.");
    } catch (error) {
      console.error("Error disposing asset:", error);
      alert(`Failed to dispose asset: ${error.message}`);
    }
  };

  // Handle PIN verification - ALWAYS show modal
  const handlePinRequiredAction = (action, asset) => {
    setPendingAction({ action, asset });
    setPinError("");
    setShowPinModal(true);
  };

  // Handle PIN verification
  const handlePinVerify = async (enteredPin) => {
    try {
      const isValid = await verifyPin(enteredPin);
      if (!isValid) {
        setPinError("Invalid PIN. Please try again.");
        return false;
      }
      
      setShowPinModal(false);
      const { action, asset } = pendingAction;
      
      if (action === "edit") {
        setSelectedAsset(asset);
        setEditForm({ ...asset });
        setShowEditModal(true);
      } else if (action === "dispose") {
        await handleDispose(asset);
      } else if (action === "transfer") {
        await handleTransfer(asset);
      }
      
      setPendingAction(null);
      return true;
    } catch (error) {
      setPinError(error.message || "An error occurred");
      return false;
    }
  };

  // Button handlers
  const handleEditClick = (asset) => handlePinRequiredAction("edit", asset);
  const handleDisposeClick = (asset) => handlePinRequiredAction("dispose", asset);
  const handleTransferClick = (asset) => handlePinRequiredAction("transfer", asset);

  // Check for dark mode
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const statusStyle = (status) => {
    if (status === "Active") return { bg: isDark ? "#052e16" : "#f0fdf4", color: isDark ? "#4ade80" : "#16a34a", border: isDark ? "#166534" : "#bbf7d0" };
    if (status === "Disposed") return { bg: isDark ? "#450a0a" : "#fef2f2", color: isDark ? "#fca5a5" : "#dc2626", border: isDark ? "#7f1d1d" : "#fecaca" };
    return { bg: isDark ? "#451a03" : "#fffbeb", color: isDark ? "#fbbf24" : "#d97706", border: isDark ? "#78350f" : "#fde68a" };
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      const quantity = parseInt(editForm.quantity) || 1;
      const unitCost = parseFloat(editForm.unit_cost) || 0;
      const totalCost = quantity * unitCost;

      const { error } = await supabase
        .from("assets")
        .update({
          name: editForm.name,
          category: editForm.category,
          description: editForm.description,
          reference_number: editForm.reference_number,
          serial_number: editForm.serial_number,
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          salvage_value: editForm.salvage_value,
          useful_life_years: editForm.useful_life_years,
          purchase_date: editForm.purchase_date,
          current_company: editForm.current_company,
          location: editForm.location,
          assigned_to: editForm.assigned_to,
          downpayment_amount: editForm.downpayment_amount,
        })
        .eq("id", selectedAsset.id);

      if (error) throw error;

      setShowEditModal(false);
      if (refreshData) refreshData();
      alert("Asset updated successfully!");
    } catch (error) {
      console.error("Error updating asset:", error);
      alert(`Failed to update asset: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .at-root { font-family: 'DM Sans', sans-serif; width: 100%; overflow-x: auto; }
        .at-table { width: 100%; min-width: 680px; border-collapse: collapse; }
        .at-thead { background: #fff7f7; border-bottom: 1px solid #fde8e8; }
        .dark .at-thead { background: #450a0a; border-bottom: 1px solid #7f1d1d; }
        .at-th { padding: 13px 24px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #ef4444; white-space: nowrap; }
        .dark .at-th { color: #fca5a5; }
        .at-th.right { text-align: right; }
        .at-th.center { text-align: center; }
        .at-row { border-bottom: 1px solid #fff1f1; transition: background 0.12s; }
        .dark .at-row { border-bottom: 1px solid #292524; }
        .at-row:last-child { border-bottom: none; }
        .at-row:hover { background: #fff8f8; }
        .dark .at-row:hover { background: #292524; }
        .at-td { padding: 16px 24px; font-size: 14px; color: #374151; vertical-align: middle; }
        .dark .at-td { color: #d1d5db; }
        .at-td.right { text-align: right; }
        .at-td.center { text-align: center; }
        .at-asset-name { font-weight: 600; font-size: 14px; color: #111827; }
        .dark .at-asset-name { color: #f9fafb; }
        .at-asset-tag { font-size: 12px; color: #9ca3af; margin-top: 2px; font-family: monospace; }
        .at-category { display: inline-block; font-size: 12px; font-weight: 600; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 3px 10px; }
        .dark .at-category { color: #9ca3af; background: #374151; border-color: #4b5563; }
        .at-status { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 11px; border-radius: 99px; border: 1px solid; }
        .at-value { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; color: #111827; }
        .dark .at-value { color: #f9fafb; }
        .at-actions { display: flex; justify-content: center; align-items: center; gap: 6px; }
        .at-btn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.14s; }
        .at-btn:hover { transform: translateY(-1px); }
        .at-btn-view { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
        .dark .at-btn-view { background: #1e3a5f; border-color: #1e40af; color: #60a5fa; }
        .at-btn-transfer { background: #fffbeb; border-color: #fde68a; color: #d97706; }
        .dark .at-btn-transfer { background: #451a03; border-color: #78350f; color: #fbbf24; }
        .at-btn-dispose { background: #fff1f1; border-color: #fecaca; color: #dc2626; }
        .dark .at-btn-dispose { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }
        .at-btn-edit { background: #eef2ff; border-color: #c7d2fe; color: #6366f1; }
        .dark .at-btn-edit { background: #312e81; border-color: #3730a3; color: #a5b4fc; }
        .at-empty { text-align: center; padding: 64px 24px; color: #d1d5db; }
        .dark .at-empty { color: #6b7280; }
        .at-empty-icon { width: 48px; height: 48px; background: #fff1f1; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #fca5a5; }
        .dark .at-empty-icon { background: #450a0a; color: #7f1d1d; }
      `}</style>

      <div className="at-root">
        <div style={{ padding: "10px", textAlign: "right" }}>
          <button onClick={handleExportCSV} className="at-btn at-btn-view" style={{ width: "auto", padding: "0 15px", fontSize: "13px" }}>
            Export CSV
          </button>
        </div>
        <table className="at-table">
          <thead className="at-thead">
            <tr>
              <th className="at-th">Tag / Name</th>
              <th className="at-th">Category</th>
              <th className="at-th">Status</th>
              <th className="at-th right">Value</th>
              <th className="at-th center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localAssets.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="at-empty">
                    <div className="at-empty-icon"><Trash2 size={22} /></div>
                    No assets found.
                  </div>
                </td>
              </tr>
            ) : (
              localAssets.map((asset) => {
                const s = statusStyle(asset.status);
                return (
                  <tr key={asset.id} className="at-row">
                    <td className="at-td">
                      <div className="at-asset-name">{asset.name}</div>
                      <div className="at-asset-tag">{asset.tag_number}</div>
                    </td>
                    <td className="at-td">
                      <span className="at-category">{asset.category}</span>
                    </td>
                    <td className="at-td">
                      <span className="at-status" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="at-td right">
                      <span className="at-value">₱{parseFloat(asset.total_cost).toLocaleString()}</span>
                    </td>
                    <td className="at-td center">
                      <div className="at-actions">
                        <button title="View Details" className="at-btn at-btn-view">
                          <Eye size={15} />
                        </button>
                        {(role === "head" || role === "admin") && (
                          <button title="Edit" className="at-btn at-btn-edit" onClick={() => handleEditClick(asset)}>
                            <Edit size={15} />
                          </button>
                        )}
                        <button onClick={() => handleDisposeClick(asset)} title="Delete" className="at-btn at-btn-dispose">
                          <Trash2 size={15} />
                        </button>
                        {role === "head" && asset.status === "Active" && (
                          <button onClick={() => handleTransferClick(asset)} title="Transfer" className="at-btn at-btn-transfer">
                            <ArrowRightLeft size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedAsset && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15, 5, 5, 0.48)", backdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#ffffff", borderRadius: "22px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 96px rgba(220,38,38,0.16)", border: "1px solid #fde8e8" }}>
            <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid #fef0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #4338ca, #6366f1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Edit size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 800, color: "#111827" }}>Edit Asset</p>
                  <p style={{ fontSize: "13px", color: "#9ca3af" }}>{selectedAsset.name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ width: "32px", height: "32px", borderRadius: "9px", border: "1.5px solid #fde8e8", background: "#fff5f5", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: "22px 26px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#ef4444", marginBottom: "12px" }}>Basic Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Asset Name</label><input name="name" value={editForm.name || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Category</label><input name="category" value={editForm.category || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Tag Number</label><input name="tag_number" value={editForm.tag_number || ""} readOnly style={{ fontSize: "14px", color: "#6b7280", background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "10px 13px", width: "100%", cursor: "not-allowed" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Reference #</label><input name="reference_number" value={editForm.reference_number || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#ef4444", marginBottom: "12px" }}>Valuation</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Quantity</label><input type="number" name="quantity" value={editForm.quantity || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Unit Cost (₱)</label><input type="number" step="0.01" name="unit_cost" value={editForm.unit_cost || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Salvage Value (₱)</label><input type="number" step="0.01" name="salvage_value" value={editForm.salvage_value || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Useful Life (Years)</label><input type="number" name="useful_life_years" value={editForm.useful_life_years || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#ef4444", marginBottom: "12px" }}>Logistics</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Purchase Date</label><input type="date" name="purchase_date" value={editForm.purchase_date || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Company</label><select name="current_company" value={editForm.current_company || "HQ"} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }}><option value="HQ">HQ</option><option value="Company A">Company A</option><option value="Company B">Company B</option></select></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Location</label><input name="location" value={editForm.location || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
                <div><label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151", marginBottom: "5px", display: "block" }}>Assigned To</label><input name="assigned_to" value={editForm.assigned_to || ""} onChange={handleEditChange} style={{ fontSize: "14px", color: "#111827", background: "#fafafa", border: "1.5px solid #f3e8e8", borderRadius: "10px", padding: "10px 13px", width: "100%" }} /></div>
              </div>
            </div>
            <div style={{ padding: "16px 26px 22px", display: "flex", gap: "10px", borderTop: "1px solid #fef0f0" }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "#6b7280", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: "11px", padding: "11px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSave} disabled={loading} style={{ flex: 2, fontSize: "14px", fontWeight: 700, color: "#fff", background: loading ? "#9ca3af" : "linear-gradient(135deg, #4338ca, #6366f1)", border: "none", borderRadius: "11px", padding: "11px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
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
      />
    </>
  );
};

export default AssetTable;
