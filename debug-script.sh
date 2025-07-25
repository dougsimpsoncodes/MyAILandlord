#!/bin/bash

# Google Authentication Debug Script for LLM Analysis
# This script provides comprehensive context for debugging Google Sign-In issues

echo "==================== GOOGLE AUTHENTICATION DEBUG CONTEXT ===================="
echo "Please analyze the following React Native + Expo Google Sign-In configuration"
echo "and provide specific solutions for the 'You must specify |clientID| in |GIDConfiguration|' error."
echo ""

echo "==================== DEBUG REPORT ===================="
cat google-auth-debug-report.md
echo ""

echo "==================== CURRENT FILE CONTENTS ===================="
echo ""

echo "--- GoogleService-Info.plist ---"
cat GoogleService-Info.plist
echo ""

echo "--- app.json (relevant sections) ---"
cat app.json
echo ""

echo "--- .env file ---"
cat .env
echo ""

echo "--- Google Sign-In Service Implementation ---"
cat src/services/auth/googleSignIn.ts
echo ""

echo "--- package.json dependencies ---"
jq '.dependencies | to_entries[] | select(.key | contains("google") or contains("firebase") or contains("expo"))' package.json
echo ""

echo "==================== RECENT ERROR LOGS ===================="
echo "Recent Metro/Console logs:"
tail -20 /tmp/metro.log 2>/dev/null || echo "No Metro logs available"
echo ""

echo "==================== QUESTIONS FOR LLM ANALYSIS ===================="
echo "1. Is the Google Sign-In configuration correct for Expo development builds?"
echo "2. Should we use webClientId, iosClientId, or both in GoogleSignin.configure()?"
echo "3. Is the URL scheme format correct in app.json CFBundleURLSchemes?"
echo "4. Could there be a timing issue with the configuration vs module initialization?"
echo "5. Are there Expo-specific requirements we're missing?"
echo "6. Should the configuration happen in a different lifecycle method?"
echo ""

echo "==================== EXPECTED SOLUTIONS ===================="
echo "Please provide:"
echo "- Specific code changes needed"
echo "- Configuration file modifications"
echo "- Alternative implementation approaches"
echo "- Debugging steps to verify the fix"
echo ""

echo "==================== ENVIRONMENT INFO ===================="
echo "Expo SDK: 53.0.20"
echo "React Native: 0.79.5"
echo "@react-native-google-signin/google-signin: 15.0.0"
echo "Firebase: 12.0.0"
echo "Platform: iOS (Physical device + Simulator)"
echo "Build Type: Development build (not Expo Go)"