# Deployment

1. Create a Supabase project and run `supabase/migrations/202607240001_initial_schema.sql`, then `supabase/seed.sql` in the SQL editor.
2. Create the first user in Supabase Auth, then set its `profiles.role` to `admin` from the SQL editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel Project Settings → Environment Variables for Production, Preview, and Development.
4. Import this repository into Vercel. The framework preset is Next.js; build command is `npm run build` and output directory is left unset.
5. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` in CI before merge. Never add `.env.local` or the Supabase service-role key to git or Vercel client variables.
