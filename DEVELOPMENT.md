# Development Workflow - My AI Landlord

This document outlines the development workflow, coding standards, and best practices for the My AI Landlord project.

## Quick Reference Commands

```bash
# Development
npm start                    # Start development server
npm run clear               # Clear cache and restart
npm run typecheck          # Check TypeScript errors
npm run validate:env       # Validate environment setup

# Security
npm run security:audit     # Run security audit
npm run security:check-secrets  # Check for exposed secrets
npm run deps:audit        # Check dependency vulnerabilities

# Quality
npm run doctor            # Expo diagnostics
npm run lint:ts          # TypeScript strict checking
npm run deps:update      # Update dependencies safely
```

## Development Environment

### Required Setup
1. **Node.js 18+** with npm
2. **Expo CLI**: `npm install -g @expo/cli`
3. **Environment file**: Copy `.env.example` to `.env` and configure
4. **Security audit**: Run `npm run security:audit` before committing

### IDE Configuration
**VS Code Extensions (Recommended):**
- React Native Tools
- TypeScript Importer
- Prettier - Code formatter
- ES7+ React/Redux/React-Native snippets
- GitLens

**Settings:**
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## Coding Standards

### TypeScript Guidelines

**1. Strict Type Safety**
```typescript
// ✅ Good - Proper interfaces
interface CreateRequestData {
  title: string;
  description: string;
  priority: Priority;
}

// ❌ Avoid - any types
function handleData(data: any) { }
```

**2. Proper Error Handling**
```typescript
// ✅ Good - Comprehensive error handling
try {
  const result = await apiClient.createMaintenanceRequest(data);
  return result;
} catch (error) {
  handleApiError(error, 'Creating maintenance request');
  throw error;
}

// ❌ Avoid - Silent failures
const result = await apiClient.createMaintenanceRequest(data).catch(() => null);
```

**3. Input Validation**
```typescript
// ✅ Good - Validate before processing
const validatedData = validateAndSanitize(
  requestData,
  validateMaintenanceRequestData,
  sanitizeMaintenanceRequestData
);

// ❌ Avoid - Direct database operations without validation
await supabaseClient.createMaintenanceRequest(requestData);
```

### Component Standards

**1. Function Components with Hooks**
```typescript
// ✅ Good - Function component with proper typing
interface HomeScreenProps {
  navigation: NavigationProp<any>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, isLoading } = useAppAuth();
  const { handleApiError } = useApiErrorHandling();
  
  if (isLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }
  
  return (
    <ErrorBoundary>
      {/* Component content */}
    </ErrorBoundary>
  );
};
```

**2. Error Boundaries**
```typescript
// ✅ Always wrap screens in error boundaries
export const MaintenanceScreen: React.FC = () => {
  return (
    <ApiErrorBoundary>
      <ScreenContent />
    </ApiErrorBoundary>
  );
};
```

**3. Loading States**
```typescript
// ✅ Good - Proper loading states
const { isLoading, withLoading } = useLoading();

const handleSubmit = async () => {
  await withLoading(async () => {
    await apiClient.createMaintenanceRequest(data);
  });
};

return (
  <ButtonLoading loading={isLoading} loadingText="Creating request...">
    <Button title="Submit" onPress={handleSubmit} />
  </ButtonLoading>
);
```

### Security Standards

**1. Input Sanitization**
```typescript
// ✅ Always sanitize user input
const sanitizedTitle = sanitizeString(userInput.title);
const validatedData = validateMaintenanceRequestData(data);
```

**2. Secure File Handling**
```typescript
// ✅ Validate files before upload
const validation = validateImageFile(file);
if (!validation.valid) {
  throw new Error(validation.error);
}
await apiClient.uploadFile('maintenance-images', file, filename);
```

**3. Environment Variables**
```typescript
// ✅ Use constants file
import { ENV_CONFIG } from '../utils/constants';
const apiUrl = ENV_CONFIG.SUPABASE_URL;

// ❌ Direct environment access
const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

## Git Workflow

### Commit Standards

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `security`: Security improvements
- `refactor`: Code refactoring
- `docs`: Documentation updates
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): implement Clerk authentication with Google OAuth
fix(validation): add proper input sanitization for maintenance requests
security(api): add comprehensive file upload validation
docs(setup): update setup guide with security configuration
```

### Branch Strategy

```
main (production-ready)
├── develop (integration branch)
├── feature/auth-improvements
├── feature/file-upload-security
├── fix/validation-bug
└── security/input-sanitization
```

### Pre-commit Checklist

```bash
# 1. Run security audit
npm run security:audit

# 2. Type checking
npm run typecheck

# 3. Validate environment
npm run validate:env

# 4. Check for secrets
npm run security:check-secrets

# 5. Test build
npm run doctor
```

## API Development Workflow

### 1. Define Types First
```typescript
// 1. Add to src/types/api.ts
interface NewFeatureData {
  name: string;
  description: string;
}

// 2. Add validation to src/utils/validation.ts
export const validateNewFeatureData = (data: NewFeatureData): ValidationResult => {
  // validation logic
};

// 3. Add to API client
async createNewFeature(data: NewFeatureData) {
  const validatedData = validateAndSanitize(data, validateNewFeatureData, sanitizeNewFeatureData);
  // implementation
}
```

