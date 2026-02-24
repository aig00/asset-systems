# TODO: Security PIN for Asset Table Actions

## Task
Add a security PIN for every action in Asset Table except for View

## Implementation Plan

### Step 1: Database Migration
- [x] Create SQL migration file to add `pin` column to profiles table

### Step 2: PIN Verification Component
- [x] Create PinVerificationModal component for PIN entry
- [x] Add PIN to AuthContext for state management

### Step 3: Update AssetTable.jsx
- [x] Add PIN verification for Edit action
- [x] Add PIN verification for Dispose action
- [x] Add PIN verification for Transfer action

### Step 4: PIN Management
- [x] Add PIN setup functionality (allow users to set their PIN via AuthContext)
