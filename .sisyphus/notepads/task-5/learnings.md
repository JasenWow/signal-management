# Task 5 Learnings

## Issue
Tests for version-panel.test.tsx fail with 'document is not defined' - jsdom environment not properly configured.

## Workaround
This is a pre-existing issue in the codebase - all React component tests fail with same error.

## Implementation Complete
- Click handler: idx===0 calls clearPreview(), else calls loadVersionSnapshot(v.id)
- Preview highlighting: bg-blue-50 border-l-2 border-blue-500
- Rollback disabled in preview mode with title '退出预览后才能回滚'
- '查看' hint shown on non-latest non-preview versions

