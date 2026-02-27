import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  X,
  Package,
  Tag,
  Hash,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  FileText,
  CheckCircle2,
  MapPin,
  User,
  AlignLeft,
} from "lucide-react";

const AddAssetForm = ({ onComplete, onCancel, userRole = "accountant" }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: userRole === "admin" ? "Active" : "Pending",
    tag_number: "",
    reference_number: "",
    serial_number: "",
    quantity: 1,
    unit_cost: 0,
    salvage_value: 0,
    useful_life_years: 1,
    purchase_date: "",
    location: "",
    assigned_to: "",
    current_company: "HQ",
    is_existing: false,
  });

  // Auto-generate tag number on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("assets").select("category");
      if (data) {
        const uniqueCats = [...new Set(data.map((item) => item.category))]
          .filter((c) => c && c.trim() !== "")
          .sort();
        setCategories(uniqueCats);
      }
    };

    const generateTagNumber = async () => {
      // Fetch all assets to find the highest tag number
      const { data, error } = await supabase
        .from("assets")
        .select("tag_number")
        .not("tag_number", "is", null)
        .order("tag_number", { ascending: false });

      if (error) {
        console.error("Error fetching tag numbers:", error);
        // Default to TAG-001 if error
        setFormData((prev) => ({ ...prev, tag_number: "TAG-001" }));
        return;
      }

      let nextNum = 1;
      if (data && data.length > 0) {
        // Find the highest numeric tag number
        data.forEach((item) => {
          const match = item.tag_number?.match(/^TAG-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= nextNum) {
              nextNum = num + 1;
            }
          }
        });
      }

      // Format: TAG-001, TAG-002, etc.
      const newTag = `TAG-${nextNum.toString().padStart(3, "0")}`;
      setFormData((prev) => ({ ...prev, tag_number: newTag }));
    };

    fetchCategories();
    generateTagNumber();
  }, []);

  const handleCategorySelect = (e) => {
    const val = e.target.value;
    if (val === "___NEW___") {
      setIsNewCategory(true);
      setFormData({ ...formData, category: "" });
    } else {
      setFormData({ ...formData, category: val });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const totalCost = formData.quantity * formData.unit_cost;

    const assetData = {
      ...formData,
      total_cost: totalCost,
    };

    const { error } = await supabase.from("assets").insert([assetData]);
    if (error) {
      alert("Error adding asset: " + error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onComplete();
  };

  const totalCost = (formData.quantity * formData.unit_cost).toFixed(2);
  const annualDepr =
    formData.useful_life_years > 0
      ? (
          (formData.unit_cost * formData.quantity - formData.salvage_value) /
          formData.useful_life_years
        ).toFixed(2)
      : "0.00";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(17,8,8,0.45);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: overlayIn 0.2s ease both;
        }
        @keyframes overlayIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        .modal-box {
          font-family: 'DM Sans', sans-serif;
          background: #ffffff;
          border-radius: 22px;
          width: 100%; max-width: 640px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(220,38,38,0.15), 0 8px 32px rgba(0,0,0,0.12);
          border: 1px solid #fde8e8;
          animation: modalIn 0.28s cubic-bezier(.22,.61,.36,1) both;
          scrollbar-width: thin;
          scrollbar-color: #fca5a5 #fff5f5;
        }
        .modal-box::-webkit-scrollbar { width: 4px; }
        .modal-box::-webkit-scrollbar-track { background: #fff5f5; }
        .modal-box::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          position: sticky; top: 0; z-index: 10;
          background: #ffffff;
          padding: 22px 26px 18px;
          border-bottom: 1px solid #fef0f0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .modal-header-left { display: flex; align-items: center; gap: 12px; }
        .modal-icon-wrap {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #dc2626, #f43f5e);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(220,38,38,0.3);
          flex-shrink: 0;
        }
        .modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 17px; font-weight: 800; color: #111827;
        }
        .modal-subtitle { font-size: 11.5px; color: #9ca3af; margin-top: 1px; }
        .close-btn {
          width: 32px; height: 32px;
          border-radius: 9px; border: 1.5px solid #fde8e8;
          background: #fff5f5; color: #9ca3af;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .close-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        .modal-body { padding: 22px 26px; }

        .form-section-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: #ef4444; margin-bottom: 12px; margin-top: 4px;
          display: flex; align-items: center; gap: 6px;
        }
        .form-section-label::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg, #fecaca, transparent);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) { .form-grid { grid-template-columns: 1fr; } }
        .full-width { grid-column: 1 / -1; }

        .field { display: flex; flex-direction: column; gap: 5px; }
        .field-label {
          font-size: 11.5px; font-weight: 600; color: #374151;
          display: flex; align-items: center; gap: 5px;
        }
        .field-label svg { color: #f87171; flex-shrink: 0; }
        .required-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: #ef4444; flex-shrink: 0;
        }

        .field-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400; color: #111827;
          background: #fafafa;
          border: 1.5px solid #f3e8e8;
          border-radius: 10px;
          padding: 9px 12px;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .field-input::placeholder { color: #c4b8b8; }
        .field-input:hover { border-color: #fca5a5; background: #fff; }
        .field-input:focus {
          border-color: #ef4444;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        select.field-input { cursor: pointer; }

        .cost-preview {
          background: linear-gradient(135deg, #fff1f1, #fff8f8);
          border: 1.5px solid #fecaca;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .cost-item { display: flex; flex-direction: column; gap: 2px; }
        .cost-item-label { font-size: 10.5px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
        .cost-item-value {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800; color: #dc2626;
        }
        .cost-divider { width: 1px; height: 36px; background: #fecaca; flex-shrink: 0; }
        .cost-note { font-size: 11px; color: #fca5a5; font-style: italic; }

        .modal-footer {
          padding: 16px 26px 22px;
          display: flex; gap: 10px;
        }
        .btn-cancel {
          flex: 1;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px; font-weight: 600;
          color: #6b7280; background: #f9fafb;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          padding: 11px; cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .btn-cancel:hover { background: #f3f4f6; border-color: #d1d5db; color: #374151; }

        .btn-submit {
          flex: 2;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px; font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          border: none; border-radius: 12px;
          padding: 11px; cursor: pointer;
          box-shadow: 0 4px 18px rgba(220,38,38,0.3);
          transition: filter 0.15s, transform 0.15s, box-shadow 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .btn-submit:hover:not(:disabled) {
          filter: brightness(1.07);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(220,38,38,0.38);
        }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Dark Mode */
        .dark .modal-box { background: #1a1a1a; border-color: #7f1d1d; }
        .dark .modal-box::-webkit-scrollbar-track { background: #262626; }
        .dark .modal-box::-webkit-scrollbar-thumb { background: #525252; }
        .dark .modal-header { background: #1a1a1a; border-color: #374151; }
        .dark .modal-title { color: #f5f5f5; }
        .dark .modal-subtitle { color: #737373; }
        .dark .close-btn { background: #374151; border-color: #4b5563; color: #a3a3a3; }
        .dark .close-btn:hover { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
        .dark .form-section-label { color: #fca5a5; }
        .dark .form-section-label::after { background: linear-gradient(90deg, #7f1d1d, transparent); }
        .dark .field-label { color: #d1d5db; }
        .dark .field-input { background: #374151; border-color: #4b5563; color: #f5f5f5; }
        .dark .field-input::placeholder { color: #737373; }
        .dark .field-input:hover { border-color: #7f1d1d; background: #404040; }
        .dark .field-input:focus { background: #404040; }
        .dark .cost-preview { background: linear-gradient(135deg, #450a0a, #1f1f1f); border-color: #7f1d1d; }
        .dark .cost-item-label { color: #737373; }
        .dark .cost-item-value { color: #fca5a5; }
        .dark .cost-divider { background: #7f1d1d; }
        .dark .cost-note { color: #f87171; }
        .dark .btn-cancel { background: #374151; border-color: #4b5563; color: #a3a3a3; }
        .dark .btn-cancel:hover { background: #404040; color: #e5e5e5; }
        .dark .existing-check { background: #1e3a5f !important; border-color: #1e40af !important; }
        .dark .existing-check span:first-child { color: #f5f5f5 !important; }
        .dark .existing-check span:last-child { color: #a3a3a3 !important; }
      `}</style>

      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <div className="modal-box">
          <div className="modal-header">
            <div className="modal-header-left">
              <div className="modal-icon-wrap">
                <Package size={18} color="#fff" strokeWidth={2.2} />
              </div>
              <div>
                <p className="modal-title">Add New Asset</p>
                <p className="modal-subtitle">
                  Fill in the details below to register an asset
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={onCancel} type="button">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p className="form-section-label">Basic Information</p>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">
                    <Package size={12} /> Asset Name{" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    name="name"
                    placeholder="e.g. Dell Laptop"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Layers size={12} /> Category{" "}
                    <span className="required-dot" />
                  </label>
                  {isNewCategory ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        required
                        name="category"
                        placeholder="Enter new category"
                        value={formData.category}
                        onChange={handleChange}
                        className="field-input"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="close-btn"
                        onClick={() => {
                          setIsNewCategory(false);
                          setFormData({ ...formData, category: "" });
                        }}
                        style={{ height: "auto", width: "42px" }}
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      name="category"
                      value={formData.category}
                      onChange={handleCategorySelect}
                      className="field-input"
                    >
                      <option value="" disabled>
                        Select category…
                      </option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option
                        value="___NEW___"
                        style={{ fontWeight: "bold", color: "#dc2626" }}
                      >
                        + Add New Category
                      </option>
                    </select>
                  )}
                </div>

                <div className="field">
                  <label className="field-label">
                    <Tag size={12} /> Tag Number{" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    name="tag_number"
                    value={formData.tag_number}
                    readOnly
                    className="field-input"
                    style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                    title="Tag number is auto-generated"
                  />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Auto-generated • Cannot be edited
                  </p>
                </div>

                <div className="field">
                  <label className="field-label">
                    <FileText size={12} /> Reference / Invoice #
                  </label>
                  <input
                    name="reference_number"
                    placeholder="e.g. INV-2024-001"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Tag size={12} /> Serial Number
                  </label>
                  <input
                    name="serial_number"
                    placeholder="e.g. SN-12345"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field full-width">
                  <label className="field-label">
                    <AlignLeft size={12} /> Description
                  </label>
                  <input
                    name="description"
                    placeholder="Enter asset description"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field full-width existing-check" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '12px 16px', background: formData.is_existing ? '#eff6ff' : '#fafafa', border: `1.5px solid ${formData.is_existing ? '#bfdbfe' : '#f3e8e8'}`, borderRadius: '10px', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, is_existing: !formData.is_existing })}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_existing} 
                    onChange={() => setFormData({ ...formData, is_existing: !formData.is_existing })}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#111827' }}>Existing Asset</span>
                    <span style={{ fontSize: '11.5px', color: '#6b7280' }}>Check this if the asset was acquired before the system was implemented</span>
                  </div>
                </div>
              </div>

              <p className="form-section-label">Valuation</p>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">
                    <Hash size={12} /> Quantity{" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    type="number"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <DollarSign size={12} /> Unit Cost (₱){" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <DollarSign size={12} /> Salvage Value (₱){" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    name="salvage_value"
                    value={formData.salvage_value}
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Clock size={12} /> Useful Life (Years){" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    name="useful_life_years"
                    value={formData.useful_life_years}
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>
              </div>

              <p className="form-section-label">Logistics</p>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">
                    <Calendar size={12} /> Purchase Date{" "}
                    <span className="required-dot" />
                  </label>
                  <input
                    required
                    type="date"
                    name="purchase_date"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Building2 size={12} /> Current Company{" "}
                    <span className="required-dot" />
                  </label>
                  <select
                    name="current_company"
                    value={formData.current_company}
                    onChange={handleChange}
                    className="field-input"
                  >
                    <option value="HQ">HQ</option>
                    <option value="Company A">Company A</option>
                    <option value="Company B">Company B</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">
                    <MapPin size={12} /> Location
                  </label>
                  <input
                    name="location"
                    placeholder="e.g. Building A, Room 101"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <User size={12} /> Assigned To
                  </label>
                  <input
                    name="assigned_to"
                    placeholder="e.g. John Doe"
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>
              </div>

              <div className="cost-preview">
                <div className="cost-item">
                  <span className="cost-item-label">Total Cost</span>
                  <span className="cost-item-value">
                    ₱
                    {parseFloat(totalCost).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="cost-divider" />
                <div className="cost-item">
                  <span className="cost-item-label">Annual Depreciation</span>
                  <span className="cost-item-value" style={{ fontSize: 17 }}>
                    ₱
                    {parseFloat(annualDepr).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="cost-note">
                  Auto-calculated · Straight-line method
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} strokeWidth={2.5} /> Save Asset
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddAssetForm;
