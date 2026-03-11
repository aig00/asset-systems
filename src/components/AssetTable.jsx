import React, { useState, useEffect, memo } from "react";
import ExcelJS from "exceljs";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import PinVerificationModal from "./PinVerificationModal";
import { ModernTable, ModernSearchBar, ModernButton, StatusBadge, KebabMenu } from "./ui/ModernTable";
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
  Download,
} from "lucide-react";

// Memoized row component for performance
const AssetRow = memo(({ asset, role, onView, onEdit, onDelete, onTransfer, isPending }) => {
  const statusVariant = (asset.status || "").toLowerCase();
  
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150 group">
      {/* Tag / Name */}
      <td className="px-4 py-3.5">
        <div>
          <p className="font-medium text-gray-900 text-sm">{asset.name}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{asset.tag_number}</p>
        </div>
      </td>
      
      {/* Category */}
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {asset.category || "—"}
        </span>
      </td>
      
      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={statusVariant} />
      </td>
      
      {/* Value */}
      <td className="px-4 py-3.5 text-right">
        <span className="font-mono font-semibold text-gray-900">
          ₱{parseFloat(asset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(asset)}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {(role === "head" || role === "admin") && (
            <button
              onClick={() => onEdit(asset)}
              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => onDelete(asset)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {role === "head" && asset.status === "Active" && (
            <button
              onClick={() => onTransfer(asset)}
              className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors rounded-md"
              title="Transfer"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

AssetRow.displayName = 'AssetRow';

const AssetTable = ({ assets, refreshData }) => {
  const { user, role, verifyPin } = useAuth();
  const [localAssets, setLocalAssets] = useState(assets || []);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  // Filtered assets
  const filteredAssets = React.useMemo(() => {
    if (!searchQuery) return localAssets;
    const query = searchQuery.toLowerCase();
    return localAssets.filter(asset => 
      asset.name?.toLowerCase().includes(query) ||
      asset.tag_number?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query) ||
      asset.status?.toLowerCase().includes(query)
    );
  }, [localAssets, searchQuery]);

  const handleExportCSV = async () => {
    const csvData = filteredAssets.map((asset) => {
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Assets");
    
    worksheet.columns = [
      { header: "Asset Name", key: "Asset Name", width: 25 },
      { header: "Category", key: "Category", width: 15 },
      { header: "Tag", key: "Tag", width: 15 },
      { header: "Reference", key: "Reference", width: 15 },
      { header: "Qty", key: "Qty", width: 8 },
      { header: "Unit Cost", key: "Unit Cost", width: 12 },
      { header: "Total Cost", key: "Total Cost", width: 12 },
      { header: "Salvage Value", key: "Salvage Value", width: 12 },
      { header: "Useful Life", key: "Useful Life", width: 10 },
      { header: "Purchase Date", key: "Purchase Date", width: 12 },
      { header: "Disposed By", key: "Disposed By", width: 15 },
      { header: "Monthly Amortization", key: "Monthly Amortization", width: 18 },
    ];
    
    csvData.forEach(row => worksheet.addRow(row));
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Asset_Disposal_Report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = async (data, fileName) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Record");
    
    Object.entries(data).forEach(([key, value]) => {
      worksheet.addRow({ Field: key, Value: value });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleTransfer = async (asset) => {
    try {
      const destination = prompt("Enter Destination LOB:");
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

      if (error) throw error;
      
      if (refreshData) {
        await refreshData();
      }
      
      alert("Asset transferred successfully!");
    } catch (error) {
      console.error("Error transferring asset:", error);
      alert(`Failed to transfer asset: ${error.message}`);
      if (refreshData) {
        await refreshData();
      }
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

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Disposed Asset");
      
      worksheet.columns = [
        { header: "Asset Name", key: "Asset Name", width: 25 },
        { header: "Category", key: "Category", width: 15 },
        { header: "Tag", key: "Tag", width: 15 },
        { header: "Reference", key: "Reference", width: 15 },
        { header: "Qty", key: "Qty", width: 8 },
        { header: "Unit Cost", key: "Unit Cost", width: 12 },
        { header: "Total Cost", key: "Total Cost", width: 12 },
        { header: "Salvage Value", key: "Salvage Value", width: 12 },
        { header: "Useful Life", key: "Useful Life", width: 10 },
        { header: "Purchase Date", key: "Purchase Date", width: 12 },
        { header: "Disposed By", key: "Disposed By", width: 20 },
        { header: "Disposal Date", key: "Disposal Date", width: 12 },
        { header: "Monthly Amortization", key: "Monthly Amortization", width: 18 },
      ];
      
      csvData.forEach(row => worksheet.addRow(row));
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Disposed_${asset.tag_number}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

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
      const result = await verifyPin(enteredPin);
      if (!result || !result.success) {
        return result;
      }
      
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
      return result;
    } catch (error) {
      console.error("PIN verification error:", error);
      return { success: false, error: error.message || "An error occurred" };
    }
  };

  // Button handlers
  const handleEditClick = (asset) => handlePinRequiredAction("edit", asset);
  const handleDisposeClick = (asset) => handlePinRequiredAction("dispose", asset);
  const handleTransferClick = (asset) => handlePinRequiredAction("transfer", asset);

  // Table columns definition
  const columns = [
    { 
      key: 'name', 
      header: 'Tag / Name',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.name}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{row.tag_number}</p>
        </div>
      )
    },
    { 
      key: 'category', 
      header: 'Category',
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {val || "—"}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      type: 'status'
    },
    { 
      key: 'total_cost', 
      header: 'Value',
      type: 'currency',
      align: 'right'
    },
    { 
      key: 'actions', 
      header: '',
      align: 'right',
      width: 'w-40',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {}}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {(role === "head" || role === "admin") && (
            <button
              onClick={() => handleEditClick(row)}
              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => handleDisposeClick(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {role === "head" && row.status === "Active" && (
            <button
              onClick={() => handleTransferClick(row)}
              className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors rounded-md"
              title="Transfer"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    },
  ];

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
      {/* ── Modern Table Container ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header / Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between gap-4">
          <ModernSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, tag, category..."
            className="flex-1 max-w-sm"
          />
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {filteredAssets.length} of {localAssets.length} assets
            </span>
            <ModernButton 
              variant="secondary" 
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
            >
              Export
            </ModernButton>
          </div>
        </div>

        {/* Table */}
        <ModernTable
          columns={columns}
          data={filteredAssets}
          emptyMessage="No assets found."
          loading={false}
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedAsset && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Asset</h3>
                  <p className="text-sm text-gray-500">{selectedAsset.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                    <input 
                      name="name" 
                      value={editForm.name || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input 
                      name="category" 
                      value={editForm.category || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tag Number</label>
                    <input 
                      name="tag_number" 
                      value={editForm.tag_number || ""} 
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                    <input 
                      name="reference_number" 
                      value={editForm.reference_number || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Valuation */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Valuation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      value={editForm.quantity || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (₱)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="unit_cost" 
                      value={editForm.unit_cost || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value (₱)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="salvage_value" 
                      value={editForm.salvage_value || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label>
                    <input 
                      type="number" 
                      name="useful_life_years" 
                      value={editForm.useful_life_years || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logistics */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Logistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input 
                      type="date" 
                      name="purchase_date" 
                      value={editForm.purchase_date || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LOB</label>
                    <select 
                      name="current_company" 
                      value={editForm.current_company || "HO"} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    >
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
                    <input 
                      name="location" 
                      value={editForm.location || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input 
                      name="assigned_to" 
                      value={editForm.assigned_to || ""} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
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
