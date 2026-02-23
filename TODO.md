# Downpayment System Enhancement - TODO

## Task
Allow recording multiple downpayments for a single fixed asset with descriptions

## Implementation Steps

- [ ] 1. Create SQL migration file for `downpayment_transactions` table
- [ ] 2. Update DownpaymentTable.jsx to:
  - [ ] Fetch transactions from new table
  - [ ] Display multiple transactions per asset
  - [ ] Add functionality to add new transactions
  - [ ] Add functionality to edit transactions
  - [ ] Add functionality to delete transactions
  - [ ] Show total downpayment (sum of all transactions)
  - [ ] Show payment progress based on total
