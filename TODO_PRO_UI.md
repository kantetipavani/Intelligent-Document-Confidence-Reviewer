# TODO: “Pro UI” (Professional UI polish)

## Scope
Apply a more consistent, professional design system to the existing Next.js frontend **without** adding a new UI component library.

## Planned steps
- [ ] Add/define a frontend theme via CSS variables (colors, typography, spacing, radius, shadows).
- [x] Update global styling (`frontend/styles/globals.css`) to use the theme variables.
- [x] Update key shared components’ styling (tables, badges, buttons, cards) to use the theme.

- [ ] Ensure pages still build successfully (`npm run build`).
- [ ] Sanity check on dev server (`npm run dev`) for major routes.

## Notes
Repo’s existing UI uses a mix of:
- global CSS files (`frontend/styles/*.css`)
- `styled-jsx` blocks inside pages
- component-local `styled-jsx` blocks

So we will prioritize the most visible/common components first (e.g., `ExtractedFields`).

