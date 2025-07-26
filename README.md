# My AI Landlord

A secure React Native + Expo app for streamlined maintenance management between landlords and tenants, powered by AI-guided issue reporting. Built with enterprise-grade security using Clerk authentication and Supabase backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Studio

### Installation
```bash
git clone <repository-url>
cd MyAILandlord
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your Clerk and Supabase credentials

# Start development server
npx expo start
```

### Security Setup
Before first run, ensure you have:
1. Clerk publishable key configured
2. Supabase URL and anon key configured
3. Run security audit: `./scripts/security-audit.sh`

## 📱 Features

### For Tenants
- **Smart Issue Reporting**: Voice-enabled, photo-supported maintenance requests
- **AI-Guided Analysis**: OpenAI-powered issue classification and cost estimation
- **Secure File Upload**: Type and size validated image/audio uploads
- **Real-time Messaging**: Direct communication with landlords
- **Property Management**: View property details and maintenance history

### For Landlords  
- **Centralized Dashboard**: View all maintenance requests by status and priority
- **AI-Powered Insights**: Intelligent summaries, cost estimates, and vendor recommendations
- **Tenant Management**: Complete tenant profiles and communication history
- **Secure File Storage**: Encrypted storage for all maintenance documentation
- **Real-time Updates**: Live updates on maintenance request status changes

## 🏗️ Architecture

### Security Architecture
- **Authentication**: Clerk for secure user management
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage with file validation
- **Edge Functions**: Supabase Edge Functions for AI processing

### Navigation Structure
- **AuthStack**: Welcome → Role Selection → Login (Clerk)
- **MainStack**: Role-based navigation with secure route protection

### Key Screens
**Shared:**
- WelcomeScreen, LoginScreen (Clerk OAuth)

**Tenant Flow:**
- HomeScreen → ReportIssueScreen → PropertyInfoScreen → CommunicationHub

**Landlord Flow:**  
- DashboardScreen → MaintenanceManagement → TenantCommunication

### State Management
- **ClerkAuthContext**: Secure authentication with token caching
- **RoleContext**: Role-based UI with profile synchronization
- **Error Boundaries**: Comprehensive error handling and recovery

### Security Components
- Input validation and sanitization
- File upload security checks
- Error boundaries with secure error reporting
- Loading states and user feedback

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native + Expo SDK 53.0.20
- **Language**: TypeScript with strict mode
- **Navigation**: React Navigation v7
- **State Management**: Context API + AsyncStorage
- **UI Components**: Custom design system with error boundaries

### Backend & Services
- **Authentication**: Clerk (replaces Firebase Auth)
- **Database**: Supabase PostgreSQL with RLS policies
- **Storage**: Supabase Storage with file validation
- **AI Processing**: Supabase Edge Functions + OpenAI
- **Real-time**: Supabase real-time subscriptions

### Security & Quality
- **Input Validation**: Comprehensive validation and sanitization
- **File Security**: Type, size, and content validation
- **Error Handling**: Specialized error boundaries and recovery
- **Type Safety**: Full TypeScript coverage with proper interfaces
- **Security Audit**: Automated security checking tools

