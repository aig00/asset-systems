import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Trash2, ArrowRightLeft, Eye, Search } from "lucide-react";

const AssetTable = ({ assets, refreshData }) => {
  const { user, role } = useAuth();
  const [localAssets, setLocalAssets] = useState(assets || []);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLocalAssets(assets || []);
  }, [assets]);

  // Filter assets based on search query
  const filteredAssets = localAssets.filter((asset) => {
    const query = searchQuery.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(query) ||
      asset.tag_number?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query) ||
      asset.status?.toLowerCase().includes(query) ||
      asset.current_company?.toLowerCase().includes(query)
    );
  });

  const handleExportCSV = () => {
    const csvData = localAssets.map((asset) => {
      // Calculate derived values
      const quantity = Number(asset.quantity) || 0;
      const unitCost = Number(asset.unit_cost) || 0;
      const totalCost = quantity * unitCost;
      
      const salvageValue = Number(asset.salvage_value) || 0;
      const usefulLifeYears = Number(asset.useful_life_years) || 0;

      // Monthly Amortization = (Total Cost - Salvage Value) / (Useful Life in Years * 12)
      let monthlyAmortization = 0;
      if (usefulLifeYears > 0) {
        monthlyAmortization =
          (totalCost - salvageValue) / (usefulLifeYears * 12);
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
        "Disposed By": asset.current_company, // Mapping 'current_company' to 'Disposed By' based on Phase 1 changes
        "Monthly Amortization": monthlyAmortization.toFixed(2),
      };
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");

    // Export as CSV
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

    if (!error) {
      refreshData();
    }
  };

  const handleDispose = async (asset) => {
    if (
      !window.confirm(
        "Are you sure you want to dispose this asset? This will export the asset data to CSV and mark it as Disposed.",
      )
    ) {
      return;
    }

    try {
      // Export Data Logic (CSV)
      const quantity = Number(asset.quantity) || 0;
      const unitCost = Number(asset.unit_cost) || 0;
      const totalCost = quantity * unitCost;
      const salvageValue = Number(asset.salvage_value) || 0;
      const usefulLifeYears = Number(asset.useful_life_years) || 0;
      let monthlyAmortization = 0;
      if (usefulLifeYears > 0) {
        monthlyAmortization =
          (totalCost - salvageValue) / (usefulLifeYears * 12);
      }

      const csvData = [
        {
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
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Disposed Asset");
      XLSX.writeFile(workbook, `Disposed_${asset.tag_number}.csv`);

      // Update status to "Disposed" in the database
      const { error: updateError } = await supabase
        .from("assets")
        .update({ status: "Disposed" })
        .eq("id", asset.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the data to reflect the status change
      if (refreshData) {
        await refreshData();
      } else {
        window.location.reload();
      }

      alert("Asset marked as Disposed and data exported to CSV successfully.");
    } catch (error) {
      console.error("Error disposing asset:", error);
      alert(`Failed to dispose asset: ${error.message}`);
    }
  };

  const statusStyle = (status) => {
    if (status === "Active")
      return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
    if (status === "Disposed")
      return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .at-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          overflow-x: auto;
        }
        .at-root::-webkit-scrollbar { height: 6px; }
        .at-root::-webkit-scrollbar-track { background: #fff7f7; }
        .at-root::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; }

        .at-table {
          width: 100%;
          min-width: 680px;
          border-collapse: collapse;
        }

        /* Head */
        .at-thead {
          background: #fff7f7;
          border-bottom: 1px solid #fde8e8;
        }
        .at-th {
          padding: 13px 24px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ef4444;
          white-space: nowrap;
        }
        .at-th.right { text-align: right; }
        .at-th.center { text-align: center; }

        /* Rows */
        .at-row {
          border-bottom: 1px solid #fff1f1;
          transition: background 0.12s;
        }
        .at-row:last-child { border-bottom: none; }
        .at-row:hover { background: #fff8f8; }

        .at-td {
          padding: 16px 24px;
          font-size: 14px;
          color: #374151;
          vertical-align: middle;
        }
        .at-td.right { text-align: right; }
        .at-td.center { text-align: center; }

        /* Asset name cell */
        .at-asset-name {
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          line-height: 1.3;
        }
        .at-asset-tag {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
          font-family: monospace;
        }

        /* Category pill */
        .at-category {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 3px 10px;
          white-space: nowrap;
        }

        /* Status badge */
        .at-status {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 11px;
          border-radius: 99px;
          border: 1px solid;
          white-space: nowrap;
        }

        /* Value */
        .at-value {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #111827;
          white-space: nowrap;
        }

        /* Action buttons */
        .at-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .at-btn {
          width: 32px; height: 32px;
          border-radius: 9px;
          border: 1px solid;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.14s, transform 0.14s, box-shadow 0.14s;
          flex-shrink: 0;
        }
        .at-btn:hover { transform: translateY(-1px); }
        .at-btn-view {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }
        .at-btn-view:hover {
          background: #dbeafe;
          box-shadow: 0 3px 10px rgba(37,99,235,0.18);
        }
        .at-btn-transfer {
          background: #fffbeb;
          border-color: #fde68a;
          color: #d97706;
        }
        .at-btn-transfer:hover {
          background: #fef3c7;
          box-shadow: 0 3px 10px rgba(217,119,6,0.18);
        }
        .at-btn-dispose {
          background: #fff1f1;
          border-color: #fecaca;
          color: #dc2626;
        }
        .at-btn-dispose:hover {
          background: #fee2e2;
          box-shadow: 0 3px 10px rgba(220,38,38,0.18);
        }

        /* Empty state */
        .at-empty {
          text-align: center;
          padding: 64px 24px;
          color: #d1d5db;
          font-size: 14px;
        }
        .at-empty-icon {
          width: 48px; height: 48px;
          background: #fff1f1;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
          color: #fca5a5;
        }
      `}</style>

      <div className="at-root">
        <div style={{ padding: "10px", textAlign: "right" }}>
          <button
            onClick={handleExportCSV}
            className="at-btn at-btn-view"
            style={{ width: "auto", padding: "0 15px", fontSize: "13px" }}
          >
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
                    <div className="at-empty-icon">
                      <Trash2 size={22} />
                    </div>
                    No assets found.
                  </div>
                </td>
              </tr>
            ) : (
              localAssets.map((asset) => {
                const s = statusStyle(asset.status);
                return (
                  <tr key={asset.id} className="at-row">
                    {/* Name + Tag */}
                    <td className="at-td">
                      <div className="at-asset-name">{asset.name}</div>
                      <div className="at-asset-tag">{asset.tag_number}</div>
                    </td>

                    {/* Category */}
                    <td className="at-td">
                      <span className="at-category">{asset.category}</span>
                    </td>

                    {/* Status */}
                    <td className="at-td">
                      <span
                        className="at-status"
                        style={{
                          background: s.bg,
                          color: s.color,
                          borderColor: s.border,
                        }}
                      >
                        {asset.status}
                      </span>
                    </td>

                    {/* Value */}
                    <td className="at-td right">
                      <span className="at-value">
                        ₱{parseFloat(asset.total_cost).toLocaleString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="at-td center">
                      <div className="at-actions">
                        <button
                          title="View Details"
                          className="at-btn at-btn-view"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => handleDispose(asset)}
                          title="Delete"
                          className="at-btn at-btn-dispose"
                        >
                          <Trash2 size={15} />
                        </button>

                        {role === "head" && asset.status === "Active" && (
                          <button
                            onClick={() => handleTransfer(asset)}
                            title="Transfer"
                            className="at-btn at-btn-transfer"
                          >
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
    </>
  );
};

export default AssetTable;
