# Implementation TODO: Paid Button for Amortization Schedule

## Task
Add "paid" buttons for the Amortization Schedule so users know what months are remaining.

## Files to Modify
1. [x] Analyze codebase structure
2. [x] src/components/AssetSummary.jsx - Add paid tracking to amortization modal
3. [ ] src/pages/Dashboard.jsx - Add paid tracking to dashboard amortization modal

## Implementation Steps

### AssetSummary.jsx
- [x] Add `paidMonths` state to track which months are paid (Set)
- [x] Add CSS styles for `.sched-row-paid` class (green background, checkmark)
- [x] Add "Mark as Paid" button in each schedule row
- [x] Add "Mark All as Paid" button in the header
- [x] Show "X of Y paid" counter
- [x] Reset paid state when modal opens/closes or asset changes

### Dashboard.jsx
- [ ] Add `paidMonths` state to track which months are paid (Set)
- [ ] Add CSS styles for `.sched-row-paid` class
- [ ] Add "Mark as Paid" button in each schedule row
- [ ] Add "Mark All as Paid" button in the header
- [ ] Show "X of Y paid" counter
- [ ] Reset paid state when modal opens/closes

## Success Criteria
- User can click a button to mark a month as paid
- Paid months show a green background and checkmark
- Counter shows how many months are paid vs remaining
- "Mark All as Paid" button available for convenience
- Visual distinction between paid and unpaid months

