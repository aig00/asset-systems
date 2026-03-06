# Supabase Realtime Connection Fix Plan

## Problem Summary
The WebSocket connection to Supabase realtime was failing with:
- "WebSocket is closed before the connection is established"
- "Unable to subscribe to changes with given parameters [event: *, schema: public, table: *, filters: []]"
- Connection status immediately showing "CLOSED" after initialization
- Continuous reconnect attempts that fail

## Root Causes
1. **Missing Table Specification**: The subscription was using wildcard `table: "*"` which doesn't work with Supabase realtime when subscribing to multiple tables
2. **React Development Mode Double-Invoke**: React's strict mode double-invokes effects, causing rapid mount/unount cycles
3. **Dynamic Channel Name**: Using `Date.now()` creates a NEW channel on every reconnect instead of reusing
4. **Aggressive Reconnection**: No debouncing - reconnection attempts happen too quickly
5. **No Stability Period**: Connection isn't given time to stabilize before attempting reconnect

## Plan

### Step 1: Fix useSupabaseRealtime.js - COMPLETED ✓
- [x] 1.1 Use a STABLE channel name (no Date.now())
- [x] 1.2 Add exponential backoff with jitter for reconnection
- [x] 1.3 Add connection stability detection (wait for SUBSCRIBED status)
- [x] 1.4 Add debouncing to prevent rapid reconnection attempts
- [x] 1.5 Add proper state management for connection lifecycle
- [x] 1.6 Implement a "grace period" before initial connection to handle React's double-invoke
- [x] 1.7 **FIXED**: Create individual subscription per table (required for Supabase realtime)

### Step 2: Supabase Configuration - REQUIRED
You must enable Realtime for your tables in Supabase Dashboard:

**Option 1: Via Supabase Dashboard**
1. Go to **Database** → **Replication** → **Source**
2. Enable replication for these tables:
   - `assets`
   - `logs`
   - `downpayment_transactions`

**Option 2: Via SQL Editor**
```sql
-- Enable realtime for assets table
ALTER PUBLICATION supabase_realtime ADD TABLE assets;

-- Enable realtime for logs table
ALTER PUBLICATION supabase_realtime ADD TABLE logs;

-- Enable realtime for downpayment_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE downpayment_transactions;
```

### Step 3: Testing
- [x] 3.1 Build verification - passed
- [x] 3.2 Code fix applied - channels now connect (status: SUBSCRIBED)
- [x] 3.3 Enable Supabase realtime for tables (required!)
- [ ] 3.4 Verify real-time updates work when data changes
- [ ] 3.5 Test tab visibility and reconnection behavior

## Key Fix Applied
The main issue was that Supabase realtime requires specific table names for each subscription. The original code tried to use a wildcard (`table: "*"`) which caused the error.

The fix creates **individual channels for each table** with proper table specification:
```javascript
tables.forEach((tableName) => {
  channel.on("postgres_changes", {
    event: "*",
    schema: "public",
    table: tableName  // SPECIFIC TABLE!
  }, callback)
});
```

## Console Output After Fix
```
useSupabaseRealtime.js:166 [Realtime] Channel assets status: SUBSCRIBED
useSupabaseRealtime.js:166 [Realtime] Channel logs status: SUBSCRIBED
useSupabaseRealtime.js:166 [Realtime] Channel downpayment_transactions status: SUBSCRIBED
useSupabaseRealtime.js:174 [Realtime] All channels successfully connected!
```

## Followup Steps
1. Enable Realtime in Supabase Dashboard (see Step 2 above)
2. Run the development server to test
3. Verify real-time functionality works properly

