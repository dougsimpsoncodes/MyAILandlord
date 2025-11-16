# Technology Stack - My AI Landlord

This document provides a detailed overview of the technology stack, dependencies, and architectural choices for the My AI Landlord application.

## Core Technologies

### Frontend Framework
- **React Native 0.79.5**: Cross-platform mobile development
- **Expo SDK 53.0.20**: Development platform and build tools
- **TypeScript 5.8.3**: Type-safe JavaScript development

### Authentication & Backend
- **Supabase Auth**: User authentication and session management
- **Supabase**: PostgreSQL database with real-time capabilities
- **Supabase Edge Functions**: Serverless functions for AI processing

### AI & Machine Learning
- **OpenAI API**: GPT models for maintenance request analysis
- **Custom AI Prompts**: Structured prompts for issue classification

## Production Dependencies

### Core React Native
```json
{
  "expo": "~53.0.20",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "typescript": "~5.8.3"
}
```

### Authentication
```json
{
  "@supabase/supabase-js": "^2.x",
  "expo-secure-store": "^14.2.3"
}
```

### Navigation
```json
{
  "@react-navigation/native": "^7.1.14",
  "@react-navigation/native-stack": "^7.3.21",
  "@react-navigation/bottom-tabs": "^7.4.2",
  "react-native-safe-area-context": "^5.4.0",
  "react-native-screens": "~4.11.1"
}
```

### Backend Integration
```json
{
  "@supabase/supabase-js": "^2.52.1",
  "base64-arraybuffer": "^1.0.2"
}
```

### Media & File Handling
```json
{
  "expo-image-picker": "^16.1.4",
  "expo-speech": "^13.1.7"
}
```

### Storage & State
```json
{
  "@react-native-async-storage/async-storage": "^2.1.2"
}
```

### UI & Styling
```json
{
  "@expo/vector-icons": "^14.1.0",
  "expo-status-bar": "~2.2.3"
}
```

## Development Dependencies

### Build Tools
```json
{
  "@babel/core": "^7.25.2",
  "@types/react": "~19.0.10"
}
```

## Backend Architecture

### Supabase Services

#### Database
- **PostgreSQL**: Primary database with ACID compliance
- **Row Level Security (RLS)**: Data isolation and security
- **Real-time subscriptions**: Live updates for messages and requests
- **Automatic backups**: Point-in-time recovery

#### Storage
- **Bucket-based organization**: Separate buckets for different file types
- **Access controls**: Signed URLs for secure file access
- **File validation**: Server-side type and size validation
- **CDN integration**: Global file distribution

#### Edge Functions
- **Deno runtime**: Modern JavaScript/TypeScript runtime
- **Global deployment**: Low-latency function execution
- **OpenAI integration**: AI analysis for maintenance requests

### Database Schema

#### Core Tables
1. **profiles**: User profiles linked to Supabase auth.users
2. **properties**: Property information and metadata
3. **tenant_property_links**: Many-to-many tenant-property relationships
4. **maintenance_requests**: Complete request lifecycle tracking
5. **messages**: Tenant-landlord communication
6. **announcements**: Landlord-to-tenant broadcasts

#### Data Types
- **Enums**: user_role, request_priority, request_status, message_type
- **UUIDs**: Primary keys for security and uniqueness
- **Arrays**: Image and voice note URL storage
- **Timestamps**: Automatic creation and update tracking

## Authentication Architecture

### Authentication Features
- **Email/Password & OAuth** (optional): via Supabase Auth
- **Session Management**: Automatic token refresh and validation
- **User Profiles**: Metadata storage and management
- **Security**: Industry-standard authentication protocols

### Integration Pattern
```typescript
// Authentication hook usage
const { user, isLoading, isSignedIn, signOut } = useAppAuth();

// API client with automatic authentication
const apiClient = useApiClient(); // Automatically includes user context
```

## State Management

### Context Providers
1. **SupabaseAuthProvider**: Authentication state and session management
2. **RoleProvider**: User role management and UI customization
3. **Error Boundaries**: Comprehensive error handling and recovery

### Data Flow
```
User Action → Validation → API Client → Supabase → Real-time Updates
```

## File Upload Architecture

### Supported File Types
- **Images**: JPEG, PNG, WebP (max 10MB)
- **Audio**: MP4, M4A, WAV (max 10MB)
- **General**: All files with comprehensive validation