### 2. Database Schema Changes
```sql
-- 1. Create migration file
-- migrations/add_new_feature_table.sql

-- 2. Test locally
supabase db reset
supabase db push

-- 3. Update TypeScript types
-- src/services/supabase/types.ts
```

### 3. API Integration
```typescript
// 1. Add to API client class
// 2. Add to hook interface
// 3. Add validation and error handling
// 4. Test with error boundaries
```

## Testing Strategy

### Unit Testing (TODO)
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Test files structure
src/
├── __tests__/
│   ├── utils/
│   │   ├── validation.test.ts
│   │   └── helpers.test.ts
│   ├── components/
│   │   └── ErrorBoundary.test.tsx
│   └── services/
│       └── api/client.test.ts
```

### Integration Testing
```typescript
// Test API integration
describe('Maintenance Request API', () => {
  it('should create request with validation', async () => {
    const validData = {
      title: 'Test request',
      description: 'Test description',
      priority: 'medium' as Priority
    };
    
    const result = await apiClient.createMaintenanceRequest(validData);
    expect(result).toBeDefined();
  });
});
```

### Manual Testing Checklist

**Authentication Flow:**
- [ ] Sign up with email
- [ ] Sign in with Google
- [ ] Role selection and persistence
- [ ] Profile creation and sync
- [ ] Sign out and session cleanup

**Maintenance Requests:**
- [ ] Create request with photos
- [ ] File upload validation
- [ ] Request status updates
- [ ] Real-time updates

**Security Testing:**
- [ ] Input validation on all forms
- [ ] File upload restrictions
- [ ] Authentication boundaries
- [ ] Error handling

## Performance Guidelines

### React Native Optimization

**1. Image Optimization**
```typescript
// ✅ Optimize images before upload
const optimizedImage = await processImage(originalImage, {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8
});
```

**2. List Performance**
```typescript
// ✅ Use FlatList for large datasets
<FlatList
  data={maintenanceRequests}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

**3. Memory Management**
```typescript
// ✅ Cleanup subscriptions
useEffect(() => {
  const subscription = apiClient.subscribeToMaintenanceRequests(handleUpdate);
  return () => subscription.unsubscribe();
}, []);
```

### API Performance

**1. Minimize API Calls**
```typescript
// ✅ Batch operations
const [profile, properties, requests] = await Promise.all([
  apiClient.getUserProfile(),
  apiClient.getUserProperties(),
  apiClient.getMaintenanceRequests()
]);
```

**2. Implement Caching (TODO)**
```typescript
// Future implementation
const cachedData = await cacheManager.get('user-profile');
if (!cachedData) {
  const data = await apiClient.getUserProfile();
  await cacheManager.set('user-profile', data, 300); // 5 minutes
}
```

## Security Development

### Security Review Process

**Before Every Commit:**
1. Run `npm run security:audit`
2. Check for console.log statements with sensitive data
3. Verify input validation on new features
4. Test error boundaries
5. Review file upload security

**Monthly Security Review:**
1. Update dependencies with `npm run deps:update`
2. Review and update RLS policies
3. Audit API endpoints for new security requirements
4. Review error logs for security issues

### Common Security Pitfalls

**1. Input Validation**
```typescript
// ❌ Dangerous - No validation
const title = userInput.title;
await database.create({ title });

// ✅ Safe - Proper validation
const validatedData = validateAndSanitize(userInput, validateRequestData, sanitizeRequestData);
await database.create(validatedData);
```

**2. File Upload Security**
```typescript
// ❌ Dangerous - No file validation
await uploadFile(userFile);

// ✅ Safe - Comprehensive validation
const validation = validateImageFile(userFile);
if (!validation.valid) throw new Error(validation.error);
await uploadFile(userFile);
```

**3. Error Information Disclosure**
```typescript
// ❌ Dangerous - Exposes internal details
catch (error) {
  setError(error.stack); // Exposes server details
}

// ✅ Safe - User-friendly errors
catch (error) {
  handleApiError(error, 'Operation context');
  setError('Something went wrong. Please try again.');
}
```

## Deployment Workflow

### Development to Production

**1. Development Testing**
```bash
npm run doctor           # Check for issues
npm run typecheck       # TypeScript validation
npm run security:audit  # Security check
```

**2. Build Testing**
```bash
npx expo export         # Test production build
npx expo build:ios      # iOS build test
npx expo build:android  # Android build test
```

**3. Production Deployment**
```bash
# Enable production settings
# - RLS policies in Supabase
# - Production environment variables
# - Error monitoring setup
# - Remove debug logs

# Deploy
npx eas build --platform all
npx eas submit --platform all
```

## Troubleshooting Guide

### Common Development Issues

**TypeScript Errors:**
```bash
npm run typecheck       # Check specific errors
npx tsc --noEmit --strict  # Strict mode checking
```

**Environment Issues:**
```bash
npm run validate:env    # Check environment setup
npm run clear          # Clear cache
```

**Security Issues:**
```bash
npm run security:audit  # Full security audit
npm run security:check-secrets  # Check for exposed secrets
```

**Build Issues:**
```bash
npm run doctor         # Expo diagnostics
npm run deps:audit     # Dependency issues
npx expo r -c          # Clear all caches
```

---

**Last Updated**: January 2025  
**Next Review**: [Set review date]  
**Maintainer**: Development Team

> **Note**: This document should be updated as the development workflow evolves. All team members should familiarize themselves with these standards.