## 📂 Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx    # Error boundary components
│   └── LoadingSpinner.tsx   # Loading state components
├── context/
│   ├── ClerkAuthContext.tsx # Clerk authentication provider
│   └── RoleContext.tsx      # Role management
├── hooks/
│   ├── useErrorHandling.ts  # Error handling hooks
│   ├── useProfileSync.ts    # Profile synchronization
│   └── useLoading.ts        # Loading state management
├── screens/
│   ├── tenant/             # Tenant-specific screens
│   ├── landlord/           # Landlord-specific screens
│   ├── LoginScreen.tsx     # Clerk authentication
│   └── WelcomeScreen.tsx   # App entry point
├── services/
│   ├── api/
│   │   ├── client.ts       # Main API client export
│   │   └── supabase-only-client.ts # Supabase API implementation
│   └── supabase/
│       ├── config.ts       # Supabase configuration
│       ├── client.ts       # Database client
│       ├── storage.ts      # File storage client
│       └── auth-helper.ts  # Authentication helpers
├── types/
│   └── api.ts             # TypeScript interfaces
├── utils/
│   ├── constants.ts       # App constants and config
│   ├── helpers.ts         # Utility functions
│   └── validation.ts      # Input validation and sanitization
supabase/
├── functions/             # Edge Functions
├── migrations/            # Database migrations
└── config.toml           # Supabase configuration
scripts/
└── security-audit.sh     # Security audit script
```

## 🎨 Design System

- **Primary Colors**: Blue (#3498DB), Dark Gray (#2C3E50)
- **Typography**: System fonts with consistent sizing
- **Spacing**: 8px grid system
- **Components**: Material Design inspired with custom styling

## 🔒 Security Features

### Authentication & Authorization
- **Clerk Integration**: Secure OAuth with Google Sign-In
- **Token Management**: Encrypted token storage with expo-secure-store
- **Session Security**: Automatic refresh and secure session handling
- **Role-Based Access**: Tenant/landlord permissions with database isolation

### Data Protection
- **Input Validation**: Server-side validation for all user inputs
- **XSS Prevention**: HTML sanitization and content filtering
- **File Upload Security**: Type, size, and content validation
- **Database Security**: Row Level Security policies and user context validation

### Monitoring & Auditing
- **Error Boundaries**: Comprehensive error catching and reporting
- **Security Audit**: Automated security scanning with `./scripts/security-audit.sh`
- **Secure Logging**: Error logging without sensitive data exposure
- **Environment Protection**: Secure environment variable handling

## 🛠️ Development

### Security Commands
```bash
# Run security audit
./scripts/security-audit.sh

# Check for TypeScript errors
npx tsc --noEmit

# Validate environment setup
npm run validate:env
```

### API Development
- **Type Safety**: All API methods use TypeScript interfaces
- **Validation**: Input validation with detailed error messages
- **Error Handling**: Comprehensive error boundaries and recovery
- **File Operations**: Secure file upload/download with validation

### Database Operations
- **Supabase Client**: Type-safe database operations
- **Real-time**: Live updates for maintenance requests and messages
- **Storage**: Secure file storage with access controls
- **Edge Functions**: AI processing with OpenAI integration

## 📱 Testing & Deployment

### Development Testing
The app successfully compiles and runs on:
- iOS Simulator (tested)
- Android Device/Emulator
- Expo Go app

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
```

### Security Testing
```bash
# Run security audit
./scripts/security-audit.sh

# Check for exposed secrets
git log --all -S "APIKey\|secret\|password" --oneline

# Validate dependencies
npm audit --audit-level=high
```

### Production Checklist
- [ ] Environment variables configured and secured
- [ ] API keys rotated if previously exposed
- [ ] RLS policies enabled in Supabase
- [ ] File upload limits enforced
- [ ] Error logging configured without sensitive data
- [ ] Security audit passing
- [ ] HTTPS enforced for all endpoints

### Deployment
1. **Pre-deployment**: Run `./scripts/security-audit.sh`
2. **Environment**: Configure production environment variables
3. **Database**: Enable RLS policies in Supabase
4. **Monitoring**: Set up error tracking and security monitoring
5. **Build**: Use `expo build` for production builds

---

Built with Claude Code for rapid development and professional quality output.
## Project Learnings & Changelog

<!-- GEMINI_LEARNINGS_START -->
<!-- Do not edit this section manually. It is managed by the /update-docs command. -->
**2025-07-26 15:30 PM**
- **Major Migration:** Complete architectural migration from Firebase to Supabase + Clerk
- **Security:** Implemented enterprise-grade security with comprehensive input validation
- **Type Safety:** Eliminated all TypeScript 'any' types with proper interfaces
- **Error Handling:** Added comprehensive error boundaries and loading states
- **File Security:** Implemented secure file upload with type and size validation
- **Documentation:** Created comprehensive security documentation and audit tools
- **Code Quality:** Fixed all critical issues identified in code review
- **Architecture:** Established production-ready security protocols

**2025-07-24 12:00 PM**
- **Feat:** Initialized the `/update-docs` command and the "Living Documentation" system.
- **Docs:** Automatically added `## Project Learnings & Changelog` sections to all `.md` and `.txt` files. This system will now be used to log all significant changes, decisions, and learnings to maintain an up-to-date project context.

<!-- GEMINI_LEARNINGS_END -->
