# Supabase Setup Guide for My AI Landlord

This guide will help you migrate from Firebase to Supabase for your database needs.

## 🚀 Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit [https://supabase.com](https://supabase.com)
   - Sign up or log in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Set project name: `MyAILandlord`
   - Set database password (save this securely!)
   - Choose region closest to your users
   - Click "Create new project"

3. **Wait for Setup**
   - Project creation takes 2-3 minutes
   - You'll see a progress indicator

## 🔧 Step 2: Database Setup

### Run the Schema
1. **Open SQL Editor**
   - In your Supabase dashboard, go to "SQL Editor"
   - Click "New query"

2. **Copy and Run Schema**
   - Copy the entire contents of `supabase-schema.sql`
   - Paste into the SQL editor
   - Click "Run" to create all tables and sample data

3. **Run Security Policies**
   - Create another new query
   - Copy the entire contents of `supabase-rls-policies.sql`
   - Paste and run to set up Row Level Security

### Verify Setup
- Go to "Table Editor" in dashboard
- You should see tables: `profiles`, `properties`, `tenant_property_links`, `maintenance_requests`, `messages`, `announcements`
- Check that sample data was inserted

## 🔑 Step 3: Get Your Credentials

1. **Go to Project Settings**
   - Click the gear icon in the sidebar
   - Go to "API" section

2. **Copy Your Credentials**
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Update Your .env File**
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 🔒 Step 4: Configure Authentication Integration

Since you're using Clerk for auth, we need to integrate it with Supabase:

### Set up Clerk User Context
The RLS policies use `current_setting('app.current_user_id', true)` to identify users. You'll need to set this in your app.

## 📊 Step 5: Database Schema Overview

### Core Tables:
- **`profiles`** - User profiles (extends Clerk data)
- **`properties`** - Rental properties owned by landlords
- **`tenant_property_links`** - Links tenants to properties
- **`maintenance_requests`** - Maintenance requests from tenants
- **`messages`** - Direct messages between users
- **`announcements`** - Landlord announcements to tenants

### Key Features:
- **Row Level Security** - Automatic data isolation
- **Real-time subscriptions** - Live updates for messages/requests
- **PostgreSQL arrays** - Store multiple images/voice notes
- **Auto-updating timestamps** - Automatic `updated_at` fields
- **UUID primary keys** - Secure, non-sequential IDs

## 🚦 Step 6: Test Your Setup

### Verify Database Connection
```bash
npm start
```

The app should start without errors. Check the console for any Supabase connection issues.

### Test Data Operations
1. **Sign in to your app**
2. **Check if profile is created** in Supabase Table Editor
3. **Try creating a maintenance request**
4. **Verify data appears** in the `maintenance_requests` table

## 🔄 Step 7: Migration from Firebase (Optional)

If you have existing Firebase data:

1. **Export Firebase Data**
   - Go to Firebase Console → Firestore → Export data
   - Choose collections to export

2. **Transform Data**
   - Convert Firebase documents to PostgreSQL rows
   - Map user IDs from Firebase to Clerk IDs
   - Adjust data types as needed

3. **Import to Supabase**
   - Use SQL INSERT statements
   - Or use a migration script

## 🎯 Step 8: Next Steps

### Immediate:
- [ ] Test authentication flow
- [ ] Verify data isolation (RLS working)
- [ ] Test real-time subscriptions

### Later:
- [ ] Set up Supabase Edge Functions (replace Firebase Functions)
- [ ] Configure Supabase Storage (replace Firebase Storage)
- [ ] Set up email notifications
- [ ] Add database backups

## 🆘 Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check your `.env` file has correct URL and key
   - Restart the development server

2. **RLS Policy Errors**
   - Ensure you've set the user context properly
   - Check policies in Supabase dashboard

3. **Connection Timeouts**
   - Verify your project is in the correct region
   - Check internet connection

4. **Type Errors**
   - Make sure TypeScript types match your schema
   - Run `npm install` to get latest type definitions

### Getting Help:
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)
- Documentation: [https://supabase.com/docs](https://supabase.com/docs)
- GitHub Issues: [https://github.com/supabase/supabase](https://github.com/supabase/supabase)

## 🏆 Benefits You'll Gain

✅ **Better Performance** - PostgreSQL vs NoSQL for complex queries  
✅ **Real-time Features** - Built-in subscriptions for live updates  
✅ **Better Security** - Row Level Security for data isolation  
✅ **SQL Power** - Complex queries, joins, aggregations  
✅ **Cost Effective** - More predictable pricing than Firebase  
✅ **Developer Experience** - Better tooling and debugging  

Your Supabase setup is now complete! 🎉