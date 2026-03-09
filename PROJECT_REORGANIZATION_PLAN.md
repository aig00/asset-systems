# NCT Asset Manager - Project Reorganization Plan

## Executive Summary

This document outlines a comprehensive reorganization plan for the NCT Asset Manager React application. The goal is to create a **scalable, maintainable, and intuitive architecture** that follows industry best practices while addressing current structural issues.

---

## Current State Analysis

### Issues Identified:

1. **Duplicate Components**: Multiple versions of the same components exist in both `src/components/` and `src/features/assets/components/`
2. **Mixed Architecture**: The project inconsistently uses both flat structure and feature-based folder organization
3. **Unused/Nearly Empty Directories**: Many folders like `store/`, `services/`, `routes/` exist but are empty or barely used
4. **Inconsistent Import Paths**: Some files import from `../supabaseClient` while others from `../lib/supabase`
5. **No Clear Separation**: Pages, components, hooks, and utilities are not clearly separated

### Current Import Dependencies:

| Source | Imports From |
|--------|--------------|
| `src/App.jsx` | `./context/AuthContext`, `./context/ThemeContext`, `./components/*`, `./useAutoRefresh` |
| `src/pages/Dashboard.jsx` | `../hooks/*`, `../context/*`, `../components/*`, `../supabaseClient` |
| `src/pages/Login.jsx` | `../context/AuthContext`, `../supabaseClient`, `../assets/*` |
| `src/context/AuthContext.jsx` | `../supabaseClient`, `../utils/security` |
| `src/components/*` | `../supabaseClient`, `../hooks/*`, `../context/*` |

---

## Proposed Structure (Standard React Boilerplate)

```
src/
├── assets/                    # Static assets
│   ├── images/               # Image files (logos, backgrounds)
│   ├── icons/                # Custom icon components
│   └── fonts/                # Custom fonts (if any)
│
├── components/               # SHARED/REUSABLE components
│   ├── ui/                   # Generic UI components (buttons, inputs, cards)
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── Input.jsx
│   │   └── ...
│   ├── layout/               # Layout components
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   └── PageContainer.jsx
│   └── common/               # Shared business components
│       ├── DataTable.jsx
│       ├── ErrorBoundary.jsx
│       ├── ProtectedRoute.jsx
│       └── LoadingSpinner.jsx
│
├── config/                    # Application configuration
│   └── constants.js          # App-wide constants (API URLs, settings)
│
├── context/                   # React Context providers
│   ├── AuthContext.jsx       # Authentication state & logic
│   └── ThemeContext.jsx      # Theme (dark/light mode) state
│
├── hooks/                     # CUSTOM REACT HOOKS (reusable logic)
│   ├── useAssets.js          # Asset data fetching & management
│   ├── usePageFocusFix.js    # Tab visibility fix
│   ├── useSupabaseRealtime.js # Real-time database subscriptions
│   ├── useTabVisibility.js   # Page visibility detection
│   └── useTabVisibilityQuery.js # React Query + visibility
│
├── lib/                       # Third-party library configurations
│   └── supabase.js           # Supabase client initialization
│
├── pages/                     # PAGE COMPONENTS (route destinations)
│   ├── Login.jsx             # Login page
│   ├── Dashboard/            # Dashboard feature (page + related components)
│   │   ├── DashboardPage.jsx
│   │   ├── DashboardCharts.jsx
│   │   ├── AssetSummary.jsx
│   │   ├── AssetTable.jsx
│   │   ├── AddAssetForm.jsx
│   │   ├── DownpaymentTable.jsx
│   │   ├── PinVerificationModal.jsx
│   │   └── SignOutModal.jsx
│   └── Unauthorized.jsx      # 403 unauthorized page
│
├── styles/                    # Global styles
│   ├── index.css             # Tailwind directives + global styles
│   └── variables.css         # CSS custom properties
│
├── utils/                     # UTILITY FUNCTIONS (pure functions)
│   ├── security.js           # PIN hashing, encryption utilities
│   ├── formatters.js         # Date, currency formatting
│   └── validators.js         # Form validation helpers
│
├── App.jsx                    # Root component with routing
├── main.jsx                   # Entry point (React 18)
└── useAutoRefresh.js         # Auto-refresh hook (root-level)
```

---

## Folder Descriptions & Rationale

### 1. `assets/`

**What belongs here:**
- Static files that don't change (logos, brand images)
- Custom icons (SVG files)
- Font files

**Why:**
- Keeps all static assets in one predictable location
- Vite automatically optimizes assets in this folder
- Easier to manage brand consistency

**Migration:**
```
Current: src/assets/*
New: src/assets/* (already correct)
```

### 2. `components/ui/`

**What belongs here:**
- Generic, reusable UI primitives
- Components with no business logic
- Examples: Button, Input, Select, Card, Modal skeleton, Badge, Avatar

**Why:**
- Promotes reusability across the application
- Enables easy design system implementation
- Separates presentation from business logic

**Current state:** Empty (create new UI components here)

### 3. `components/layout/`

**What belongs here:**
- Components that define page structure
- Sidebar, Header, Footer, PageContainer

**Why:**
- Consistent layout across all pages
- Easy to modify global layout in one place

**Current state:** Empty (will move Dashboard sidebar here)

### 4. `components/common/`

**What belongs here:**
- Application-wide shared components
- ErrorBoundary, ProtectedRoute, DataTable, LoadingSpinner

**Why:**
- These components are used across multiple features
- Centralized location for cross-cutting concerns

