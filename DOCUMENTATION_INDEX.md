# Documentation Index - My AI Landlord

This document provides a comprehensive index of all documentation for the My AI Landlord project, helping developers and stakeholders quickly find the information they need.

## 📋 Quick Reference

### Essential Documents
- **[README.md](./README.md)** - Main project overview and quick start
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete installation and configuration
- **[SECURITY.md](./SECURITY.md)** - Security protocols and best practices
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to propose changes and open PRs

### Development
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow and coding standards
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed project architecture

### Technical Reference
- **[TECH_STACK.md](./TECH_STACK.md)** - Complete technology stack overview
- **[SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)** - Supabase integration guide

## 📁 Documentation Categories

### 🚀 Getting Started
Perfect for new developers joining the project:

1. **[README.md](./README.md)**
   - Project overview and features
   - Quick start instructions
   - Architecture overview
   - Key security features

2. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**
   - Prerequisites and requirements
   - Step-by-step installation
   - Environment configuration
   - Security setup

3. **[SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)**
   - Supabase project creation
   - Database schema setup
   - Integration with Clerk authentication

### 💻 Development
Essential for active development:

1. **[DEVELOPMENT.md](./DEVELOPMENT.md)**
   - Development workflow
   - Coding standards and best practices
   - Git workflow and commit standards
   - Testing strategies

2. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**
   - Complete API reference
   - Authentication integration
   - Error handling
   - Real-time subscriptions

3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**
   - File organization
   - Architectural decisions
   - Component hierarchy
   - Service layer design

### 🏗️ Architecture
Technical deep dives:

1. **[TECH_STACK.md](./TECH_STACK.md)**
   - Complete technology overview
   - Dependencies and versions
   - Performance considerations
   - Future roadmap

2. **Database Documentation**
   - **[supabase-schema.sql](./supabase-schema.sql)** - Complete database schema
   - **[supabase-rls-policies.sql](./supabase-rls-policies.sql)** - Security policies
   - **[supabase-storage-setup.sql](./supabase-storage-setup.sql)** - Storage configuration

### 🔒 Security
Critical security information:

1. **[SECURITY.md](./SECURITY.md)**
   - Security architecture
   - Authentication protocols
   - Data protection measures
   - Vulnerability management

2. **Security Scripts**
   - **[scripts/security-audit.sh](./scripts/security-audit.sh)** - Automated security audit

### 🔧 Build & Deployment
Production deployment information:

1. **Guides**
   - **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - End-to-end deployment steps
   - **[BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md)** - Backup and restore runbook
   - **[ROLLBACK_PROCEDURES.md](docs/ROLLBACK_PROCEDURES.md)** - Safe rollback steps
   - **[supabase-edge-functions.md](docs/deployment/supabase-edge-functions.md)** - Edge functions notes
   - **[build_instructions.txt](./build_instructions.txt)** - Build commands and requirements

2. **Build Lessons**
   - **[BUILD_SYSTEM_LESSONS.md](./BUILD_SYSTEM_LESSONS.md)** - Build system learnings
   - **[CRITICAL_SECURITY_FIX.md](docs/archive/implementations/CRITICAL_SECURITY_FIX.md)** - Security fix documentation

### 🧪 Testing
Guides and reports for test execution:

1. **Guides**
   - **[TEST_EXECUTION_GUIDE.md](docs/testing/TEST_EXECUTION_GUIDE.md)** - How to run tests
   - **[RLS_TESTING.md](docs/testing/RLS_TESTING.md)** - RLS testing overview
   - **[TESTING_NAVIGATION_GUIDE.md](docs/testing/TESTING_NAVIGATION_GUIDE.md)** - UI testing notes

2. **Reports**
   - **[TEST_SUITE_SUMMARY.md](docs/testing/TEST_SUITE_SUMMARY.md)**
   - **[E2E_TEST_SUITE_REPORT.md](docs/testing/E2E_TEST_SUITE_REPORT.md)**
   - **[E2E_TEST_EXECUTION_REPORT.md](docs/testing/E2E_TEST_EXECUTION_REPORT.md)**

### 📱 Business
Product and business documentation:

1. **[prd.json](./prd.json)**
   - Original product requirements
   - Feature specifications
   - User flow definitions

## 🎯 Documentation by Role

### For New Developers
**Start Here:**
1. [README.md](./README.md) - Get the big picture
2. [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Set up your environment
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Understand the workflow

### For API Integration
**Focus On:**
1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
2. [TECH_STACK.md](./TECH_STACK.md) - Technology details
3. [SECURITY.md](./SECURITY.md) - Security requirements

### For DevOps/Deployment
**Essential Reading:**
1. [build_instructions.txt](./build_instructions.txt) - Build process
2. [SECURITY.md](./SECURITY.md) - Security checklist
3. [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Environment configuration

### For Product Managers
**Key Documents:**
1. [README.md](./README.md) - Features and capabilities
2. [prd.json](./prd.json) - Original requirements
3. Project changelog in each document

## 📊 Documentation Maintenance

### Living Documentation System
All documentation includes a "Project Learnings & Changelog" section managed by the `/update-docs` command:

```markdown
<!-- GEMINI_LEARNINGS_START -->
<!-- Do not edit this section manually. It is managed by the /update-docs command. -->
**Date entries with changes and learnings**
<!-- GEMINI_LEARNINGS_END -->
```

### Update Process
- **Automatic**: The `/update-docs` command updates all documentation
- **Manual**: Individual documents can be updated as needed
- **Review**: Monthly documentation review recommended

### Documentation Standards
- **Markdown**: All documentation in Markdown format
- **Structure**: Consistent heading hierarchy
- **Links**: Relative links between documents
- **Examples**: Code examples with proper syntax highlighting

## 🔍 Quick Search Guide

### Finding Information About...

**Authentication:**
- Implementation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#authentication-api)
- Setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md#step-2-clerk-authentication-setup)
- Security: [SECURITY.md](./SECURITY.md#authentication--authorization)

**Database:**
- Schema: [supabase-schema.sql](./supabase-schema.sql)
- Setup: [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)
- API: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**File Upload:**
- API: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#file-storage-api)
- Security: [SECURITY.md](./SECURITY.md#file-upload-security)
- Implementation: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#file-upload-architecture)

**AI Features:**
- API: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#ai-services-api)
- Edge Functions: [supabase/functions/](./supabase/functions/) • [Notes](docs/deployment/supabase-edge-functions.md)

**Error Handling:**
- Development: [DEVELOPMENT.md](./DEVELOPMENT.md#error-handling)
- API: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#error-handling)
- Security: [SECURITY.md](./SECURITY.md#security-protocols)

## 📈 Documentation Metrics

### Coverage Status
- ✅ **Complete**: All major features documented
- ✅ **Current**: Reflects latest implementation
- ✅ **Comprehensive**: Multiple perspectives covered
- ✅ **Searchable**: Well-indexed and cross-referenced

### Last Updates
- **Major Review**: July 26, 2025
- **Architecture Update**: July 26, 2025
- **Security Review**: July 26, 2025
- **API Documentation**: July 26, 2025

### Planned Updates
- **Monthly Reviews**: Architecture and security reviews
- **Version Updates**: When major dependencies change
- **Feature Documentation**: As new features are added

---

**Document Index Version**: 1.0  
**Last Updated**: Nov 14, 2025  
**Next Review**: Dec 14, 2025

> This index is automatically updated when documentation changes. For specific questions not covered in the documentation, please refer to the development team.
