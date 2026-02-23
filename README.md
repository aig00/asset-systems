# NCT Asset Manager

A modern asset management system built with React, Vite, and Supabase. Track, manage, and optimize your organization's assets in real-time.

## 🚀 Features

- **Role-Based Access Control** - Multiple user roles (admin, head, accountant, staff)
- **Asset Management** - Full CRUD operations for asset inventory
- **Dashboard Analytics** - Real-time statistics and visualizations
- **Depreciation Tracking** - Automatic calculation with amortization schedules
- **Audit Logging** - Complete action history with export capabilities
- **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 3
- **Backend:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Excel Export:** XLSX

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

## 🔧 Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Supabase credentials:
   - VITE_SUPABASE_URL=your_supabase_url
   - VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   - VITE_ADMIN_PIN=your_secure_pin
4. Start the development server: `npm run dev`

## 🗄️ Database Schema

### Tables Required

- **`assets`** - Asset inventory
  - id, name, description, category, total_cost, salvage_value, useful_life_years, status, purchase_date, created_at

- **`profiles`** - User roles
  - id, role

- **`logs`** - Audit trail
  - id, user_email, action_type, details, created_at

## 👥 User Roles

| Role | Access Level |
|------|-------------|
| admin | Full access to all features |
| head | Dashboard, Assets, Logs (with PIN) |
| accountant | Assets only |
| staff | View assets only |

## 📱 Pages

- **Login** - Secure authentication
- **Dashboard** - Overview with stats and charts
- **Assets** - Full asset inventory management
- **Logs** - System activity history (admin/head only)

## 📄 License

Private - NCT Asset System
