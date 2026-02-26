import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import PinVerificationModal from "./PinVerificationModal";
import { useAuth } from "../context/AuthContext";
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
  Lock,
  FolderOutput,
  ChevronDown,
} from "lucide-react";

const MODAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .as-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(15, 5, 5, 0.48);
    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: asOverlayIn 0.18s ease both;
    overflow-y: auto;
  }
  @keyframes asOverlayIn { from { opacity: 0; } to { opacity: 1; } }

  .as-modal {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    border-radius: 22px;
    width: 100%;
    box-shadow:
      0 32px 96px rgba(220,38,38,0.16),
      0 8px 32px rgba(0,0,0,0.12);
    border: 1px solid #fde8e8;
    animation: asModalIn 0.26s cubic-bezier(.22,.61,.36,1) both;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 40px);
    position: relative;
    margin: auto;
  }
  .as-modal-sm  { max-width: 460px; }
  .as-modal-md  { max-width: 580px; }
  .as-modal-lg  { max-width: 700px; }

  @keyframes asModalIn {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .as-header {
    padding: 22px 26px 18px;
    border-bottom: 1px solid #fef0f0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    border-radius: 22px 22px 0 0;
  }
  .as-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .as-icon-wrap {
    width: 50px; height: 50px; border-radius: 15px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .as-icon-red    { background: linear-gradient(135deg, #dc2626, #f43f5e); box-shadow: 0 3px 12px rgba(220,38,38,0.32); }
  .as-icon-amber  { background: linear-gradient(135deg, #d97706, #f59e0b); box-shadow: 0 3px 12px rgba(217,119,6,0.30); }
  .as-icon-danger { background: linear-gradient(135deg, #991b1b, #dc2626); box-shadow: 0 3px 12px rgba(153,27,27,0.32); }
  .as-icon-blue   { background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 3px 12px rgba(37,99,235,0.30); }
  .as-icon-indigo { background: linear-gradient(135deg, #4338ca, #6366f1); box-shadow: 0 3px 12px rgba(67,56,202,0.30); }

  .as-header-titles { min-width: 0; }
  .as-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .as-subtitle { font-size: 13px; color: #9ca3af; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .as-close {
    width: 32px; height: 32px; border-radius: 9px;
    border: 1.5px solid #fde8e8; background: #fff5f5;
    color: #9ca3af; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.13s, color 0.13s, border-color 0.13s;
    flex-shrink: 0;
  }
  .as-close:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

  .as-body {
    padding: 32px 36px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .as-body::-webkit-scrollbar { width: 5px; }
  .as-body::-webkit-scrollbar-track { background: #fff5f5; border-radius: 4px; }
  .as-body::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; }

  .as-footer {
    padding: 16px 26px 22px;
    display: flex; gap: 10px; flex-shrink: 0;
    border-top: 1px solid #fef0f0;
    border-radius: 0 0 22px 22px;
  }

  .as-info-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 18px; margin-bottom: 24px;
  }
  .as-info-item {
    background: #fafafa; border: 1px solid #f3e8e8;
    border-radius: 11px; padding: 16px 20px;
  }
  .as-info-item.full { grid-column: 1 / -1; }
  .as-info-label {
    font-size: 11px; font-weight: 700; color: #9ca3af;
    text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 4px;
  }
  .as-info-value { font-size: 14.5px; font-weight: 600; color: #111827; }

  .as-amort-box {
    background: linear-gradient(135deg, #fff1f1, #fff8f8);
    border: 1.5px solid #fecaca; border-radius: 14px;
    padding: 18px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .as-amort-box:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(220,38,38,0.12); }
  .as-amort-label { font-size: 11.5px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .as-amort-value { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #dc2626; }
  .as-amort-sub { font-size: 12px; color: #fca5a5; margin-top: 3px; }
  .as-amort-hint { font-size: 12px; color: #f87171; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

  .as-status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 4px 12px; border-radius: 99px; border: 1px solid;
  }
  .as-status-active      { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .as-status-transferred { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .as-status-disposed    { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .as-status-pending     { background: #fef3c7; color: #d97706; border-color: #fde68a; }

  .as-warn-box {
    background: #fff7ed; border: 1.5px solid #fed7aa;
    border-radius: 13px; padding: 14px 16px;
    display: flex; align-items: flex-start; gap: 11px;
    margin-bottom: 18px;
  }
  .as-warn-box.danger { background: #fef2f2; border-color: #fecaca; }
  .as-warn-text { font-size: 14px; color: #92400e; line-height: 1.55; }
  .as-warn-box.danger .as-warn-text { color: #991b1b; }
  .as-warn-text strong { font-weight: 700; }

  .as-select {
    font-family: 'DM Sans', sans-serif;
    font-size: 14.5px; color: #111827;
    background: #fafafa; border: 1.5px solid #f3e8e8;
    border-radius: 11px; padding: 11px 14px;
    width: 100%; outline: none; cursor: pointer;
    transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
    margin-bottom: 4px;
    -webkit-appearance: none;
    appearance: none;
  }
  .as-select:focus { border-color: #ef4444; background: #fff; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }

  .as-section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
    color: #ef4444; margin-bottom: 11px; margin-top: 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .as-section-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, #fecaca, transparent); }
  .as-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .as-form-grid .full { grid-column: 1 / -1; }
  .as-field { display: flex; flex-direction: column; gap: 5px; }
  .as-field-label {
    font-size: 12.5px; font-weight: 600; color: #374151;
    display: flex; align-items: center; gap: 5px;
  }
  .as-field-label svg { color: #f87171; flex-shrink: 0; }
  .as-input {
    font-family: 'DM Sans', sans-serif; font-size: 14px; color: #111827;
    background: #fafafa; border: 1.5px solid #f3e8e8; border-radius: 10px;
    padding: 10px 13px; outline: none; width: 100%;
    transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
  }
  .as-input::placeholder { color: #c4b8b8; }
  .as-input:hover { border-color: #fca5a5; background: #fff; }
  .as-input:focus { border-color: #ef4444; background: #fff; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }

  .as-btn-cancel {
    flex: 1; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    color: #6b7280; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 11px;
    padding: 11px; cursor: pointer; transition: background 0.13s, color 0.13s;
  }
  .as-btn-cancel:hover { background: #f3f4f6; color: #374151; }

  .as-btn-primary {
    flex: 2; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
    color: #fff; border: none; border-radius: 11px; padding: 11px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: filter 0.14s, transform 0.14s, box-shadow 0.14s;
  }
  .as-btn-primary:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
  .as-btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }
  .as-btn-red    { background: linear-gradient(135deg, #dc2626, #ef4444); box-shadow: 0 4px 16px rgba(220,38,38,0.28); }
  .as-btn-amber  { background: linear-gradient(135deg, #d97706, #f59e0b); box-shadow: 0 4px 16px rgba(217,119,6,0.26); }
  .as-btn-indigo { background: linear-gradient(135deg, #4338ca, #6366f1); box-shadow: 0 4px 16px rgba(67,56,202,0.26); }
  .as-btn-danger { background: linear-gradient(135deg, #991b1b, #dc2626); box-shadow: 0 4px 16px rgba(153,27,27,0.30); }
  .as-btn-red:hover:not(:disabled)    { box-shadow: 0 7px 22px rgba(220,38,38,0.38); }
  .as-btn-amber:hover:not(:disabled)  { box-shadow: 0 7px 22px rgba(217,119,6,0.34); }
  .as-btn-indigo:hover:not(:disabled) { box-shadow: 0 7px 22px rgba(67,56,202,0.34); }
  .as-btn-danger:hover:not(:disabled) { box-shadow: 0 7px 22px rgba(153,27,27,0.38); }

  .as-btn-back {
    background: #fff; border: 1.5px solid #e5e7eb; color: #374151;
    padding: 7px 13px; border-radius: 9px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    display: inline-flex; align-items: center; gap: 5px;
    transition: border-color 0.13s, background 0.13s;
    flex-shrink: 0;
  }
  .as-btn-back:hover { border-color: #d1d5db; background: #f9fafb; }

  .date-inputs { display: flex; gap: 14px; margin-bottom: 18px; }
  .date-field { flex: 1; }
  .date-label {
    display: block; font-size: 11.5px; font-weight: 700;
    color: #6b7280; margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .date-input {
    width: 100%; padding: 10px 12px;
    border: 1.5px solid #f3e8e8; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; color: #374151;
    background: #fafafa; outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .date-input:focus { border-color: #dc2626; background: #fff; }

  .sched-list {
    display: flex; flex-direction: column;
    border: 1px solid #fde8e8; border-radius: 12px; overflow: hidden;
  }
  .sched-row {
    display: flex; justify-content: space-between;
    padding: 13px 20px;
    border-bottom: 1px solid #fef0f0;
    font-size: 14px;
    transition: background 0.1s;
  }
  .sched-row:last-child { border-bottom: none; }
  .sched-row:nth-child(even) { background: #faf9f9; }
  .sched-row:not(.sched-total):hover { background: #fff5f5; }
  .sched-date { font-weight: 500; color: #4b5563; }
  .sched-amount { font-weight: 700; color: #dc2626; font-family: 'Syne', sans-serif; font-size: 14px; }
  .sched-amount.zero { color: #d1d5db; }
  .sched-total {
    background: #fff1f1 !important;
    border-top: 2px solid #fecaca !important;
  }
  .sched-total .sched-date { color: #991b1b; font-weight: 700; }
  .sched-total .sched-amount { color: #991b1b; font-size: 15px; }
  .pin-modal-input { width: 100%; padding: 12px 16px; border: 1.5px solid #f3e8e8; border-radius: 10px; font-size: 18px; text-align: center; letter-spacing: 8px; font-weight: bold; outline: none; transition: border-color 0.15s; }
  .pin-modal-input:focus { border-color: #dc2626; }
  .pin-error { color: #dc2626; font-size: 13px; margin-top: 8px; text-align: center; }

  /* Dark Mode */
  .dark .as-modal { background: #1a1a1a; border-color: #7f1d1d; }
  .dark .as-header { border-color: #374151; }
  .dark .as-title { color: #f5f5f5; }
  .dark .as-subtitle { color: #737373; }
  .dark .as-close { background: #374151; border-color: #4b5563; color: #a3a3a3; }
  .dark .as-close:hover { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
  .dark .as-body::-webkit-scrollbar-track { background: #262626; }
  .dark .as-footer { border-color: #374151; }
  .dark .as-info-item { background: #262626; border-color: #404040; }
  .dark .as-info-label { color: #737373; }
  .dark .as-info-value { color: #f5f5f5; }
  .dark .as-amort-box { background: linear-gradient(135deg, #450a0a, #1f1f1f); border-color: #7f1d1d; }
  .dark .as-amort-label { color: #737373; }
  .dark .as-amort-value { color: #fca5a5; }
  .dark .as-status-active { background: #052e16; color: #4ade80; border-color: #166534; }
  .dark .as-status-transferred { background: #451a03; color: #fbbf24; border-color: #78350f; }
  .dark .as-status-disposed { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
  .dark .as-status-pending { background: #451a03; color: #fbbf24; border-color: #78350f; }
  .dark .as-warn-box { background: #451a03; border-color: #78350f; }
  .dark .as-warn-text { color: #fbbf24; }
  .dark .as-warn-box.danger { background: #450a0a; border-color: #7f1d1d; }
  .dark .as-warn-box.danger .as-warn-text { color: #fca5a5; }
  .dark .as-select { background: #374151; border-color: #4b5563; color: #f5f5f5; }
  .dark .as-section-label { color: #fca5a5; }
  .dark .as-input { background: #374151; border-color: #4b5563; color: #f5f5f5; }
  .dark .as-btn-cancel { background: #374151; border-color: #4b5563; color: #a3a3a3; }
  .dark .date-label { color: #a3a3a3; }
  .dark .date-input { background: #374151; border-color: #4b5563; color: #f5f5f5; }
  .dark .sched-list { border-color: #7f1d1d; }
  .dark .sched-row { border-color: #374151; background: transparent; }
  .dark .sched-row:nth-child(even) { background: #262626; }
  .dark .sched-date { color: #a3a3a3; }
  .dark .sched-amount { color: #f87171; }
  .dark .sched-total { background: #450a0a !important; border-color: #7f1d1d !important; }
  .dark .sched-total .sched-date, .dark .sched-total .sched-amount { color: #fca5a5; }
`;

const TABLE_STYLES = `
  .at-search-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 28px;
    background: #fff;
    border-bottom: 1px solid #fde8e8;
  }
  .at-search-input-wrapper {
    position: relative;
    flex: 1;
    max-width: 400px;
  }
  .at-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }
  .at-search-input {
    width: 100%;
    padding: 10px 14px 10px 42px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #111827;
    background: #fafafa;
    border: 1.5px solid #f3e8e8;
    border-radius: 10px;
    outline: none;
    transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
  }
  .at-search-input::placeholder { color: #9ca3af; }
  .at-search-input:hover { border-color: #fca5a5; background: #fff; }
  .at-search-input:focus { border-color: #ef4444; background: #fff; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
  .at-search-results {
    font-size: 13px;
    color: #6b7280;
    white-space: nowrap;
  }

  .at-wrap { background: #fff; border-radius: 0; overflow: hidden; }
  .at-scroll { overflow-x: auto; }
  .at-scroll::-webkit-scrollbar { height: 4px; }
  .at-scroll::-webkit-scrollbar-track { background: #fff5f5; }
  .at-scroll::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; }
  .at-table { width: 100%; border-collapse: collapse; min-width: 640px; }

  .at-thead th {
    background: #fff7f7;
    padding: 18px 28px;
    font-size: 11.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: #ef4444; text-align: left;
    border-bottom: 1px solid #fde8e8;
    white-space: nowrap;
  }
  .at-thead th:last-child { text-align: right; }

  .at-row { border-bottom: 1px solid #fff1f1; transition: background 0.12s; }
  .at-row:last-child { border-bottom: none; }
  .at-row:hover { background: #fff8f8; }

  .at-td { padding: 20px 28px; font-size: 14px; color: #374151; white-space: nowrap; vertical-align: middle; }
  .at-td-tag { font-weight: 700; color: #111827; font-family: monospace; font-size: 13.5px; }
  .at-td-name { font-weight: 500; color: #1a1a1a; }
  .at-td-actions { text-align: right; }

  .at-status {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 4px 11px; border-radius: 99px; border: 1px solid;
  }
  .at-status-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .at-status-active      { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .as-status-active .at-status-dot { background: #16a34a; }
  .at-status-transferred { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .as-status-transferred .at-status-dot { background: #d97706; }
  .at-status-disposed    { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .as-status-disposed .at-status-dot { background: #dc2626; }
  .at-status-pending     { background: #fef3c7; color: #d97706; border-color: #fde68a; }
  .at-status-pending .at-status-dot { background: #d97706; }

  .at-existing-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 6px; border: 1px solid;
    background: #e0e7ff; color: #4338ca; border-color: #c7d2fe;
    margin-left: 6px;
  }

  .at-action-btn {
    width: 32px; height: 32px; border-radius: 9px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1.5px solid transparent; cursor: pointer;
    background: transparent;
    transition: background 0.13s, border-color 0.13s, color 0.13s, transform 0.13s;
    margin-left: 4px;
  }
  .at-action-btn:first-child { margin-left: 0; }
  .at-action-btn:hover { transform: translateY(-1px); }
  .at-btn-view   { color: #3b82f6; } .at-btn-view:hover   { background: #eff6ff; border-color: #bfdbfe; }
  .at-btn-edit   { color: #6366f1; } .at-btn-edit:hover   { background: #eef2ff; border-color: #c7d2fe; }
  .at-btn-xfer   { color: #d97706; } .at-btn-xfer:hover   { background: #fffbeb; border-color: #fde68a; }
  .at-btn-dispos { color: #dc2626; } .at-btn-dispos:hover { background: #fef2f2; border-color: #fecaca; }
  .at-btn-del    { color: #9ca3af; } .at-btn-del:hover    { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

  .at-btn-approve { color: #16a34a; } .at-btn-approve:hover { background: #f0fdf4; border-color: #bbf7d0; }
  .at-btn-reject { color: #dc2626; } .at-btn-reject:hover { background: #fef2f2; border-color: #fecaca; }

  .at-empty { padding: 64px 24px; text-align: center; color: #d1d5db; font-size: 15px; }

  /* Dark Mode */
  .dark .at-search-bar { background: #1a1a1a; border-bottom-color: #7f1d1d; }
  .dark .at-search-input { background: #374151; border-color: #4b5563; color: #f9fafb; }
  .dark .at-search-input::placeholder { color: #737373; }
  .dark .at-search-results { color: #a3a3a3; }
  .dark .at-wrap { background: #1a1a1a; }
  .dark .at-scroll::-webkit-scrollbar-track { background: #262626; }
  .dark .at-scroll::-webkit-scrollbar-thumb { background: #525252; }
  .dark .at-thead th { background: #450a0a; color: #fca5a5; border-bottom-color: #7f1d1d; }
  .dark .at-row { border-bottom-color: #374151; }
  .dark .at-row:hover { background: #374151; }
  .dark .at-td { color: #d1d5db; }
  .dark .at-td-tag { color: #f9fafb; }
  .dark .at-td-name { color: #f3f4f6; }
  .dark .at-status-active { background: #052e16; color: #4ade80; border-color: #166534; }
  .dark .at-status-transferred { background: #451a03; color: #fbbf24; border-color: #78350f; }
  .dark .at-status-disposed { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
  .dark .at-status-pending { background: #451a03; color: #fbbf24; border-color: #78350f; }
  .dark .at-existing-badge { background: #312e81; color: #a5b4fc; border-color: #3730a3; }
  .dark .at-btn-view { color: #60a5fa; }
  .dark .at-btn-edit { color: #a5b4fc; }
  .dark .at-btn-xfer { color: #fbbf24; }
  .dark .at-btn-dispos { color: #fca5a5; }
  .dark .at-btn-del { color: #737373; }
  .dark .at-btn-approve { color: #4ade80; }
  .dark .at-btn-reject { color: #fca5a5; }
  .dark .at-empty { color: #525252; }
`;

const AssetSummary = ({ assets, userRole, userEmail, refreshData, showPendingOnly = false }) => {
  const { verifyPin, checkPinLockStatus } = useAuth();
  
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [transferCompany, setTransferCompany] = useState("");
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [amortizationDates, setAmortizationDates] = useState({
    start: "2026-02",
    end: "2027-12",
  });

  // PIN Verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  // Export by Category state
  const [showExportCategoryModal, setShowExportCategoryModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Verify PIN function - used by PinVerificationModal (SECURE)
  const handlePinVerify = async (enteredPin) => {
    // Check if account is locked first
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      setPinError(`Account locked. Try again in ${lockStatus.remainingTime}`);
      return false;
    }
    
    // Use secure PIN verification from AuthContext
    const result = await verifyPin(enteredPin);
    
    if (result.success) {
      setShowPinModal(false);
      setPinError("");
      // Execute the pending action after successful PIN verification
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

  // Open PIN modal for protected actions
  const openWithPin = (action) => {
    setPendingAction(() => action);
    setShowPinModal(true);
    setPinError("");
  };

  // OPTIMIZATION 1: Memoize payment completion calculation
  const calculatePaymentCompletion = React.useCallback((asset) => {
    const totalCost = parseFloat(asset.total_cost) || 0;
    const downpayment = parseFloat(asset.downpayment_amount) || 0;
    if (totalCost === 0) return 0;
    return Math.min((downpayment / totalCost) * 100, 100);
  }, []);

  // OPTIMIZATION 2: Memoize amortization calculation
  const calculateAmortization = React.useCallback((asset) => {
    const cost = parseFloat(asset.total_cost || 0);
    const salvage = parseFloat(asset.salvage_value || 0);
    const lifeMonths = (parseInt(asset.useful_life_years) || 1) * 12;
    return ((cost - salvage) / lifeMonths).toFixed(2);
  }, []);

  // OPTIMIZATION 3: Memoize filtered assets to avoid recalculating on every render
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

  // OPTIMIZATION 4: Memoize amortization schedule to avoid recalculating on every render
  const getAssetAmortizationSchedule = React.useCallback(() => {
    if (!selectedAsset || !amortizationDates.start || !amortizationDates.end)
      return [];

    const start = new Date(amortizationDates.start);
    const end = new Date(amortizationDates.end);
    const schedule = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();

    const [pYear, pMonth] = selectedAsset.purchase_date.split("-").map(Number);
    const startDepreciationDate = new Date(pYear, pMonth, 1);

    const lifeYears = parseFloat(selectedAsset.useful_life_years) || 0;
    const endDepreciationDate = new Date(startDepreciationDate);
    endDepreciationDate.setFullYear(
      endDepreciationDate.getFullYear() + lifeYears,
    );

    const cost = parseFloat(selectedAsset.total_cost) || 0;
    const salvage = parseFloat(selectedAsset.salvage_value) || 0;
    const monthlyDep = lifeYears > 0 ? (cost - salvage) / (lifeYears * 12) : 0;

    while (current.getTime() <= endTime) {
      const amount =
        current >= startDepreciationDate && current < endDepreciationDate
          ? monthlyDep
          : 0;
      schedule.push({
        date: current.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        amount,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return schedule;
  }, [selectedAsset, amortizationDates]);

  // Memoized schedule for the modal
  const schedule = React.useMemo(() => {
    return modalMode === "amortization" ? getAssetAmortizationSchedule() : [];
  }, [modalMode, getAssetAmortizationSchedule]);
  
  const scheduleTotal = React.useMemo(() => {
    return schedule.reduce((sum, i) => sum + i.amount, 0);
  }, [schedule]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalMode]);

  const handleExportAsset = () => {
    const assetDetails = [
      {
        "Asset Name": sanitizeForCSV(selectedAsset.name),
        "Tag Number": sanitizeForCSV(selectedAsset.tag_number),
        Category: sanitizeForCSV(selectedAsset.category || ""),
        Status: sanitizeForCSV(selectedAsset.status || ""),
        Company: sanitizeForCSV(selectedAsset.current_company || ""),
        "Total Cost": selectedAsset.total_cost || 0,
        "Salvage Value": selectedAsset.salvage_value || 0,
        "Useful Life (Years)": selectedAsset.useful_life_years || 0,
        "Purchase Date": sanitizeForCSV(selectedAsset.purchase_date || ""),
        "Reference Number": sanitizeForCSV(selectedAsset.reference_number || ""),
        "Serial Number": sanitizeForCSV(selectedAsset.serial_number || ""),
        Description: sanitizeForCSV(selectedAsset.description || ""),
        Location: sanitizeForCSV(selectedAsset.location || ""),
        "Assigned To": sanitizeForCSV(selectedAsset.assigned_to || ""),
        "Monthly Amortization": sanitizeForCSV(calculateAmortization(selectedAsset)),
      },
    ];

    const amortSchedule = getAssetAmortizationSchedule();
    const scheduleData = amortSchedule.map((item) => ({
      "Period": item.date,
      "Monthly Depreciation": item.amount,
    }));
    
    const amortTotal = amortSchedule.reduce((sum, i) => sum + i.amount, 0);
    scheduleData.push({
      "Period": "Total",
      "Monthly Depreciation": amortTotal,
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(assetDetails);
    XLSX.utils.book_append_sheet(wb, ws1, "Asset Details");
    const ws2 = XLSX.utils.json_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(wb, ws2, "Amortization Schedule");
    XLSX.writeFile(wb, `Asset_${selectedAsset.tag_number}.xlsx`);
  };

  const handleTransfer = async () => {
    if (!transferCompany) return alert("Please select a company");
    setLoading(true);
    const data = [
      {
        "Asset Name": sanitizeForCSV(selectedAsset.name),
        "Tag Number": sanitizeForCSV(selectedAsset.tag_number),
        "Previous Company": sanitizeForCSV(selectedAsset.current_company),
        "New Company": sanitizeForCSV(transferCompany),
        "Transferred By": sanitizeForCSV(userEmail),
        Date: format(new Date(), "yyyy-MM-dd"),
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer Proof");
    XLSX.writeFile(wb, `Transfer_${selectedAsset.tag_number}.xlsx`);
    const { error } = await supabase
      .from("assets")
      .update({ status: "Transferred", current_company: transferCompany })
      .eq("id", selectedAsset.id);
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
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
      if (usefulLifeYears > 0) {
        monthlyAmortization = (totalCost - salvageValue) / (usefulLifeYears * 12);
      }

      const exportData = [
        {
          "Asset Name": sanitizeForCSV(selectedAsset.name),
          Category: sanitizeForCSV(selectedAsset.category),
          Tag: sanitizeForCSV(selectedAsset.tag_number),
          Reference: sanitizeForCSV(selectedAsset.reference_number),
          Qty: quantity,
          "Unit Cost": unitCost,
          "Total Cost": totalCost,
          "Salvage Value": salvageValue,
          "Useful Life": usefulLifeYears,
          "Purchase Date": sanitizeForCSV(selectedAsset.purchase_date),
          "Disposed By": sanitizeForCSV(userEmail),
          "Disposal Date": format(new Date(), "yyyy-MM-dd"),
          "Monthly Amortization": monthlyAmortization.toFixed(2),
        },
      ];
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Disposed Asset");
      XLSX.writeFile(wb, `Disposed_${selectedAsset.tag_number}.csv`);

      const { error: updateError } = await supabase
        .from("assets")
        .update({ status: "Disposed" })
        .eq("id", selectedAsset.id);

      if (updateError) {
        throw updateError;
      }

      setLoading(false);
      closeModal();
      
      if (refreshData) {
        await refreshData();
      } else {
        window.location.reload();
      }

      alert("Asset marked as Disposed and data exported to CSV successfully.");
    } catch (error) {
      console.error("Error disposing asset:", error);
      alert(`Failed to dispose asset: ${error.message}`);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
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
    closeModal();
    if (refreshData) {
      await refreshData();
    } else {
      window.location.reload();
    }
  };

  const handleEditSave = async () => {
    setLoading(true);
    const { total_cost, ...updatePayload } = editForm;
    const { error } = await supabase
      .from("assets")
      .update(updatePayload)
      .eq("id", selectedAsset.id);
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
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

  const handleEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const closeModal = () => {
    setSelectedAsset(null);
    setModalMode(null);
  };

  const statusClass = (s) => {
    if (s === "Active") return "at-status-active";
    if (s === "Transferred") return "at-status-transferred";
    if (s === "Pending") return "at-status-pending";
    return "at-status-disposed";
  };

  const asStatusClass = (s) => {
    if (s === "Active") return "as-status-active";
    if (s === "Transferred") return "as-status-transferred";
    if (s === "Pending") return "as-status-pending";
    return "as-status-disposed";
  };

  const handleApprove = async (assetId) => {
    setLoading(true);
    const { error } = await supabase
      .from("assets")
      .update({ status: "Active" })
      .eq("id", assetId);
    if (error) {
      alert("Error approving asset: " + error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    if (refreshData) {
      await refreshData();
    } else {
      window.location.reload();
    }
  };

  const handleReject = async (assetId) => {
    setLoading(true);
    const { error } = await supabase
      .from("assets")
      .update({ status: "Rejected" })
      .eq("id", assetId);
    if (error) {
      alert("Error rejecting asset: " + error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    if (refreshData) {
      await refreshData();
    } else {
      window.location.reload();
    }
  };

  // Export by Category functions
  const openExportCategoryModal = () => {
    const categories = [...new Set(assets.map(asset => asset.category).filter(Boolean))];
    setAvailableCategories(categories);
    setSelectedCategories(categories);
    setShowExportCategoryModal(true);
  };

  const handleExportByCategory = () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one category to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const summaryData = [];
    let grandTotal = 0;

    selectedCategories.forEach(category => {
      const categoryAssets = assets.filter(asset => asset.category === category);
      if (categoryAssets.length === 0) return;

      const sheetData = categoryAssets.map(asset => {
        const quantity = Number(asset.quantity) || 0;
        const unitCost = Number(asset.unit_cost) || 0;
        const totalCost = Number(asset.total_cost) || 0;
        const salvageValue = Number(asset.salvage_value) || 0;
        const usefulLifeYears = Number(asset.useful_life_years) || 0;
        let monthlyAmortization = 0;
        if (usefulLifeYears > 0) {
          monthlyAmortization = (totalCost - salvageValue) / (usefulLifeYears * 12);
        }
        return {
          "Tag Number": asset.tag_number || "",
          "Asset Name": asset.name || "",
          "Category": asset.category || "",
          "Status": asset.status || "",
          "Company": asset.current_company || "",
          "Quantity": quantity,
          "Unit Cost": unitCost,
          "Total Cost": totalCost,
          "Salvage Value": salvageValue,
          "Useful Life (Years)": usefulLifeYears,
          "Purchase Date": asset.purchase_date || "",
          "Reference Number": asset.reference_number || "",
          "Serial Number": asset.serial_number || "",
          "Description": asset.description || "",
          "Location": asset.location || "",
          "Assigned To": asset.assigned_to || "",
          "Monthly Amortization": monthlyAmortization.toFixed(2)
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const sheetName = category.length > 30 ? category.substring(0, 30) : category;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const categoryTotal = categoryAssets.reduce((sum, a) => sum + (parseFloat(a.total_cost) || 0), 0);
      grandTotal += categoryTotal;
      summaryData.push({
        "Category": category,
        "Asset Count": categoryAssets.length,
        "Total Value": categoryTotal
      });
    });

    summaryData.push({
      "Category": "GRAND TOTAL",
      "Asset Count": selectedCategories.reduce((sum, cat) => sum + assets.filter(a => a.category === cat).length, 0),
      "Total Value": grandTotal
    });
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Assets_By_Category_${dateStr}.xlsx`);
    setShowExportCategoryModal(false);
  };

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <>
      <style>
        {TABLE_STYLES}
        {MODAL_STYLES}
      </style>

      <div className="at-search-bar">
        <div className="at-search-input-wrapper">
          <Search className="at-search-icon" size={18} />
          <input
            type="text"
            className="at-search-input"
            placeholder="Search by name, tag, category, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <span className="at-search-results">
            {filteredAssets.length} of {assets.length} results
          </span>
        )}
        <button 
          onClick={openExportCategoryModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #4338ca, #6366f1)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            marginLeft: 'auto'
          }}
        >
          <FolderOutput size={15} />
          Export by Category
        </button>
      </div>

      <div className="at-wrap">
        <div className="at-scroll">
          <table className="at-table">
            <thead className="at-thead">
              <tr>
                <th>Tag #</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Company</th>
                <th>Total Cost</th>
                {showPendingOnly && <th>Payment</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="at-empty">
                    {searchQuery ? "No assets match your search." : "No assets found. Add one to get started."}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="at-row">
                    <td className="at-td at-td-tag">{asset.tag_number}</td>
                    <td className="at-td at-td-name">{asset.name}{asset.is_existing && <span className="at-existing-badge">Existing</span>}</td>
                    <td className="at-td" style={{ color: "#6b7280", fontSize: 13.5 }}>
                      {asset.category || "—"}
                    </td>
                    <td className="at-td">
                      <span className={`at-status ${statusClass(asset.status)}`}>
                        <span className="at-status-dot" />
                        {asset.status}
                      </span>
                    </td>
                    <td className="at-td" style={{ color: "#6b7280" }}>
                      {asset.current_company || "—"}
                    </td>
                    <td className="at-td" style={{ fontWeight: 600, color: "#111827" }}>
                      ₱{parseFloat(asset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    {showPendingOnly && (
                      <td className="at-td">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: calculatePaymentCompletion(asset) >= 100 ? '#16a34a' : '#d97706' }}>
                            {calculatePaymentCompletion(asset).toFixed(1)}%
                          </span>
                          <div style={{ width: '60px', height: '4px', background: '#f3e8e8', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${calculatePaymentCompletion(asset)}%`, height: '100%', background: calculatePaymentCompletion(asset) >= 100 ? '#16a34a' : '#d97706', borderRadius: '2px' }} />
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="at-td at-td-actions">
                      <button className="at-action-btn at-btn-view" title="View" onClick={() => openModal(asset, "view")}>
                        <Eye size={16} />
                      </button>
                      {(userRole === "head" || userRole === "admin") && (
                        <button className="at-action-btn at-btn-edit" title="Edit" onClick={() => openWithPin(() => openModal(asset, "edit"))}>
                          <Edit size={16} />
                        </button>
                      )}
                      <button className="at-action-btn at-btn-del" title="Delete" onClick={() => openWithPin(() => openModal(asset, "delete"))}>
                        <Trash2 size={16} />
                      </button>
                      {asset.status === "Active" && (
                        <>
                          <button className="at-action-btn at-btn-xfer" title="Transfer" onClick={() => openWithPin(() => openModal(asset, "transfer"))}>
                            <ArrowRightLeft size={16} />
                          </button>
                          <button className="at-action-btn at-btn-dispos" title="Dispose" onClick={() => openWithPin(() => openModal(asset, "dispose"))}>
                            <Archive size={16} />
                          </button>
                        </>
                      )}
                      {asset.status === "Pending" && userRole === "admin" && (
                        <>
                          <button className="at-action-btn at-btn-approve" title="Approve" onClick={() => handleApprove(asset.id)}>
                            <CheckCircle size={16} />
                          </button>
                          <button className="at-action-btn at-btn-reject" title="Reject" onClick={() => handleReject(asset.id)}>
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && selectedAsset && createPortal(
        <div className="as-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          {modalMode === "view" && (
            <div className="as-modal as-modal-md">
              <div className="as-header">
                <div className="as-header-left">
                  <div className="as-icon-wrap as-icon-blue">
                    <Eye size={19} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="as-header-titles">
                    <p className="as-title">Asset Details</p>
                    <p className="as-subtitle">{selectedAsset.name}</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <div className="as-info-grid">
                  <div className="as-info-item full">
                    <p className="as-info-label">Asset Name</p>
                    <p className="as-info-value" style={{ fontSize: 16 }}>{selectedAsset.name}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Tag Number</p>
                    <p className="as-info-value" style={{ fontFamily: "monospace" }}>{selectedAsset.tag_number}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Category</p>
                    <p className="as-info-value">{selectedAsset.category || "—"}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Status</p>
                    <span className={`as-status-badge ${asStatusClass(selectedAsset.status)}`}>{selectedAsset.status}</span>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Company</p>
                    <p className="as-info-value">{selectedAsset.current_company || "—"}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Total Cost</p>
                    <p className="as-info-value">₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Salvage Value</p>
                    <p className="as-info-value">₱{parseFloat(selectedAsset.salvage_value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Useful Life</p>
                    <p className="as-info-value">{selectedAsset.useful_life_years} years</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Purchase Date</p>
                    <p className="as-info-value">{selectedAsset.purchase_date || "—"}</p>
                  </div>
                  {selectedAsset.reference_number && (
                    <div className="as-info-item">
                      <p className="as-info-label">Reference #</p>
                      <p className="as-info-value">{selectedAsset.reference_number}</p>
                    </div>
                  )}
                  {selectedAsset.serial_number && (
                    <div className="as-info-item">
                      <p className="as-info-label">Serial Number</p>
                      <p className="as-info-value">{selectedAsset.serial_number}</p>
                    </div>
                  )}
                  {selectedAsset.description && (
                    <div className="as-info-item full">
                      <p className="as-info-label">Description</p>
                      <p className="as-info-value">{selectedAsset.description}</p>
                    </div>
                  )}
                  {selectedAsset.location && (
                    <div className="as-info-item">
                      <p className="as-info-label">Location</p>
                      <p className="as-info-value">{selectedAsset.location}</p>
                    </div>
                  )}
                  {selectedAsset.assigned_to && (
                    <div className="as-info-item">
                      <p className="as-info-label">Assigned To</p>
                      <p className="as-info-value">{selectedAsset.assigned_to}</p>
                    </div>
                  )}
                </div>
                <div className="as-amort-box" onClick={() => setModalMode("amortization")}>
                  <div>
                    <p className="as-amort-label">Monthly Amortization</p>
                    <p className="as-amort-value">₱{calculateAmortization(selectedAsset)}</p>
                    <p className="as-amort-sub">Straight-line depreciation</p>
                    <p className="as-amort-hint"><ArrowRight size={12} /> Click to view full schedule</p>
                  </div>
                  <TrendingDown size={38} style={{ color: "#fca5a5", opacity: 0.6, flexShrink: 0 }} />
                </div>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Close</button>
                <button className="as-btn-primary as-btn-indigo" onClick={handleExportAsset}>
                  <Download size={15} strokeWidth={2.5} /> Export
                </button>
              </div>
            </div>
          )}

          {modalMode === "amortization" && (
            <div className="as-modal as-modal-md">
              <div className="as-header">
                <div className="as-header-left">
                  <button className="as-btn-back" onClick={() => setModalMode("view")}>
                    <ArrowLeft size={13} /> Back
                  </button>
                  <div className="as-header-titles">
                    <p className="as-title">Amortization Schedule</p>
                    <p className="as-subtitle">{selectedAsset.name}</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <div className="date-inputs">
                  <div className="date-field">
                    <label className="date-label">From</label>
                    <input type="month" className="date-input" value={amortizationDates.start} onChange={(e) => setAmortizationDates({ ...amortizationDates, start: e.target.value })} />
                  </div>
                  <div className="date-field">
                    <label className="date-label">To</label>
                    <input type="month" className="date-input" value={amortizationDates.end} onChange={(e) => setAmortizationDates({ ...amortizationDates, end: e.target.value })} />
                  </div>
                </div>
                <div className="sched-list">
                  {schedule.map((item, idx) => (
                    <div key={idx} className="sched-row">
                      <span className="sched-date">{item.date}</span>
                      <span className={`sched-amount${item.amount === 0 ? " zero" : ""}`}>₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="sched-row sched-total">
                    <span className="sched-date">Total Period</span>
                    <span className="sched-amount">₱{scheduleTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Close</button>
              </div>
            </div>
          )}

          {modalMode === "transfer" && (
            <div className="as-modal as-modal-sm">
              <div className="as-header">
                <div className="as-header-left">
                  <div className="as-icon-wrap as-icon-amber">
                    <ArrowRightLeft size={19} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="as-header-titles">
                    <p className="as-title">Transfer Asset</p>
                    <p className="as-subtitle">{selectedAsset.name}</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <div className="as-warn-box">
                  <Info size={19} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                  <p className="as-warn-text">Transferring from <strong>{selectedAsset.current_company}</strong>. A proof-of-transfer Excel file will be downloaded automatically.</p>
                </div>
                <label className="as-field-label" style={{ marginBottom: 8, display: "flex" }}>
                  <Building2 size={13} /> Destination Company
                </label>
                <select className="as-select" value={transferCompany} onChange={(e) => setTransferCompany(e.target.value)}>
                  <option value="">Select company…</option>
                  <option value="Company A">Company A</option>
                  <option value="Company B">Company B</option>
                  <option value="HQ">HQ</option>
                </select>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Cancel</button>
                <button className="as-btn-primary as-btn-amber" onClick={handleTransfer} disabled={loading}>
                  {loading ? "Processing…" : <><ArrowRight size={15} strokeWidth={2.5} /> Confirm Transfer</>}
                </button>
              </div>
            </div>
          )}

          {modalMode === "dispose" && (
            <div className="as-modal as-modal-sm">
              <div className="as-header">
                <div className="as-header-left">
                  <div className="as-icon-wrap as-icon-red">
                    <Trash2 size={19} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="as-header-titles">
                    <p className="as-title">Dispose Asset</p>
                    <p className="as-subtitle">{selectedAsset.name}</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <div className="as-warn-box danger">
                  <AlertTriangle size={19} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                  <p className="as-warn-text">You are about to dispose of <strong>{selectedAsset.name}</strong>. This will export all data to CSV and <strong>permanently delete</strong> the record from the table.</p>
                </div>
                <div className="as-info-grid" style={{ marginBottom: 0 }}>
                  <div className="as-info-item">
                    <p className="as-info-label">Total Cost</p>
                    <p className="as-info-value">₱{parseFloat(selectedAsset.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="as-info-item">
                    <p className="as-info-label">Salvage Value</p>
                    <p className="as-info-value">₱{parseFloat(selectedAsset.salvage_value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Cancel</button>
                <button className="as-btn-primary as-btn-red" onClick={handleDispose} disabled={loading}>
                  {loading ? "Processing…" : <><CheckCircle2 size={15} strokeWidth={2.5} /> Confirm Disposal</>}
                </button>
              </div>
            </div>
          )}

          {modalMode === "delete" && (
            <div className="as-modal as-modal-sm">
              <div className="as-header">
                <div className="as-header-left">
                  <div className="as-icon-wrap as-icon-danger">
                    <AlertTriangle size={19} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="as-header-titles">
                    <p className="as-title">Delete Asset</p>
                    <p className="as-subtitle">This action is permanent</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <div className="as-warn-box danger">
                  <AlertTriangle size={19} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                  <p className="as-warn-text">You are about to <strong>permanently delete</strong> the record for <strong>{selectedAsset.name}</strong>. This cannot be undone and all data will be lost.</p>
                </div>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Cancel</button>
                <button className="as-btn-primary as-btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? "Deleting…" : <><Trash2 size={15} strokeWidth={2.5} /> Permanently Delete</>}
                </button>
              </div>
            </div>
          )}

          {modalMode === "edit" && (
            <div className="as-modal as-modal-lg">
              <div className="as-header">
                <div className="as-header-left">
                  <div className="as-icon-wrap as-icon-indigo">
                    <Edit size={19} color="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="as-header-titles">
                    <p className="as-title">Edit Asset</p>
                    <p className="as-subtitle">{selectedAsset.name}</p>
                  </div>
                </div>
                <button className="as-close" onClick={closeModal}>
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="as-body">
                <p className="as-section-label">Basic Information</p>
                <div className="as-form-grid">
                  <div className="as-field">
                    <label className="as-field-label"><Package size={13} /> Asset Name</label>
                    <input className="as-input" name="name" value={editForm.name || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Layers size={13} /> Category</label>
                    <input className="as-input" name="category" value={editForm.category || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Tag size={13} /> Tag Number</label>
                    <input className="as-input" name="tag_number" value={editForm.tag_number || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><FileText size={13} /> Reference #</label>
                    <input className="as-input" name="reference_number" value={editForm.reference_number || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Tag size={13} /> Serial Number</label>
                    <input className="as-input" name="serial_number" value={editForm.serial_number || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field full">
                    <label className="as-field-label"><FileText size={13} /> Description</label>
                    <input className="as-input" name="description" value={editForm.description || ""} onChange={handleEditChange} />
                  </div>
                </div>

                <p className="as-section-label">Valuation</p>
                <div className="as-form-grid">
                  <div className="as-field">
                    <label className="as-field-label"><Hash size={13} /> Quantity</label>
                    <input type="number" className="as-input" name="quantity" value={editForm.quantity || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><DollarSign size={13} /> Unit Cost (₱)</label>
                    <input type="number" step="0.01" className="as-input" name="unit_cost" value={editForm.unit_cost || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><DollarSign size={13} /> Salvage Value (₱)</label>
                    <input type="number" step="0.01" className="as-input" name="salvage_value" value={editForm.salvage_value || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Clock size={13} /> Useful Life (Years)</label>
                    <input type="number" className="as-input" name="useful_life_years" value={editForm.useful_life_years || ""} onChange={handleEditChange} />
                  </div>
                </div>

                <p className="as-section-label">Logistics</p>
                <div className="as-form-grid">
                  <div className="as-field">
                    <label className="as-field-label"><Calendar size={13} /> Purchase Date</label>
                    <input type="date" className="as-input" name="purchase_date" value={editForm.purchase_date || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Building2 size={13} /> Company</label>
                    <select className="as-input" name="current_company" value={editForm.current_company || "HQ"} onChange={handleEditChange} style={{ cursor: "pointer" }}>
                      <option value="HQ">HQ</option>
                      <option value="Company A">Company A</option>
                      <option value="Company B">Company B</option>
                    </select>
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Building2 size={13} /> Location</label>
                    <input className="as-input" name="location" value={editForm.location || ""} onChange={handleEditChange} />
                  </div>
                  <div className="as-field">
                    <label className="as-field-label"><Building2 size={13} /> Assigned To</label>
                    <input className="as-input" name="assigned_to" value={editForm.assigned_to || ""} onChange={handleEditChange} />
                  </div>
                </div>

                <p className="as-section-label">Payment (Downpayment)</p>
                <div className="as-form-grid">
                  <div className="as-field full">
                    <label className="as-field-label"><DollarSign size={13} /> Downpayment / Partial Payment (₱)</label>
                    <input type="number" step="0.01" min="0" className="as-input" name="downpayment_amount" value={editForm.downpayment_amount || ""} onChange={handleEditChange} placeholder="Enter downpayment amount if partial payment" />
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Leave as 0 for full payment. Assets with partial payment will appear in Pending section.</p>
                  </div>
                </div>
              </div>
              <div className="as-footer">
                <button className="as-btn-cancel" onClick={closeModal}>Cancel</button>
                <button className="as-btn-primary as-btn-indigo" onClick={handleEditSave} disabled={loading}>
                  {loading ? "Saving…" : <><Save size={15} strokeWidth={2.5} /> Save Changes</>}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* PIN Verification Modal - Rendered via Portal for maximum size */}
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

      {/* Export by Category Modal */}
      {showExportCategoryModal && createPortal(
        <div className="as-overlay" onClick={(e) => e.target === e.currentTarget && setShowExportCategoryModal(false)}>
          <div className="as-modal as-modal-md">
            <div className="as-header">
              <div className="as-header-left">
                <div className="as-icon-wrap as-icon-indigo">
                  <FolderOutput size={19} color="#fff" strokeWidth={2.2} />
                </div>
                <div className="as-header-titles">
                  <p className="as-title">Export by Category</p>
                  <p className="as-subtitle">Select categories to include in export</p>
                </div>
              </div>
              <button className="as-close" onClick={() => setShowExportCategoryModal(false)}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="as-body">
              {availableCategories.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  No categories found in assets.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <button 
                      onClick={() => setSelectedCategories([...availableCategories])}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Select All
                    </button>
                    <button 
                      onClick={() => setSelectedCategories([])}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Deselect All
                    </button>
                  </div>
                  <div style={{ 
                    maxHeight: '300px', 
                    overflowY: 'auto',
                    border: '1px solid #f3e8e8',
                    borderRadius: '10px',
                    padding: '8px'
                  }}>
                    {availableCategories.map(category => (
                      <label 
                        key={category}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>{category}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
                          {assets.filter(a => a.category === category).length} assets
                        </span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px', textAlign: 'center' }}>
                    {selectedCategories.length} of {availableCategories.length} categories selected
                  </p>
                </>
              )}
            </div>
            <div className="as-footer">
              <button className="as-btn-cancel" onClick={() => setShowExportCategoryModal(false)}>Cancel</button>
              <button 
                className="as-btn-primary as-btn-indigo" 
                onClick={handleExportByCategory}
                disabled={selectedCategories.length === 0}
              >
                <Download size={15} strokeWidth={2.5} /> Export to Excel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AssetSummary;
