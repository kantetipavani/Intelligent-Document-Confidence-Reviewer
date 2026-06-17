# TODO: Fix Next.js warning `Received true for a non-boolean attribute jsx`

## Status
- Warning reproduced on `/dashboard`.
- Stack trace claims: `at Layout (components/layout.tsx)` and `at style`.

## Next steps
1. Locate the actual bad prop by searching codebase for `jsx={true}` / `jsx: true` / `style jsx={...}`.
   - Current limitation: ripgrep binary missing, so use PowerShell or targeted file checks.
2. Most likely culprit: a `<style>` tag where `jsx` prop is being passed incorrectly.
   - Ensure all usages are ` <style jsx>{`...`}</style>` (string/JSX content as children), or `jsx` boolean is not passed.
3. After fix, restart `npm run dev` and verify warning disappears.