### Security Measures
- **Type validation**: MIME type checking
- **Size limits**: Configurable file size restrictions
- **Content validation**: Header analysis for security
- **Path sanitization**: Prevention of directory traversal

### Storage Buckets
```
maintenance-images/   # Maintenance request photos
voice-notes/         # Audio recordings
property-images/     # Property photos
documents/           # General documents
```

## API Architecture

### Hook-based Design
```typescript
const apiClient = useApiClient();
// Provides all API methods with automatic authentication
```

### Method Categories
1. **User Management**: Profile creation, updates, role assignment
2. **Property Operations**: Property listing and management
3. **Maintenance Requests**: Full CRUD operations with file handling
4. **Messaging**: Real-time communication between users
5. **AI Services**: Intelligent analysis and recommendations
6. **File Operations**: Secure upload, download, and deletion

### Error Handling
- **Structured errors**: Consistent error response format
- **User-friendly messages**: No technical details exposed
- **Logging**: Comprehensive error tracking without sensitive data

## Security Stack

### Input Validation
- **Multi-layer validation**: Client and server-side validation
- **Sanitization**: HTML and script tag removal
- **Type checking**: Runtime validation with TypeScript interfaces

### Authentication Security
- **Encrypted storage**: Secure token storage with expo-secure-store
- **Session validation**: Automatic token verification
- **Logout protection**: Secure session cleanup

### Data Protection
- **HTTPS/TLS**: All communications encrypted
- **Environment variables**: Secure configuration management
- **Database security**: RLS policies and user context validation

## Development Tools

### Code Quality
- **TypeScript strict mode**: Zero tolerance for 'any' types
- **ESLint**: Code style and error checking
- **Prettier**: Consistent code formatting

### Security Tools
- **Security audit script**: Comprehensive security checking
- **Dependency scanning**: Regular vulnerability assessments
- **Secret detection**: Prevention of credential exposure

### Build Tools
- **Expo CLI**: Development server and build management
- **EAS Build**: Cloud-based building and deployment
- **Metro bundler**: JavaScript bundling and optimization

## Performance Optimizations

### React Native
- **Function components**: Hooks-based architecture
- **Memoization**: Appropriate use of React.memo and useMemo
- **List optimization**: FlatList for large datasets
- **Image optimization**: Automatic resizing and caching

### API Performance
- **Efficient queries**: Optimized database queries with proper indexing
- **Batch operations**: Multiple operations in single requests
- **Real-time subscriptions**: Efficient live updates
- **Caching strategy**: Strategic data caching for performance

### Bundle Optimization
- **Tree shaking**: Removal of unused code
- **Code splitting**: Lazy loading of components
- **Asset optimization**: Compressed images and resources

## Deployment Architecture

### Development
- **Expo Go**: Quick testing on physical devices
- **Simulators**: iOS Simulator and Android Emulator testing
- **Hot reloading**: Instant development feedback

### Production
- **EAS Build**: Cloud-based build service
- **App Store deployment**: iOS App Store and Google Play Store
- **OTA Updates**: Over-the-air updates for JavaScript changes

### Environment Management
- **Multiple environments**: Development, staging, production
- **Environment variables**: Secure configuration per environment
- **Feature flags**: Controlled feature rollouts

## Monitoring & Analytics

### Error Tracking
- **Error boundaries**: Graceful error handling
- **Crash reporting**: Comprehensive crash detection
- **Performance monitoring**: App performance tracking

### User Analytics
- **Usage tracking**: User interaction analytics
- **Performance metrics**: App performance monitoring
- **Security events**: Authentication and security monitoring

## Future Technology Considerations

### Planned Upgrades
- **React Native**: Regular updates to latest stable versions
- **Expo SDK**: Keeping up with latest Expo releases
- **Dependencies**: Regular security and feature updates

### Potential Additions
- **Push notifications**: Firebase Cloud Messaging or Expo Notifications
- **Offline support**: Redux Persist or similar for offline functionality
- **Advanced caching**: React Query or SWR for better data management
- **Testing framework**: Jest and React Native Testing Library

### Scalability Considerations
- **Database scaling**: Read replicas and connection pooling
- **CDN integration**: Global content distribution
- **Microservices**: Service decomposition for larger scale
- **Monitoring**: Application Performance Monitoring (APM) tools

---

**Last Updated**: July 26, 2025  
**Technology Stack Version**: 1.0  
**Next Review**: August 2025

> This document should be updated when major technology decisions are made or significant dependencies are changed.
