/**
 * Application-wide constants
 */

// User roles
export const ROLES = {
  ADMIN: 'admin',
  HEAD: 'head',
  STAFF: 'staff',
  ACCOUNTANT: 'accountant',
};

// Asset statuses
export const ASSET_STATUS = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  DISPOSED: 'Disposed',
  TRANSFERRED: 'Transferred',
};

// Asset categories (if needed)
export const ASSET_CATEGORIES = {
  VEHICLE: 'Vehicle',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  ELECTRONICS: 'Electronics',
  BUILDING: 'Building',
  LAND: 'Land',
  OTHER: 'Other',
};

// PIN security configuration
export const PIN_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  SALT_LENGTH: 16,
  ITERATIONS: 100000,
  KEY_LENGTH: 32,
};

// Query configuration
export const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  GC_TIME: 10 * 60 * 1000, // 10 minutes
  RETRY: 1,
  REFETCH_ON_WINDOW_FOCUS: false,
};

// Auto-refresh configuration
export const AUTO_REFRESH_CONFIG = {
  IDLE_TIMEOUT: 55 * 60 * 1000, // 55 minutes
  REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes
};

// API configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
};

// Navigation items based on roles
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'summary', label: 'Asset', icon: 'Table' },
  { id: 'downpayment', label: 'Downpayment', icon: 'TrendingUp' },
  { id: 'logs', label: 'Logs', icon: 'ClipboardList', adminOnly: true },
];

// Log action types
export const LOG_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_ASSET: 'CREATE_ASSET',
  EDIT_ASSET: 'EDIT_ASSET',
  DELETE_ASSET: 'DELETE_ASSET',
  TRANSFER_ASSET: 'TRANSFER_ASSET',
  DISPOSE_ASSET: 'DISPOSE_ASSET',
  UPDATE_DOWNPAYMENT: 'UPDATE_DOWNPAYMENT',
  DELETE_DOWNPAYMENT: 'DELETE_DOWNPAYMENT',
  DELETE_LOGS: 'DELETE_LOGS',
};

