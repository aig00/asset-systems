# Project Directory Reorganization Plan

## Current Project Analysis

### Tech Stack
- **Framework**: React 19 + Vite
- **State Management**: React Context + TanStack React Query
- **Authentication**: Supabase Auth + Custom PIN verification system
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS + Custom CSS
- **Additional**: Recharts, ExcelJS, Lucide React, date-fns

### Current Features
1. **Asset Management**: CRUD operations for assets
2. **Downpayment Tracking**: Payment installments and transactions
3. **Dashboard**: Real-time statistics and charts
4. **Logs System**: User action logging
5. **Theme System**: Dark/Light mode
6. **Role-based Access**: admin, head, staff, accountant
7. **Security**: PIN verification for sensitive actions
8. **Real-time Updates**: Supabase Realtime subscription

### Current Structure Issues Identified
1. **Mixed organization**: Has both flat structure and feature-based folders
2. **Misplaced files**: `useAutoRefresh.js` and `supabaseClient.js` in src root
3. **Empty/unused folders**: `features/admin/`, `features/auth/`, `features/downpayment/`, `store/`, `routes/`, `services/`
4. **Unused component folders**: `common/`, `layout/`, `shared/`, `ui/`
5. **Duplicate CSS locations**: `src/styles/` exists but main CSS is in `src/index.css`
6. **No clear separation**: Between API clients, utilities, and services

---

## Proposed Reorganized Structure

### Recommended Directory Layout

```
src/
├── main.jsx                    # App entry point (React Query provider)
├── App.jsx                     # Root component with routing
├── index.css                   # Global styles
│
├── lib/                        # Third-party library configurations
│   ├── supabase.js            # Supabase client initialization
│   └── axios.js               # Axios instance configuration
│
├── config/                     # Application configuration
│   ├── constants.js          # App-wide constants
│   └── theme.js              # Theme configuration
│
├── components/                # Shared/Common UI components
│   ├── ui/                   # Reusable primitive UI components
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── Input.jsx
│   │   └── ...
│   ├── layout/               # Layout components
│   │   ├── Sidebar.jsx
│   │   └── PageContainer.jsx
│   ├── ErrorBoundary.jsx    # Error handling
│   └── ProtectedRoute.jsx    # Route protection
│
├── features/                  # Feature-based organization (domain-driven)
│   ├── assets/               # Asset management feature
│   │   ├── components/       # Asset-specific components
│   │   │   ├── AssetTable.jsx
│   │   │   ├── AssetSummary.jsx
│   │   │   ├── AddAssetForm.jsx
│   │   │   └── AssetCharts.jsx
│   │   ├── hooks/            # Feature-specific hooks
│   │   │   └── useAssets.js
│   │   ├── services/        # Feature-specific API calls
│   │   │   └── assetApi.js
│   │   └── types/            # TypeScript types/interfaces (if using TS)
│   │       └── index.js
│   │
│   ├── downpayment/          # Downpayment tracking feature
│   │   ├── components/
│   │   │   └── DownpaymentTable.jsx
│   │   └── hooks/
│   │       └── useDownpayment.js
│   │
│   ├── logs/                 # System logs feature
│   │   ├── components/
│   │   │   └── LogsTable.jsx
│   │   └── hooks/
│   │       └── useLogs.js
│   │
│   └── dashboard/            # Dashboard feature
│       ├── components/
│       │   ├── DashboardCharts.jsx
│       │   ├── StatCard.jsx
│       │   └── AmortizationModal.jsx
│       └── hooks/
│           └── useDashboard.js
│
├── pages/                     # Route page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── SignOutModal.jsx
│
├── context/                   # React Context providers
│   ├── AuthContext.jsx       # Authentication context
│   └── ThemeContext.jsx      # Theme context
│
├── hooks/                     # Shared/custom React hooks
│   ├── usePageFocusFix.js
│   ├── useTabVisibility.js
│   ├── useSupabaseRealtime.js
│   └── useAutoRefresh.js
│
├── utils/                     # Pure utility functions
│   ├── security.js           # PIN security utilities
│   ├── formatters.js        # Date/currency formatters
│   └── validators.js         # Form validation
│
├── assets/                    # Static assets
│   ├── images/
│   │   └── NCT_logong.png
│   ├── icons/
│   └── fonts/
│
└── __tests__/                # Test files (optional)
    └── ...
```

---

## Detailed Explanation by Folder

### 1. `src/lib/`
**Purpose**: Third-party library client configurations
**Why**: Centralizes external library setup, making it easy to:
- Update library configurations in one place
- Configure interceptors and default settings
- Mock libraries during testing

**Files to move**:
- `supabaseClient.js` → `lib/supabase.js`
- Create `lib/axios.js` for axios configuration

---

### 2. `src/config/`
**Purpose**: Application-wide configuration and constants
**Why**: Separates configuration from business logic

**Files**:
- `constants.js`: App constants (roles, status values, etc.)
- `theme.js`: Theme configuration

---

### 3. `src/components/ui/`
**Purpose**: Reusable, primitive UI components (buttons, inputs, modals)
**Why**: 
- Promotes component reusability
- Easier to maintain consistent design system
- Better for third-party UI library integration