**Migration:**
```
Current: src/components/ErrorBoundary.jsx     → src/components/common/
Current: src/components/ProtectedRoute.jsx     → src/components/common/
Current: src/components/DataTable.jsx          → src/components/common/
Current: src/components/DataTableExample.jsx   → src/components/common/
```

### 5. `pages/`

**What belongs here:**
- Top-level route components
- Each major view gets its own folder

**Why:**
- Clear mapping between routes and files
- Each page can have its own co-located components
- Easier to manage route definitions

**Migration:**
```
Current: src/pages/Login.jsx              → src/pages/Login/
Current: src/pages/Dashboard.jsx          → src/pages/Dashboard/
Current: src/pages/SignOutModal.jsx       → src/pages/Dashboard/SignOutModal.jsx

# Move Dashboard-related components into Dashboard folder:
Current: src/components/DashboardCharts.jsx    → src/pages/Dashboard/
Current: src/components/AssetSummary.jsx       → src/pages/Dashboard/
Current: src/components/AssetTable.jsx         → src/pages/Dashboard/
Current: src/components/AddAssetForm.jsx       → src/pages/Dashboard/
Current: src/components/DownpaymentTable.jsx   → src/pages/Dashboard/
Current: src/components/PinVerificationModal.jsx → src/pages/Dashboard/
```

### 6. `hooks/`

**What belongs here:**
- Custom React hooks with reusable logic
- Data fetching hooks
- Browser API wrappers

**Why:**
- Hooks are the primary way to share logic in React
- Centralized hook library makes them discoverable

**Current state:** Already well-structured at `src/hooks/`

### 7. `context/`

**What belongs here:**
- React Context providers
- Global state management

**Why:**
- Standard React pattern for global state
- Easy to add new context providers

**Current state:** Already well-structured at `src/context/`

### 8. `lib/`

**What belongs here:**
- Third-party library configuration
- Client initializations (Supabase, axios, etc.)

**Why:**
- Separates library setup from application code
- Easy to update library configuration

**Migration:**
```
Current: src/supabaseClient.js   → DELETE (duplicate)
Current: src/lib/supabase.js    → src/lib/supabase.js (keep, update imports)
```

### 9. `config/`

**What belongs here:**
- Application constants
- Environment variables (exposed to frontend)
- Feature flags

**Why:**
- Single source of truth for app configuration
- Easy to modify settings without code changes

**Current state:** Already has `src/config/constants.js`

### 10. `utils/`

**What belongs here:**
- Pure JavaScript functions
- Helper utilities (formatters, validators)
- Security utilities

**Why:**
- Keeps business components clean
- Promotes code reuse

**Current state:** Already has `src/utils/security.js`

---

## Import Path Standardization

After reorganization, all imports should follow this pattern:

```javascript
// Components
import Button from '@/components/ui/Button';
import DataTable from '@/components/common/DataTable';
import Sidebar from '@/components/layout/Sidebar';

// Pages
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard/DashboardPage';

// Hooks
import useAssets from '@/hooks/useAssets';
import { useAuth } from '@/context/AuthContext';

// Lib
import { supabase } from '@/lib/supabase';

// Config
import { API_CONFIG } from '@/config/constants';

// Utils
import { formatCurrency } from '@/utils/formatters';
```

To enable `@` path aliases, update `vite.config.js`:

```javascript
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // ... other config
});
```

---

## Migration Steps

### Phase 1: Preparation
1. Create new folder structure
2. Set up path aliases in `vite.config.js`
3. Update `jsconfig.json` or `tsconfig.json` for IDE support

### Phase 2: Move Files
1. Move `pages/` files (with co-location for Dashboard components)
2. Move `components/common/` files
3. Move `components/layout/` files
4. Consolidate `lib/supabase.js`
5. Delete duplicate files

### Phase 3: Update Imports
1. Update all import paths in moved files
2. Update all import paths in remaining files
3. Run linter to catch any missing imports

### Phase 4: Testing
1. Run `npm run dev` to verify no errors
2. Test all major user flows
3. Verify lazy loading still works

### Phase 5: Cleanup
1. Delete empty directories
2. Remove duplicate files
3. Update any documentation

---

## Benefits of This Structure

| Benefit | Description |
|---------|-------------|
| **Intuitive** | Developers can predict where to find files |
| **Scalable** | Easy to add new features without cluttering |
| **Maintainable** | Clear separation of concerns |
| **AI-Friendly** | Path aliases make it easy for AI tools to understand imports |
| **Testable** | Co-located components make testing easier |
| **Consistent** | Same pattern used across the entire codebase |

---

## Files to Delete (Duplicates)

The following files are duplicates and should be removed:

- `src/features/assets/components/AssetSummary.jsx`
- `src/features/assets/components/AssetTable.jsx`
- `src/features/assets/components/index.js`
- `src/supabaseClient.js` (use `src/lib/supabase.js` instead)

---

## Implementation Priority

1. **High Priority**: Update imports in `App.jsx`, `main.jsx`
2. **High Priority**: Move Dashboard components to `pages/Dashboard/`
3. **Medium Priority**: Create `components/ui/` with common UI components
4. **Medium Priority**: Set up path aliases
5. **Low Priority**: Create additional UI components
6. **Low Priority**: Update documentation

---

## Conclusion

This reorganization follows the **Feature-Based** architecture pattern commonly used in large React applications. It provides:

- Clear separation between pages and components
- Logical grouping of related files
- Easy discovery of functionality
- Scalability for future features

The structure is compatible with React Router, React Query, and other popular libraries, making it a solid foundation for the NCT Asset Manager application.

