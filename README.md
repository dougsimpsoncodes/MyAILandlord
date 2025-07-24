# My AI Landlord

A React Native + Expo app for streamlined maintenance management between landlords and tenants, powered by AI-guided issue reporting.

## 🚀 Quick Start

```bash
npm install
npx expo start
```

## 📱 Features

### For Tenants
- **Smart Issue Reporting**: Voice-enabled, photo-supported maintenance requests
- **AI-Guided Questions**: Intelligent follow-up questions for complete issue details
- **Time Slot Preferences**: Select preferred repair times during submission
- **Real-time Status**: Track maintenance request progress

### For Landlords  
- **Centralized Dashboard**: View all maintenance cases by status (New, In Progress, Resolved)
- **AI-Powered Insights**: Get intelligent summaries and cost estimates
- **Vendor Management**: Send formatted requests to preferred vendors
- **Case Details**: Complete tenant information, photos, and conversation logs

## 🏗️ Architecture

### Navigation Structure
- **AuthStack**: Welcome → Role Selection → Login
- **MainStack**: Role-based navigation (Tenant vs Landlord flows)

### Key Screens
**Shared:**
- WelcomeScreen, RoleSelectScreen, LoginScreen

**Tenant Flow:**
- ReportIssueScreen → FollowUpScreen → ConfirmSubmissionScreen

**Landlord Flow:**  
- DashboardScreen → CaseDetailScreen → SendToVendorScreen

### State Management
- **AuthContext**: User authentication and session management
- **RoleContext**: Role-based UI switching with AsyncStorage persistence

### Components
- Header, TextInputField, SubmitButton (reusable UI components)

## 🛠️ Tech Stack

- **Frontend**: React Native + Expo + TypeScript
- **Navigation**: React Navigation v7
- **State**: Context API + AsyncStorage
- **UI**: Custom components with consistent design system
- **Media**: Expo Image Picker + Speech
- **Backend Ready**: Firebase integration points prepared

## 📂 Project Structure

```
src/
├── components/shared/     # Reusable UI components
├── context/              # React Context providers
├── navigation/           # Navigation stacks and configuration
├── screens/             # All app screens
│   ├── tenant/          # Tenant-specific screens
│   └── landlord/        # Landlord-specific screens
├── services/firebase/   # Backend integration (placeholder)
└── utils/              # Helper functions and constants
```

## 🎨 Design System

- **Primary Colors**: Blue (#3498DB), Dark Gray (#2C3E50)
- **Typography**: System fonts with consistent sizing
- **Spacing**: 8px grid system
- **Components**: Material Design inspired with custom styling

## 🚀 Next Steps (Phase 2)

1. **Firebase Integration**: Authentication, Firestore, Storage
2. **Push Notifications**: Real-time updates
3. **AI Integration**: OpenAI/Claude for intelligent responses
4. **Photo Processing**: AI-powered issue classification
5. **Vendor APIs**: Email automation with SendGrid

## 📱 Testing

The app successfully compiles and runs on:
- iOS Simulator
- Android Device/Emulator  
- Expo Go app

Use `npx expo start` and scan the QR code with Expo Go to test on device.

---

Built with Claude Code for rapid development and professional quality output.