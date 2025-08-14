# Clerk + Supabase Integration Setup Guide

## Overview
This guide will help you set up Clerk authentication with Supabase database integration for your landlord app.

## Prerequisites
- Clerk account (https://clerk.com)
- Supabase project (https://supabase.com)
- React Native/Expo project

## Step 1: Clerk Setup

### 1.1 Create Clerk Application
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Add Application"
3. Choose "React Native" as your framework
4. Give your app a name (e.g., "My AI Landlord")

### 1.2 Configure Authentication Methods
1. In your Clerk dashboard, go to "User & Authentication" → "Email, Phone, Username"
2. Enable the authentication methods you want:
   - Email/Password
   - Google OAuth
   - Apple OAuth (for iOS)

### 1.3 Get Your Publishable Key
1. Go to "API Keys" in your Clerk dashboard
2. Copy your "Publishable Key" (starts with `pk_test_` or `pk_live_`)

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization and region
4. Set a database password (save this securely)
5. Wait for the project to be created

### 2.2 Get Your Project Credentials
1. Go to "Settings" → "API" in your Supabase dashboard
2. Copy:
   - Project URL (e.g., `https://your-project-id.supabase.co`)
   - Anon/Public key (starts with `eyJ...`)

### 2.3 Set Up Database Schema
Your app already has the SQL files for the database schema. Run these in your Supabase SQL editor:

1. Go to "SQL Editor" in your Supabase dashboard
2. Run the schema files in this order:
   - `supabase-schema.sql` - Creates tables
   - `supabase-rls-policies.sql` - Sets up Row Level Security
   - `supabase-storage-setup.sql` - Configures file storage

## Step 3: Environment Configuration

### 3.1 Create Environment File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

### 3.2 Configure Environment Variables
Edit your `.env` file with your actual credentials:

```env
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-actual-clerk-key-here

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-supabase-anon-key-here
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-actual-project-id.supabase.co/functions/v1
```

### 3.3 Verify Configuration
Run the validation script:
```bash
npm run validate:env
```

You should see:
```
✅ Environment validation: Clerk configured Supabase configured
```

## Step 4: Test the Integration

### 4.1 Start Your App
```bash
npm start
```

### 4.2 Test Authentication Flow
1. Open your app
2. Try to sign up with a new account
3. Verify the user profile is created in Supabase
4. Test role selection (tenant/landlord)
5. Verify role is stored in both Supabase and local storage

## Step 5: Troubleshooting

### Common Issues

#### 1. "Missing Publishable Key" Error
- Ensure your `.env` file exists and has the correct Clerk key
- Verify the key starts with `pk_test_` or `pk_live_`
- Restart your development server after changing environment variables

#### 2. Supabase Connection Errors
- Check your Supabase URL and anon key
- Ensure your Supabase project is active
- Verify the database schema has been created

#### 3. RLS Policy Errors
- Run the RLS policies SQL file in Supabase
- Check that the `set_current_user_id` function exists
- Verify user context is being set correctly

#### 4. Profile Sync Issues
- Check browser console for error messages
- Verify the `profiles` table exists in Supabase
- Ensure the `clerk_user_id` column is properly indexed

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate keys regularly

### 2. Row Level Security
- All database queries go through RLS policies
- Users can only access their own data
- Verify policies are working correctly

### 3. Authentication
- Clerk handles all authentication securely
- Supabase only receives user context, not credentials
- Use secure token storage (already implemented)

## Next Steps

### 1. Customize Authentication UI
- Modify the login/signup screens in `src/screens/`
- Add your branding and styling
- Implement additional OAuth providers if needed

### 2. Enhance User Profiles
- Add more profile fields in the database
- Implement profile editing functionality
- Add avatar upload capabilities

### 3. Implement Additional Features
- Property management for landlords
- Maintenance requests for tenants
- Communication system
- File storage for documents

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure database schema is properly created
4. Check Clerk and Supabase dashboards for any service issues

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs)
- [Expo Documentation](https://docs.expo.dev)