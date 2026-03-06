# Tab Focus Fix V2 - Implementation Plan

## Problem Summary
When users switch browser tabs and return, asset operations (Add, Edit, Delete, Dispose) fail because:
1. JavaScript gets throttled when tab is hidden
2. Loading states may get stuck
3. Race conditions between tab refresh and realtime updates

## Solution: Robust Fallback with Manual Refresh

### Key Features:
1. **Manual Refresh Button** - Always available fallback
2. **Guaranteed State Reset** - All operations properly reset loading states
3. **Retry Capability** - Operations can be retried without page refresh
4. **Visual Feedback** - Clear indication when data is refreshing

## Files to Modify:

### 1. Dashboard.jsx
- Add manual refresh button
- Improve state management
- Add forced refresh capability

### 2. AssetSummary.jsx  
- Add retry mechanism for operations
- Ensure proper state refresh after CRUD

### 3. AddAssetForm.jsx
- Add retry capability on failure
- Ensure proper state reset

## Implementation Steps:

1. Add manual refresh button to Dashboard
2. Create shared state context for action locking
3. Update all action handlers with retry capability
4. Add visual loading indicators

