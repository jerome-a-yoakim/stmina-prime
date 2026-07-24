# Component relations

`app/login/page` renders `LoginForm`. `app/dashboard/page` renders `DashboardHome`; it uses `useApi` to call groups and members routes. `DashboardHome` renders `SignOutButton`. Components never import Supabase clients; server routes invoke application services, which invoke infrastructure clients.
