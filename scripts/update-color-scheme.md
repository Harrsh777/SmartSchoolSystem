# Color Scheme Update Guide

This file contains patterns to update across all dashboard pages:

## Patterns to Replace:

1. `bg-[#F5EFEB] dark:bg-[#0f172a]` → `bg-background`
2. `bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50` → `glass-card rounded-xl soft-shadow-md`
3. `bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3]` → `bg-[#2C3E50] dark:bg-[#4A707A]`
4. `from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3]` → `bg-[#2C3E50] dark:bg-[#4A707A]`
5. `text-gray-900 dark:text-white` → `text-foreground`
6. `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
7. `border-[#5A7A95]/30 text-[#5A7A95]` → `border-[#2C3E50]/30 text-[#2C3E50] dark:border-[#4A707A]/30 dark:text-[#5A879A]`

## Files to Update:
- marks/marks-entry/page.tsx
- examinations/marks-entry/page.tsx
- examinations/marks-approval/page.tsx
- library/* pages
- transport/* pages