**Current unused folders to clean**:
- `components/common/`
- `components/shared/`
- `components/ui/`

---

### 4. `src/components/layout/`
**Purpose**: Layout components that define page structure
**Why**: Separates layout concerns from page content

**Contains**:
- Sidebar navigation
- Page containers
- Header/Footer

---

### 5. `src/features/`
**Purpose**: Feature-based code organization (domain-driven design)
**Why**:
- Groups all code related to a specific feature
- Easier to understand feature dependencies
- Better for team scaling (different teams own different features)
- Simplifies feature removal or testing

**Structure per feature**:
```
feature-name/
├── components/    # Feature-specific UI components
├── hooks/         # Feature-specific React hooks
├── services/      # Feature-specific API calls
├── types/         # Feature-specific type definitions
└── utils/        # Feature-specific utilities
```

---

### 6. `src/pages/`
**Purpose**: Route-level components (what users see at each route)
**Why**:
- Clear mapping to routes
- Usually wrap feature components
- Handle page-level concerns (loading states, error handling)

---

### 7. `src/context/`
**Purpose**: React Context providers for global state
**Why**:
- Single source of truth for global state
- Easier to debug with React DevTools

---

### 8. `src/hooks/`
**Purpose**: Shared custom React hooks
**Why**:
- Reusable across features
- Keeps components clean
- Hooks that aren't feature-specific go here

---

### 9. `src/utils/`
**Purpose**: Pure JavaScript utility functions
**Why**:
- No side effects, easy to test
- Reusable across the application
- Separates business logic from UI

---

### 10. `src/assets/`
**Purpose**: Static assets (images, fonts, icons)
**Why**: Already properly structured

---

## Migration Steps

### Phase 1: Create New Structure
1. Create `lib/` folder and move Supabase client
2. Create `config/` folder and move/create constants
3. Create `features/` folder structure

### Phase 2: Move Components
1. Move feature-specific components to `features/[feature]/components/`
2. Move shared components to `components/ui/`
3. Clean up empty folders

### Phase 3: Update Imports
1. Update all import paths across the project
2. This is the most critical step

### Phase 4: Cleanup
1. Remove empty folders
2. Verify all functionality works
3. Run linter and fix any issues

---

## Benefits of This Structure

### 1. **Maintainability**
- Clear separation of concerns
- Easier to locate files
- Simplified debugging

### 2. **Scalability**
- Feature-based organization supports team growth
- New features can be added easily
- Reduces merge conflicts

### 3. **Testability**
- Feature isolation makes unit testing easier
- Clear dependencies
- Easier to mock

### 4. **Developer Experience**
- Intuitive file location
- Better IDE autocomplete
- Easier onboarding for new developers

### 5. **AI Tool Analysis**
- Clear structure helps AI understand codebase
- Organized features simplify debugging
- Predictable patterns for code generation

---

## Files to Reorganize

### Move Operations
| Current Location | New Location |
|----------------|--------------|
| `src/supabaseClient.js` | `src/lib/supabase.js` |
| `src/useAutoRefresh.js` | `src/hooks/useAutoRefresh.js` |
| `src/components/AssetTable.jsx` | `src/features/assets/components/AssetTable.jsx` |
| `src/components/AssetSummary.jsx` | `src/features/assets/components/AssetSummary.jsx` |
| `src/components/AddAssetForm.jsx` | `src/features/assets/components/AddAssetForm.jsx` |
| `src/components/DashboardCharts.jsx` | `src/features/dashboard/components/DashboardCharts.jsx` |
| `src/components/DownpaymentTable.jsx` | `src/features/downpayment/components/DownpaymentTable.jsx` |
| `src/components/PinVerificationModal.jsx` | `src/features/auth/components/PinVerificationModal.jsx` |
| `src/components/PasswordToggle.jsx` | `src/components/ui/PasswordToggle.jsx` |
| `src/components/DataTable.jsx` | `src/components/ui/DataTable.jsx` |
| `src/components/DataTableExample.jsx` | `src/components/ui/DataTableExample.jsx` |
| `src/hooks/useAssets.js` | `src/features/assets/hooks/useAssets.js` |
| `src/utils/security.js` | `src/utils/security.js` (keep, already correct) |

### Delete Empty Folders
- `src/features/admin/`
- `src/features/assets/types/`
- `src/features/assets/utils/`
- `src/features/auth/`
- `src/features/downpayment/`
- `src/store/`
- `src/store/middleware/`
- `src/store/slices/`
- `src/routes/`
- `src/services/`
- `src/services/api/`
- `src/services/external/`
- `src/services/supabase/`
- `src/components/common/`
- `src/components/shared/`
- `src/styles/`

---

## Implementation Priority

1. **High Priority**: Files that affect app functionality
   - `supabaseClient.js` → `lib/supabase.js`
   - `useAutoRefresh.js` → `hooks/useAutoRefresh.js`
   - Import path updates

2. **Medium Priority**: Feature organization
   - Move feature components
   - Create feature hooks
   - Organize services

3. **Low Priority**: Cleanup
   - Remove empty folders
   - Organize remaining components
   - Add documentation

