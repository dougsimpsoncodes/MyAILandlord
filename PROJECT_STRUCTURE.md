# Project Structure - My AI Landlord

This document provides a comprehensive overview of the project structure, file organization, and architectural decisions for the My AI Landlord application.

## Overview

My AI Landlord is a React Native + Expo mobile application that streamlines maintenance management between landlords and tenants using AI-guided issue reporting and comprehensive backend integration.

## Root Directory Structure

```
MyAILandlord/
├── README.md                      # Main project documentation
├── package.json                   # Project dependencies and scripts
├── app.json                      # Expo configuration
├── App.tsx                       # Main application entry point
├── tsconfig.json                 # TypeScript configuration
├── index.ts                      # Expo entry point
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
│
├── docs/                         # Documentation directory
│   ├── API_DOCUMENTATION.md     # API usage and endpoints
│   ├── DEVELOPMENT.md            # Development workflow and standards
│   ├── SECURITY.md               # Security protocols and guidelines
│   ├── SETUP_GUIDE.md            # Installation and setup instructions
│   ├── BUILD_SYSTEM_LESSONS.md  # Build system learnings
│   └── CRITICAL_SECURITY_FIX.md # Security fix documentation
│
├── src/                          # Source code directory
│   ├── components/               # Reusable UI components
│   ├── context/                  # React context providers
│   ├── data/                     # Static data and templates
│   ├── hooks/                    # Custom React hooks
│   ├── models/                   # Data models and interfaces
│   ├── navigation/               # Navigation configuration
│   ├── screens/                  # Screen components
│   ├── services/                 # API and service layers
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions and helpers
│
├── supabase/                     # Supabase configuration and functions
│   ├── config.toml               # Supabase project configuration
│   ├── functions/                # Edge Functions directory
│   └── migrations/               # Database migration files
│
├── scripts/                      # Build and utility scripts
│   └── security-audit.sh         # Security audit script
│
├── assets/                       # Static assets (images, icons)
├── android/                      # Android-specific files
├── ios/                          # iOS-specific files
└── node_modules/                 # NPM dependencies
```

## Source Code Architecture

### `/src/components/` - UI Components

```
components/
├── ErrorBoundary.tsx             # Error boundary wrapper
├── LoadingSpinner.tsx            # Loading state component
└── shared/                       # Shared UI components
    ├── Header.tsx                # App header component
    ├── SmartDropdown.tsx         # Intelligent dropdown component
    ├── SubmitButton.tsx          # Form submission button
    └── TextInputField.tsx        # Text input with validation
```

**Purpose**: Reusable UI components with consistent styling and behavior.

### `/src/context/` - State Management

```
context/
├── ClerkAuthContext.tsx          # Clerk authentication provider
└── RoleContext.tsx               # User role management
```

**Purpose**: Global state management using React Context API for authentication and user role handling.

### `/src/data/` - Static Data

```
data/
├── areaTemplates.ts              # Property area templates
└── assetTemplates.ts             # Asset type templates
```

**Purpose**: Static data templates for dropdowns and form options.

### `/src/hooks/` - Custom Hooks

```
hooks/
├── useErrorHandling.ts           # Error handling utilities
└── useProfileSync.ts             # Profile synchronization
```

**Purpose**: Custom React hooks for common functionality and state management.

### `/src/models/` - Data Models

```
models/
└── Property.ts                   # Property data model
```

**Purpose**: TypeScript data models and interfaces for business logic.

### `/src/navigation/` - Navigation

```
navigation/
├── AuthStack.tsx                 # Authentication flow navigation
└── MainStack.tsx                 # Main app navigation
```

**Purpose**: React Navigation configuration for different app flows.

### `/src/screens/` - Screen Components

```
screens/
├── LoginScreen.tsx               # Clerk authentication screen
├── RoleSelectScreen.tsx          # User role selection
├── SignUpScreen.tsx              # User registration
├── WelcomeScreen.tsx             # App welcome screen
├── landlord/                     # Landlord-specific screens
│   ├── CaseDetailScreen.tsx      # Maintenance case details
│   ├── DashboardScreen.tsx       # Landlord dashboard
│   ├── LandlordCommunicationScreen.tsx # Messaging interface
│   ├── LandlordHomeScreen.tsx    # Landlord home
│   ├── PropertyManagementScreen.tsx # Property management
│   └── SendToVendorScreen.tsx    # Vendor communication
└── tenant/                       # Tenant-specific screens
    ├── CommunicationHubScreen.tsx # Tenant messaging
    ├── ConfirmSubmissionScreen.tsx # Request confirmation
    ├── FollowUpScreen.tsx        # Follow-up questions
    ├── HomeScreen.tsx            # Tenant home screen
    ├── MaintenanceStatusScreen.tsx # Request status tracking
    ├── PropertyInfoScreen.tsx    # Property information
    ├── ReportIssueScreen.tsx     # Issue reporting
    ├── ReviewIssueScreen.tsx     # Issue review
    └── SubmissionSuccessScreen.tsx # Success confirmation
```

**Purpose**: Screen-level components organized by user role and functionality.

### `/src/services/` - Service Layer

