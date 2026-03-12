# TODO: Downpayment Asset Inventory Fix

## Objective
Don't add the downpayment asset to the asset inventory unless it is fully paid.

## Tasks
- [x] 1. Modify handleAddAssetSubmit - Only create downpayment transaction, not asset
- [x] 2. Add promoteToInventory function - Auto-promote to inventory when 100% paid
- [x] 3. Modify handleAddTransactionSubmit - Auto-promote to inventory when 100% paid
- [x] 4. Update modal button text to reflect new behavior
- [x] 5. Add info note in modal explaining the new behavior

## Database Requirement
**IMPORTANT:** Add a new column `is_pending` (boolean) to the `downpayment_transactions` table in Supabase:
```sql
ALTER TABLE downpayment_transactions ADD COLUMN is_pending boolean DEFAULT false;
```

## Implementation Notes
- Tracks assets in downpayment_transactions only until fully paid
- When total downpayment >= total cost, automatically creates the asset in the "assets" table
- Displays both "pending" (not in inventory) and "completed" (in inventory) downpayment items
- Asset details (name, category, total_cost) are stored in the transaction description as JSON


