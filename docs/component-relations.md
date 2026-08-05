# Component relations

- `app/login/page.tsx` renders the login feature entry point.
- `features/login/index.tsx` renders `components/login-form.tsx`.
- `app/dashboard/page.tsx` renders the dashboard feature entry point.
- `features/dashboard/index.tsx` dynamically loads
  `components/dashboard-application.jsx`.
- The dashboard application composes the authentication UI and calls
  feature-owned data services for groups, members, activities, attendance,
  notes, and backups.
- Feature data services use the shared Supabase infrastructure adapters.
