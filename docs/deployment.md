# Deployment

1. Create a Supabase project and run the SQL migrations in chronological order,
   then run `supabase/seed.sql`.
2. Create the first user in Supabase Auth, then set its `profiles.role` to
   `admin` from the SQL editor.
3. Add the existing Supabase environment variables to Vercel Project Settings
   for Production, Preview, and Development.
4. Import this repository into Vercel. Use the Next.js framework preset,
   `npm run build`, and no custom output directory.
5. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` in CI
   before merge. Never expose the Supabase service-role key to client code.
