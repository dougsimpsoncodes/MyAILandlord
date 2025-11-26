# Auth Migration Plan: Clerk to Supabase

### Goal

The objective is to completely remove the dependency on `clerk_user_id` from the database and align all Row Level Security (RLS) policies with the application's Supabase authentication by using the standard `auth.uid()` function.

### Step-by-Step Implementation Guide

**Step 1: Create the Migration File**

First, create a new, empty migration file. All subsequent SQL commands should be placed within this file.

*   **File Location:** `supabase/migrations/`
*   **Suggested Filename:** `YYYYMMDDHHMMSS_migrate_auth_to_supabase.sql` (replace with the current timestamp)

**Step 2: Analyze and Replace RLS Policies**

The primary RLS policies are defined in `supabase/migrations/20250904_fix_rls_standardize.sql`. You will need to write `ALTER POLICY` statements to update the `USING` and `WITH CHECK` clauses for each policy that references `clerk_user_id`.

The general pattern is to replace a check like `(get_clerk_user_id() = clerk_user_id)` or `(clerk_user_id = (auth.jwt() ->> 'sub'::text))` with `(auth.uid() = user_id)`. You will need to confirm the correct column name for the user ID on each table (it may be `user_id`, `id`, etc.).

Here are the specific policies to modify:

1.  **Table: `properties`**
    *   **Policies to Alter:** `properties_select_policy`, `properties_insert_policy`, `properties_update_policy`, `properties_delete_policy`.
    *   **Current Logic:** `(get_clerk_user_id() = user_id)`
    *   **New Logic:** `(auth.uid() = user_id)`

2.  **Table: `property_areas`**
    *   **Policies to Alter:** `property_areas_select_policy`, `property_areas_insert_policy`, `property_areas_update_policy`, `property_areas_delete_policy`.
    *   **Current Logic:** Based on a `JOIN` with the `properties` table. The logic `(get_clerk_user_id() = p.user_id)` needs to be updated.
    *   **New Logic:** `(auth.uid() = p.user_id)`

3.  **Table: `profiles`**
    *   **Policies to Alter:** `profiles_select_policy`, `profiles_update_policy`.
    *   **Current Logic:** `(get_clerk_user_id() = clerk_user_id)`
    *   **New Logic:** `(auth.uid() = id)` (assuming `id` is the primary key and the foreign key from `auth.users`)

4.  **Table: `tenants`**
    *   **Policies to Alter:** `tenants_select_policy`, `tenants_insert_policy`, `tenants_update_policy`, `tenants_delete_policy`.
    *   **Current Logic:** `(get_clerk_user_id() = landlord_id)`
    *   **New Logic:** `(auth.uid() = landlord_id)`

**Step 3: Remove Obsolete Functions and Triggers**

The reliance on `clerk_user_id` introduced several helper functions and triggers that are now obsolete. These should be dropped in your migration script.

1.  **Drop the `get_clerk_user_id()` function:**
    *   This function is a wrapper to extract the user ID from the Clerk JWT. It is no longer needed.
    *   **Command:** `DROP FUNCTION IF EXISTS get_clerk_user_id();`

2.  **Drop the `handle_new_user` trigger and function:**
    *   The file `supabase/migrations/20250820_add_handle_new_user_trigger.sql` creates a trigger on the `auth.users` table. This trigger's purpose is to copy the new user's ID into the `profiles` table, likely including the `clerk_user_id`. This is the fragile workaround that needs to be removed.
    *   **Commands:**
        ```sql
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        DROP FUNCTION IF EXISTS handle_new_user();
        ```

**Step 4: Drop the `clerk_user_id` Column from Tables**

After all policies and functions have been updated, the `clerk_user_id` column is no longer needed and should be removed from the schema.

*   **Table: `profiles`**
    *   **Command:** `ALTER TABLE profiles DROP COLUMN IF EXISTS clerk_user_id;`

*   **Table: `invites`**
    *   The file `supabase/migrations/20250825_add_invites.sql` shows that the `invites` table also has a `clerk_user_id` column.
    *   **Command:** `ALTER TABLE invites DROP COLUMN IF EXISTS clerk_user_id;`

**Step 5: Verification Plan**

After the migration script is created, you must verify that the application is secure and functional.

1.  **Apply the Migration:** Run the new SQL script against the development database.
2.  **Run Automated Tests:** Execute the project's test suites to catch any regressions.
    *   `npm test` (for unit tests)
    *   `npm run test:e2e:auth` (for authentication-specific end-to-end tests)
    *   `npm run test:e2e:critical` (for critical workflow tests)
3.  **Manual User Flow Testing:**
    *   **Sign Up:** Create a new user account. Verify that a corresponding entry is created in `auth.users` and `public.profiles` and that the `id` in `profiles` matches the `id` in `auth.users`.
    *   **Log In:** Log in with the new user.
    *   **Data Access:** Navigate through the application and confirm that the user can see their own data (e.g., their profile) but cannot see data belonging to other users.
    *   **CRUD Operations:** Test creating, reading, updating, and deleting resources (e.g., properties, tenants) to ensure the new RLS policies are working correctly.
