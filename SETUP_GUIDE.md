# Setup Guide - My AI Landlord

This guide will walk you through setting up the My AI Landlord application for development and production deployment.

## Prerequisites

### Required Software
- **Node.js 18+** with npm
- **Expo CLI**: `npm install -g @expo/cli`
- **Git** for version control
- **iOS Simulator** (Mac only) or **Android Studio**

### Required Accounts
1. **Clerk Account**: Sign up at [https://clerk.com](https://clerk.com)
2. **Supabase Account**: Sign up at [https://supabase.com](https://supabase.com)
3. **OpenAI Account**: For AI features (optional for basic setup)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd MyAILandlord

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Step 2: Clerk Authentication Setup

### 2.1 Create Clerk Application
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Add application"
3. Choose application name: "My AI Landlord"
4. Select authentication providers:
   - ✅ Email
   - ✅ Google (recommended for social login)

### 2.2 Configure Clerk Settings
1. In your Clerk dashboard, go to **Settings** → **Advanced**
2. Enable "Allow sign-ups" if you want new user registration
3. Configure session settings as needed

### 2.3 Get Clerk Keys
1. Go to **API Keys** in your Clerk dashboard
2. Copy the **Publishable Key** (starts with `pk_test_`)
3. Add to your `.env` file:
   ```bash
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key-here
   ```

### 2.4 Configure OAuth (Optional)
For Google Sign-In:
1. Go to **Authentication** → **Social providers** in Clerk
2. Enable Google
3. Configure with your Google OAuth credentials

## Step 3: Supabase Backend Setup

### 3.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New project"
3. Choose organization and project name
4. Select region closest to your users
5. Set a secure database password

### 3.2 Database Setup
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and run the schema from `supabase-schema.sql`:
   ```sql
   -- This creates all necessary tables and relationships
   -- Check the file for the complete schema
   ```

### 3.3 Storage Setup
1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `maintenance-images` (public: false)
   - `voice-notes` (public: false) 
   - `property-images` (public: false)
   - `documents` (public: false)
3. Configure storage policies (see `supabase-storage-setup.sql`)

### 3.4 Edge Functions Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy Edge Functions
supabase functions deploy analyze-maintenance-request
```

### 3.5 Get Supabase Keys
1. Go to **Settings** → **API** in Supabase dashboard
2. Copy your **Project URL** and **anon/public key**
3. Add to your `.env` file:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project-id.supabase.co/functions/v1
   ```

## Step 4: Security Configuration

### 4.1 Row Level Security (RLS)
For production, enable RLS policies:
```sql
-- Run in Supabase SQL Editor
-- See supabase-rls-policies.sql for complete policies
```

**Note**: RLS is currently disabled for development/testing compatibility with Clerk.

### 4.2 File Upload Security
The app includes comprehensive file validation:
- **Image files**: JPEG, PNG, WebP (max 10MB)
- **Audio files**: MP4, M4A, WAV (max 10MB)
- **Virus scanning**: TODO for production

### 4.3 Environment Security
```bash
# Verify .env is ignored by git
git check-ignore .env

# Run security audit
chmod +x scripts/security-audit.sh
./scripts/security-audit.sh
```

## Step 5: Development Setup

### 5.1 Start Development Server
```bash
# Start Expo development server
npx expo start

# For specific platforms
npx expo start --ios     # iOS Simulator
npx expo start --android # Android Emulator
npx expo start --web     # Web browser
```

### 5.2 Test Authentication
1. Open the app in simulator/device
2. Try the welcome flow → role selection → login
3. Test Google OAuth if configured
4. Verify profile creation in Supabase dashboard

### 5.3 Test Core Features
1. **Create maintenance request** (as tenant)
2. **Upload photos/voice notes**
3. **View dashboard** (as landlord)
4. **Test real-time messaging**

## Step 6: Production Deployment

### 6.1 Pre-deployment Checklist
```bash
# Run security audit
./scripts/security-audit.sh

# Check TypeScript compilation
npx tsc --noEmit

# Test build process
npx expo export
```

### 6.2 Environment Configuration
1. Create production Supabase project
2. Create production Clerk application
3. Configure production environment variables
4. Enable RLS policies in production database

### 6.3 Security Hardening
- [ ] Enable RLS policies
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerting
- [ ] Review and remove debug logs
- [ ] Configure rate limiting
- [ ] Set up backup procedures

### 6.4 Build and Deploy
```bash
# Build for production
npx expo build:ios    # iOS App Store
npx expo build:android # Google Play Store

# Or use EAS Build (recommended)
npx eas build --platform all
```

## Troubleshooting

### Common Issues

**1. Clerk Authentication Errors**
- Verify publishable key is correct
- Check if sign-ups are enabled
- Ensure OAuth is properly configured

**2. Supabase Connection Issues**
- Verify project URL and anon key
- Check if RLS policies are blocking requests
- Ensure database is accessible

**3. File Upload Failures**
- Check storage bucket permissions
- Verify file size and type limits
- Ensure proper CORS configuration

**4. Build Errors**
- Run `npx expo doctor` for diagnostics
- Clear cache: `npx expo r -c`
- Check for TypeScript errors

### Getting Help

1. **Security Issues**: See `SECURITY.md` for reporting
2. **Development Issues**: Check Expo and React Native docs
3. **Backend Issues**: Refer to Supabase documentation
4. **Authentication Issues**: See Clerk documentation

### Useful Commands

```bash
# Development
npx expo start --clear      # Clear cache and start
npx expo doctor            # Check for common issues
npx tsc --noEmit          # Type checking

# Security
./scripts/security-audit.sh # Security audit
git log --grep="secret"    # Check for exposed secrets

# Debugging
npx expo logs              # View logs
npx react-devtools        # React Developer Tools
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [React Native Documentation](https://reactnative.dev/docs)
- [Security Best Practices](./SECURITY.md)

---

**Last Updated**: January 2025  
**Next Review**: [Set review date]

> **Note**: This guide assumes you have basic familiarity with React Native development. If you're new to React Native, consider reviewing the official documentation first.