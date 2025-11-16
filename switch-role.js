#!/usr/bin/env node

/**
 * Switch user role between tenant and landlord
 * This helps test different flows without having to go through role selection
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const ROLE_STORAGE_KEY = '@MyAILandlord:userRole';

async function getCurrentRole() {
  try {
    // Use adb for Android or xcrun for iOS simulator
    // This example uses iOS simulator
    const { stdout } = await execAsync(
      `xcrun simctl spawn booted defaults read com.example.myailandlord '${ROLE_STORAGE_KEY}' 2>/dev/null || echo "not set"`
    );
    return stdout.trim();
  } catch (error) {
    return 'unknown';
  }
}

async function setRole(role) {
  if (role !== 'tenant' && role !== 'landlord') {
    console.error('❌ Invalid role. Must be "tenant" or "landlord"');
    process.exit(1);
  }

  try {
    // For iOS Simulator
    await execAsync(
      `xcrun simctl spawn booted defaults write com.example.myailandlord '${ROLE_STORAGE_KEY}' '${role}'`
    );
    console.log(`✅ Role set to: ${role}`);
    console.log('🔄 Please reload the app (press R in Metro) to apply the change');
  } catch (error) {
    console.error('❌ Failed to set role:', error.message);
    console.log('\n💡 Alternative: Clear app data and select role on next launch:');
    console.log('   iOS: Delete and reinstall the app');
    console.log('   Android: Settings > Apps > MyAILandlord > Clear Data');
  }
}

async function clearRole() {
  try {
    await execAsync(
      `xcrun simctl spawn booted defaults delete com.example.myailandlord '${ROLE_STORAGE_KEY}'`
    );
    console.log('✅ Role cleared');
    console.log('🔄 App will show role selection on next launch');
  } catch (error) {
    console.log('⚠️  Role may already be cleared or not set');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🔧 MyAI Landlord Role Switcher');
  console.log('==============================\n');

  if (!command) {
    const currentRole = await getCurrentRole();
    console.log(`📋 Current role: ${currentRole}`);
    console.log('\n📖 Usage:');
    console.log('   node switch-role.js tenant    - Switch to tenant role');
    console.log('   node switch-role.js landlord  - Switch to landlord role');
    console.log('   node switch-role.js clear     - Clear role (show selection)');
    console.log('   node switch-role.js          - Show current role');
    return;
  }

  switch (command) {
    case 'tenant':
      await setRole('tenant');
      break;
    case 'landlord':
      await setRole('landlord');
      break;
    case 'clear':
      await clearRole();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('   Use "tenant", "landlord", or "clear"');
      process.exit(1);
  }
}

main().catch(console.error);