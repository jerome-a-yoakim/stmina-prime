# UI Component Inventory

## Application shell components

| Component/pattern | Count/usage | Notes |
|---|---|---|
| Dashboard frame | 1 | Sidebar + workspace flex layout |
| Responsive sidebar | 1 | Fixed desktop, icon-only tablet, off-canvas mobile |
| Brand block | 1 | Initial mark, title, subtitle |
| Navigation links | Multiple | Reports link uses active state |
| Navigation section labels | 4 | Overview, Service, Servants, System |
| Account block | 1 | Initial, name, active status, sign-out |
| Mobile menu button | 1 conditional by CSS | Hamburger icon |
| Mobile scrim button | 1 conditional by state | Closes mobile sidebar |
| Sticky top bar | 1 | Greeting and account actions |
| Notification bell | 1 | Shared notification component |
| Profile avatar link | 1 | User initial |
| Sign-out buttons | 2 | Sidebar and top bar |

## Reports page components

| Component/pattern | Count/usage | Notes |
|---|---|---|
| Reporting Center root | 1 | RTL grid container |
| Hero card | 1 | Gradient, decorative ring |
| Hero statistic card | 1 | Accessible-family count |
| Filter panel/card | 1 | White rounded container |
| Filter heading block | 1 | Title + explanatory text |
| Date pickers | 2 | Native HTML date inputs |
| Select dropdowns | 3 | Family, member, membership status |
| Search input | 1 | Native search input |
| Reset button | 1 | Restores initial filters |
| Report category group | 3 | Attendance, Visitation, Member Data |
| Category report counter | 3 | 6, 1, and 2 from registry |
| Report cards/buttons | 9 | Selected/hover states, `aria-pressed` |
| Symbolic report icons | 9 | Text glyphs, not image/SVG components |
| Current report panel | 1 | Dynamic report body |
| Export button group | 1 conditional | Excel + PDF |
| Read-only permission message | 1 conditional | Replaces exports |
| Export error alert | 1 conditional | Inline banner with `role=alert` |
| KPI cards | 4 | Every report always supplies four |
| Drill-down panel | 1 conditional | Overview only |
| Drill-down buttons | 4 conditional | Overview only |
| Visual-summary panel | 1 conditional | Date summary only |
| Horizontal bar rows | 0–10 | Custom CSS bars |
| Detail heading | 1 conditional | Hidden on Overview |
| Row counter | 1 conditional | Hidden on Overview |
| Scrollable table | 1 conditional | All detailed reports with rows |
| Sticky table header | 1 per table | CSS sticky |
| Empty state | 1 conditional | Detailed reports with zero rows |
| Empty-state glyph | 1 conditional | Text symbol |
| Accuracy-note aside | 1 conditional | Normally two bullets |
| Route loading indicator | 1 conditional | Circular glyph and status text |

## Component states

- Report card: default, hover, selected.
- Inputs/selects: default, focus.
- Export buttons: default, disabled, progress label.
- Report results: populated, empty.
- Permission area: export-enabled or read-only.
- Sidebar: desktop expanded, tablet collapsed, mobile closed/open.
- Page: route loading or rendered.

## Not present

There are no tabs, modal windows, dialogs, confirmation prompts, drawers inside Reports, accordions, dropdown menus, context menus, tooltips, badges, chips, pagination, sortable headers, checkboxes, radio buttons, toggles, file uploaders, calendars beyond native date inputs, breadcrumbs, toast notifications, skeleton loaders, spinners with animation, chart-library components, legends, saved-view controls, or delete controls.

## Styling primitives

The page reuses application CSS variables including primary burgundy, gold accent, cream background/surface, white cards, borders, success/warning/danger/info colors, muted text, focus ring, and three shadow levels. It uses Alexandria through global application styles. Controls inherit application font and interaction transitions.

Rounded radii range approximately from 10 px for inputs to 26 px for the hero. Cards use subtle borders/shadows. Report cards and table rows have hover feedback. Focus is shown using the global gold outline and, on filters, the application focus-ring shadow.

