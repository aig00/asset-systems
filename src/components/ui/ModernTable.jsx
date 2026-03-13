import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  ChevronDown, 
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  ArrowRightLeft,
  Archive,
  Download,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';

/**
 * ModernTable - A clean, SaaS-styled table component
 * Inspired by Stripe, Linear, and Vercel design patterns
 */

// Status badge variants
const statusVariants = {
  active: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700/50',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    label: 'Active',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700/50',
    dot: 'bg-amber-500 dark:bg-amber-400',
    label: 'Pending',
  },
  disposed: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700/50',
    dot: 'bg-red-500 dark:bg-red-400',
    label: 'Disposed',
  },
  transferred: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700/50',
    dot: 'bg-blue-500 dark:bg-blue-400',
    label: 'Transferred',
  },
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700/50',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    label: 'Completed',
  },
};

/**
 * StatusBadge - Soft semantic status indicator
 */
export const StatusBadge = ({ status, variant }) => {
  const variantKey = variant || status?.toLowerCase() || 'pending';
  const config = statusVariants[variantKey] || statusVariants.pending;
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 
      rounded-full text-xs font-semibold uppercase tracking-wide
      ${config.bg} ${config.text} ${config.border}
      border
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

/**
 * ModernSearchBar - Clean search input with icon
 */
export const ModernSearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className = "" 
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full max-w-md pl-10 pr-4 py-2.5 
          bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg
          text-sm text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-200
        "
      />
    </div>
  );
};

/**
 * ModernButton - Primary action button
 */
export const ModernButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon: Icon,
  className = "",
  ...props 
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;
  
  const variants = {
    primary: `
      bg-primary-600 text-white hover:bg-primary-700 
      focus:ring-primary-500 shadow-sm hover:shadow
    `,
    secondary: `
      bg-white text-gray-700 border border-gray-300 
      hover:bg-gray-50 focus:ring-gray-500
    `,
    danger: `
      bg-red-600 text-white hover:bg-red-700 
      focus:ring-red-500 shadow-sm
    `,
    ghost: `
      text-gray-600 hover:text-gray-900 hover:bg-gray-100
      focus:ring-gray-500
    `,
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

/**
 * ActionButton - Individual action icon button
 */
export const ActionButton = ({ 
  icon: Icon, 
  label, 
  variant = 'ghost',
  danger = false,
  onClick,
  className = ""
}) => {
  const variants = {
    ghost: `
      text-gray-400 hover:text-gray-600 hover:bg-gray-100
      ${danger ? 'hover:text-red-600 hover:bg-red-50' : ''}
    `,
    primary: `
      text-primary-600 hover:text-primary-700 hover:bg-primary-50
    `,
    danger: `
      text-red-500 hover:text-red-600 hover:bg-red-50
    `,
  };
  
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        p-1.5 rounded-md transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300
        ${variants[variant]}
        ${className}
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

/**
 * KebabMenu - Dropdown menu for actions
 */
export const KebabMenu = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          p-1.5 rounded-md text-gray-400 hover:text-gray-600 
          hover:bg-gray-100 transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-gray-300
        "
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="
          absolute right-0 mt-1 w-48 
          bg-white border border-gray-200 rounded-lg shadow-lg 
          py-1 z-50 animate-fade-in
        ">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                transition-colors duration-150
                ${action.danger 
                  ? 'text-red-600 hover:bg-red-50' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ModernTable - Main table component
 */
const ModernTable = ({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = "No data found",
  emptyIcon: EmptyIcon,
  loading = false,
  loadingMessage = "Loading...",
}) => {
  const getStatusVariant = (status) => {
    if (!status) return 'pending';
    return status.toLowerCase();
  };
  
  const renderCell = (column, row) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    
    // Auto-detect status columns
    if (column.type === 'status') {
      return <StatusBadge status={row[column.key]} />;
    }
    
    // Auto-detect currency columns
    if (column.type === 'currency') {
      return (
        <span className="font-mono font-medium text-gray-900">
          ₱{parseFloat(row[column.key] || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    }
    
    // Auto-detect number columns
    if (column.type === 'number') {
      return (
        <span className="font-mono text-gray-900">
          {typeof row[column.key] === 'number' 
            ? row[column.key].toLocaleString() 
            : row[column.key]
          }
        </span>
      );
    }
    
    return row[column.key];
  };
  
  return (
    <div className="w-full overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`
                    px-4 py-3 text-left text-xs font-semibold 
                    text-gray-500 dark:text-slate-300 uppercase tracking-wider
                    bg-gray-50 dark:bg-slate-800
                    ${column.align === 'right' ? 'text-right' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.width ? column.width : ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{loadingMessage}</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    {EmptyIcon ? (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <EmptyIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <p className="text-sm text-gray-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`
                        px-4 py-3.5 text-sm text-gray-700
                        ${column.align === 'right' ? 'text-right' : ''}
                        ${column.align === 'center' ? 'text-center' : ''}
                      `}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModernTable;

