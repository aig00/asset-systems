# Dark Mode Fix Plan

## Tasks
- [x] 1. Add dark mode CSS variables to Dashboard.css
- [x] 2. Add dark mode styles for sidebar, cards, buttons, modals
- [x] 3. Update AssetSummary.jsx with dark: Tailwind classes
- [x] 4. Test the dark mode implementation

## Summary
The dark mode is not working because:
1. Dashboard.css has CSS variables only in :root (light mode) - no .dark overrides
2. AssetSummary.jsx uses hardcoded light mode Tailwind classes
3. Some components don't use the useTheme hook for inline styles

## Fixes Applied
1. Added .dark class CSS variables in Dashboard.css for all color tokens
2. Added component-specific dark mode overrides in Dashboard.css
3. Updated AssetSummary.jsx toolbar and table with dark: Tailwind classes
4. DashboardCharts.jsx already had dark mode support using useTheme hook


