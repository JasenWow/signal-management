# Signal ID Generation - Decisions

## Decision: Use JSON.stringify instead of `::` delimiter
- Reason: Prevents collision attacks (e.g., `["a", "b::c"]` vs `["a::b", "c"]`)
- Follows Metis recommendation from gap analysis

## Decision: Validate whitespace-only strings as empty
- Reason: User intent is "non-empty" meaning meaningful content, not just non-zero length
- Implementation: `.trim().length === 0` catches both `""` and `"   "`