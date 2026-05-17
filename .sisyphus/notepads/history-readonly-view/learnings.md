# History Readonly View Learnings

## Task: Create Preview Banner Component

### Completed
- Created `src/domains/version/components/preview-banner.tsx`
- Pure presentational component, no state management
- Props: `commitMessage: string`, `onExit: () => void`
- Uses amber/yellow color scheme: `bg-amber-50 border border-amber-200`
- Text: "正在查看历史版本: {commitMessage}"
- Includes "退出预览" button and "×" close button

### Styling Conventions (from version-panel.tsx)
- Buttons: `text-xs px-2 py-1` for small actions
- Text: `text-sm` for body text, `text-xs` for secondary/metadata
- Colors: Use semantic color pairs (e.g., `text-amber-800` with `bg-amber-50`)
- Rounded corners: `rounded` standard, `rounded-full` for pills
- Hover states: `hover:bg-amber-300` etc.

### Architecture Notes
- Banner placed above `<main>` canvas area in show.tsx
- commitMessage comes from `VersionSummary.message`
- No animations or transitions per requirements