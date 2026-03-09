import React, { useState, useTransition, memo } from 'react';
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
  Search,
  Download,
} from 'lucide-react';
import PinVerificationModal from './PinVerificationModal';
import { ModernTable, ModernSearchBar, ModernButton, StatusBadge, ActionButton } from './ui/ModernTable';

// Memoized Action Buttons component
const ActionButtons = memo(({ 
  asset, 
  onEdit, 
  onView, 
  onDelete, 
  onTransfer,
  role,
  isLoading 
}) => {
  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton 
        icon={Eye} 
        label="View Details"
        onClick={() => onView(asset)}
      />
      
      {(role === "head" || role === "admin") && (
        <ActionButton 
          icon={Edit} 
          label="Edit"
          variant="primary"
          onClick={() => onEdit(asset)}
        />
      )}
      
      <ActionButton 
        icon={Trash2} 
        label="Delete"
        variant="danger"
        danger
        onClick={() => onDelete(asset)}
      />
      
      {role === "head" && asset.status === "Active" && (
        <ActionButton 
          icon={ArrowRightLeft} 
          label="Transfer"
          onClick={() => onTransfer(asset)}
        />
      )}
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

// Memoized Asset Row component
const AssetRow = memo(({ asset, onEdit, onView, onDelete, onTransfer, role, isLoading }) => {
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
        <ActionButtons
          asset={asset}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onTransfer={onTransfer}
          role={role}
          isLoading={isLoading}
        />
      </td>
    </tr>
  );
});

AssetRow.displayName = 'AssetRow';

const DataTable = ({ 
  assets, 
  role, 
  onEdit, 
  onView, 
  onDelete, 
  onTransfer,
  isLoading = false,
  isFetching = false
}) => {
  const [isPending, startTransition] = useTransition();
  const [localAssets, setLocalAssets] = useState(assets || []);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editForm, setEditForm] = useState({});

  // PIN Verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pinError, setPinError] = useState("");

  // Filter assets based on search
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

  // Handle PIN verification - ALWAYS show modal
  const handlePinRequiredAction = (action, asset) => {
    setPendingAction({ action, asset });
    setPinError("");
    setShowPinModal(true);
  };

  // Handle PIN verification
  const handlePinVerify = async (enteredPin) => {
    try {
      // Simulate PIN verification (replace with actual verification)
      const isValid = enteredPin === '1234';
      
      if (!isValid) {
        setPinError("Incorrect PIN. Please try again.");
        return { success: false, error: "Incorrect PIN" };
      }
      
      const { action, asset } = pendingAction;
      
      if (action === "edit") {
        setSelectedAsset(asset);
        setEditForm({ ...asset });
        setShowEditModal(true);
      } else if (action === "delete") {
        await onDelete(asset);
      } else if (action === "transfer") {
        await onTransfer(asset);
      }
      
      setPendingAction(null);
      setShowPinModal(false);
      return { success: true };
    } catch (error) {
      console.error("PIN verification error:", error);
      return { success: false, error: error.message || "An error occurred" };
    }
  };

  // Button handlers with useTransition for responsiveness
  const handleEditClick = (asset) => {
    startTransition(() => {
      handlePinRequiredAction("edit", asset);
    });
  };

  const handleDeleteClick = (asset) => {
    startTransition(() => {
      handlePinRequiredAction("delete", asset);
    });
  };

  const handleTransferClick = (asset) => {
    startTransition(() => {
      handlePinRequiredAction("transfer", asset);
    });
  };

  const handleViewClick = (asset) => {
    startTransition(() => {
      onView(asset);
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleEditSave = async () => {
    try {
      await onEdit(editForm);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating asset:", error);
      alert(`Failed to update asset: ${error.message}`);
    }
  };

  // Show loading overlay only during initial load, not during background fetches
  const showLoadingOverlay = isLoading && !isFetching;

  // Table columns
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
        <ActionButtons
          asset={row}
          onEdit={handleEditClick}
          onView={handleViewClick}
          onDelete={handleDeleteClick}
          onTransfer={handleTransferClick}
          role={role}
          isLoading={isPending || isLoading}
        />
      )
    },
  ];

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
            {isFetching && (
              <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Table */}
        <ModernTable
          columns={columns}
          data={filteredAssets}
          emptyMessage="No assets found."
          loading={showLoadingOverlay}
          loadingMessage="Loading assets..."
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
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "Saving..." : "Save Changes"}
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

export default DataTable;