```
services/
├── api/
│   └── client.ts                 # Main API client hook
├── auth/                         # Authentication services (placeholder)
└── supabase/                     # Supabase integration
    ├── auth-helper.ts            # Authentication helpers
    ├── client.ts                 # Supabase database client
    ├── config.ts                 # Supabase configuration
    ├── storage.ts                # File storage operations
    └── types.ts                  # Supabase type definitions
```

**Purpose**: Service layer for API communication, authentication, and data management.

### `/src/types/` - Type Definitions

```
types/
└── api.ts                        # API interface definitions
```

**Purpose**: Centralized TypeScript type definitions for the entire application.

### `/src/utils/` - Utilities

```
utils/
├── constants.ts                  # App constants and configuration
├── helpers.ts                    # Utility functions
└── validation.ts                 # Input validation and sanitization
```

**Purpose**: Utility functions, constants, and validation logic.

## Backend Structure

### Supabase Database Schema

**Tables:**
- `profiles` - User profiles linked to Clerk authentication
- `properties` - Property information managed by landlords
- `tenant_property_links` - Many-to-many relationship between tenants and properties
- `maintenance_requests` - Maintenance requests with full lifecycle tracking
- `messages` - Communication between tenants and landlords
- `announcements` - Landlord announcements to tenants

**Key Features:**
- UUID primary keys for security
- Row Level Security (RLS) policies for data isolation
- Automatic timestamp tracking with triggers
- Comprehensive indexing for performance

### Supabase Storage Buckets

- `maintenance-images` - Photos from maintenance requests
- `voice-notes` - Audio recordings from tenants
- `property-images` - Property photos
- `documents` - General document storage

### Supabase Edge Functions

- `analyze-maintenance-request` - AI analysis using OpenAI for maintenance requests

## Authentication Architecture

### Clerk Integration
- **Primary Authentication**: Clerk handles all user authentication
- **OAuth Support**: Google and email authentication
- **Token Management**: Secure token storage using expo-secure-store
- **Session Handling**: Automatic token refresh and validation

### User Flow
1. Welcome Screen → Role Selection → Clerk Authentication
2. Profile Creation/Sync with Supabase
3. Role-based Navigation to Tenant or Landlord flows

## Security Architecture

### Input Validation
- Comprehensive validation for all user inputs
- SQL injection prevention through parameterized queries
- XSS protection with HTML sanitization
- File upload validation (type, size, content)

### Data Protection
- Encrypted token storage
- HTTPS/TLS for all communications
- Environment variable protection
- Comprehensive error boundaries

### File Security
- Type and size validation
- Content validation for images and audio
- Isolated storage buckets
- Signed URLs for temporary access

## Development Workflow

### Code Standards
- **TypeScript**: Strict mode with comprehensive type coverage
- **React Native**: Function components with hooks
- **Error Handling**: Comprehensive error boundaries and validation
- **Security**: Input sanitization and validation at all levels

### Testing Strategy
- Manual testing with comprehensive checklists
- Security audit scripts
- TypeScript compilation validation
- Environment variable validation

### Deployment
- Expo development builds for testing
- EAS Build for production deployment
- Comprehensive pre-deployment security checks

## Configuration Files

### `package.json`
Contains all dependencies, scripts, and project metadata including:
- Development and security scripts
- Dependency management
- Build configuration

### `app.json`
Expo configuration including:
- App metadata
- Platform-specific settings
- Build configuration

### `tsconfig.json`
TypeScript configuration with:
- Strict type checking
- Path mapping
- Compilation options

### `.env.example`
Environment variable template for:
- Clerk authentication keys
- Supabase connection strings
- Optional service configurations

## Key Architectural Decisions

### 1. Supabase + Clerk Architecture
- **Rationale**: Combines best-in-class authentication (Clerk) with powerful backend (Supabase)
- **Benefits**: Reduced complexity, enhanced security, real-time capabilities

### 2. TypeScript Strict Mode
- **Rationale**: Eliminate runtime errors and improve code quality
- **Implementation**: Full type coverage with no 'any' types

### 3. Comprehensive Validation
- **Rationale**: Security-first approach to prevent attacks
- **Implementation**: Multi-layer validation with sanitization

### 4. Error Boundaries
- **Rationale**: Graceful error handling and recovery
- **Implementation**: Screen-level and component-level error boundaries

### 5. Hook-based API Client
- **Rationale**: React-native integration with automatic authentication
- **Implementation**: Single hook providing all API functionality

## Performance Considerations

### React Native Optimization
- Function components with proper memo usage
- Efficient list rendering with FlatList
- Image optimization and caching
- Memory management with proper cleanup

### API Performance
- Efficient database queries with proper indexing
- Batch operations where possible
- Real-time subscriptions for live updates
- Optimized file upload handling

## Future Considerations

### Planned Enhancements
- Rate limiting implementation
- Advanced caching strategies
- Enhanced AI analysis features
- Multi-property management
- Advanced vendor management

### Scalability
- Database performance monitoring
- CDN integration for file storage
- Horizontal scaling considerations
- Monitoring and analytics integration

---

**Last Updated**: July 26, 2025  
**Document Version**: 1.0  
**Maintainer**: Development Team

> This document provides a comprehensive overview of the project structure. For specific implementation details, refer to individual documentation files and inline code comments.