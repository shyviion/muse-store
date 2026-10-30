# Supabase setup for MUSE STORE

1. Create a Supabase project. In **SQL Editor**, run `migrations/202610300001_initial.sql`, then `seed.sql`. The seed creates 14 categories and 24 editable products.
2. Copy `.env.example` to `.env.local` at the project root. Fill in the project URL and **anon/publishable** key from **Project Settings → API**. Restart the Vite server after changing the file. Never put the service role key in a `VITE_` variable.
3. In **Authentication → Users**, create the initial admin user with an email and a strong password. The signup trigger creates a customer profile. In **SQL Editor**, promote that specific user using a privileged query:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

   Replace the example email before running it. Verify exactly one row was updated. Public signup never grants the admin role.
4. Open `/admin/login`, sign in with that user's email and password, and manage products, images, categories, orders, banners, and site content. Product and content uploads use the `muse-assets` Storage bucket. Only admins can upload or delete files.

Guest checkout calls the `place_order` database function. It uses the price in the database, locks inventory rows, validates quantity and selected options, and creates the order in one transaction. Cancelling an order restores inventory. No payment credentials are stored or processed.

When environment variables are absent, the storefront uses local preview data. With valid Supabase variables, the storefront reads the database directly and never substitutes preview products for a failed request.
