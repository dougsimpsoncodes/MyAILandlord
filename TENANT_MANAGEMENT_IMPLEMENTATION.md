# Tenant Management System - Step-by-Step Implementation Plan

## Overview
Building a complete tenant management system for landlords with invitation flow, tenant profiles, and lease management.

## Phase 1: Database & API Foundation (Day 1)

### Step 1.1: Verify Database Schema ✅
**What**: Confirm existing tables are ready
**Test**: Run SQL queries to verify structure
```sql
-- Test in Supabase SQL editor
SELECT * FROM tenant_property_links LIMIT 1;
SELECT * FROM profiles WHERE role = 'tenant' LIMIT 1;
```
**Success**: Tables exist with correct columns

### Step 1.2: Create API Service Layer
**What**: Add tenant management methods to API client
**File**: `src/clients/ClerkSupabaseClient.ts`
**Implementation**:
```typescript
// Add these functions to ClerkSupabaseClient.ts

export async function getPropertyTenants(propertyId: string) {
  const { data, error } = await supabase
    .from('tenant_property_links')
    .select(`
      *,
      tenant:profiles!tenant_id(*)
    `)
    .eq('property_id', propertyId)
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
}

export async function inviteTenant(email: string, propertyId: string, unitNumber?: string) {
  // Create invitation record
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email,
      property_id: propertyId,
      unit_number: unitNumber,
      invitation_code: generateInviteCode(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Send invitation email (mock for now)
  console.log(`Invitation sent to ${email} for property ${propertyId}`);
  return data;
}

export async function removeTenant(tenantId: string, propertyId: string) {
  const { error } = await supabase
    .from('tenant_property_links')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId);
    
  if (error) throw error;
  return true;
}
```

**Test**: 
```bash
# Create test file and run
npm test -- --testNamePattern="tenant API"
```
**Success**: All API methods return expected data

### Step 1.3: Create Invitations Table Migration
**What**: Add invitations table for tenant onboarding
**File**: Create `migrations/2025-08-18_add_invitations_table.sql`
```sql
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT,
  invitation_code TEXT UNIQUE NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their property invitations" ON invitations
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties 
      WHERE user_id = auth.uid()
    )
  );
```

**Test**: Run migration in Supabase
**Success**: Table created, policies work

## Phase 2: Core Screens (Day 2-3)

### Step 2.1: Create TenantManagementScreen
**What**: Main screen for viewing all tenants
**File**: `src/screens/landlord/TenantManagementScreen.tsx`
**Implementation**:
```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getPropertyTenants } from '@/clients/ClerkSupabaseClient';

export function TenantManagementScreen({ navigation, route }) {
  const { propertyId } = route.params;
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, [propertyId]);

  const loadTenants = async () => {
    try {
      const data = await getPropertyTenants(propertyId);
      setTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTenant = ({ item }) => (
    <Card style={{ marginBottom: 12 }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('TenantDetails', { tenant: item })}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          {item.tenant.name || item.tenant.email}
        </Text>
        <Text>Unit: {item.unit_number || 'Not specified'}</Text>
        <Text>Status: {item.is_active ? 'Active' : 'Inactive'}</Text>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button
        title="Invite New Tenant"
        onPress={() => navigation.navigate('InviteTenant', { propertyId })}
        style={{ marginBottom: 16 }}
      />
      
      {loading ? (
        <Text>Loading tenants...</Text>
      ) : (
        <FlatList
          data={tenants}
          renderItem={renderTenant}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No tenants yet</Text>}
        />
      )}
    </View>
  );
}
```

**Test**:
1. Navigate to screen from PropertyDetailsScreen
2. Verify tenant list displays
3. Test navigation to tenant details
**Success**: Screen loads and displays tenants correctly

### Step 2.2: Create InviteTenantScreen
**What**: Screen for inviting new tenants
**File**: `src/screens/landlord/InviteTenantScreen.tsx`
**Implementation**:
```typescript
import React, { useState } from 'react';
import { View, TextInput, Alert } from 'react-native';
import { Button } from '@/components/ui/Button';
import { inviteTenant } from '@/clients/ClerkSupabaseClient';

export function InviteTenantScreen({ navigation, route }) {
  const { propertyId } = route.params;
  const [email, setEmail] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await inviteTenant(email, propertyId, unitNumber);
      Alert.alert('Success', 'Invitation sent!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Tenant Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, marginBottom: 16 }}
      />
      
      <TextInput
        placeholder="Unit Number (optional)"
        value={unitNumber}
        onChangeText={setUnitNumber}
        style={{ borderWidth: 1, padding: 12, marginBottom: 16 }}
      />
      
      <Button
        title={loading ? "Sending..." : "Send Invitation"}
        onPress={handleInvite}
        disabled={loading}
      />
    </View>
  );
}
```

**Test**:
1. Enter valid email
2. Submit invitation
3. Check database for invitation record
**Success**: Invitation created in database

### Step 2.3: Create TenantDetailsScreen
**What**: Detailed view of individual tenant
**File**: `src/screens/landlord/TenantDetailsScreen.tsx`
**Implementation**:
```typescript
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function TenantDetailsScreen({ navigation, route }) {
  const { tenant } = route.params;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
          Contact Information
        </Text>
        <Text>Name: {tenant.tenant.name || 'Not provided'}</Text>
        <Text>Email: {tenant.tenant.email}</Text>
        <Text>Phone: {tenant.tenant.phone || 'Not provided'}</Text>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
          Lease Information
        </Text>
        <Text>Unit: {tenant.unit_number || 'Not specified'}</Text>
        <Text>Move-in Date: {tenant.lease_start_date || 'Not set'}</Text>
        <Text>Lease End: {tenant.lease_end_date || 'Not set'}</Text>
      </Card>

      <Button
        title="Message Tenant"
        onPress={() => navigation.navigate('Communication', { tenantId: tenant.tenant_id })}
        style={{ marginBottom: 12 }}
      />
      
      <Button
        title="Remove Tenant"
        onPress={() => handleRemoveTenant()}
        style={{ backgroundColor: '#dc3545' }}
      />
    </ScrollView>
  );
}
```

**Test**:
1. Navigate from tenant list
2. Verify all tenant info displays
3. Test navigation to messaging
**Success**: Details display correctly

## Phase 3: Navigation Integration (Day 3)

### Step 3.1: Update Navigation Stack
**What**: Add new screens to navigation
**File**: `src/navigation/LandlordStack.tsx`
**Implementation**:
```typescript
import { TenantManagementScreen } from '@/screens/landlord/TenantManagementScreen';
import { InviteTenantScreen } from '@/screens/landlord/InviteTenantScreen';
import { TenantDetailsScreen } from '@/screens/landlord/TenantDetailsScreen';

// Add to stack navigator
<Stack.Screen 
  name="TenantManagement" 
  component={TenantManagementScreen}
  options={{ title: 'Manage Tenants' }}
/>
<Stack.Screen 
  name="InviteTenant" 
  component={InviteTenantScreen}
  options={{ title: 'Invite Tenant' }}
/>
<Stack.Screen 
  name="TenantDetails" 
  component={TenantDetailsScreen}
  options={{ title: 'Tenant Details' }}
/>
```

**Test**: Navigation between screens works
**Success**: All screens accessible

### Step 3.2: Add Entry Points
**What**: Add buttons to access tenant management
**Files**: 
- `src/screens/landlord/PropertyDetailsScreen.tsx`
- `src/screens/landlord/LandlordHomeScreen.tsx`

**Implementation**:
```typescript
// In PropertyDetailsScreen
<Button
  title="Manage Tenants"
  onPress={() => navigation.navigate('TenantManagement', { propertyId: property.id })}
  icon="users"
/>

// In LandlordHomeScreen
<TouchableOpacity
  onPress={() => navigation.navigate('TenantManagement')}
  style={styles.quickAction}
>
  <Text>Tenant Management</Text>
</TouchableOpacity>
```

**Test**: Access from both entry points
**Success**: Navigation works from all entry points

## Phase 4: Enhanced Features (Day 4)

### Step 4.1: Add Lease Management
**What**: Allow editing lease dates and rent
**File**: Update `TenantDetailsScreen.tsx`
**Implementation**: Add form fields for lease info with save functionality

**Test**: Edit and save lease information
**Success**: Lease data persists

### Step 4.2: Add Tenant Search/Filter
**What**: Search and filter tenant list
**File**: Update `TenantManagementScreen.tsx`
**Implementation**: Add search bar and filter dropdown

**Test**: Search by name, filter by property
**Success**: Search and filters work

### Step 4.3: Add Bulk Actions
**What**: Message multiple tenants at once
**File**: Update `TenantManagementScreen.tsx`
**Implementation**: Add selection mode and bulk message button

**Test**: Select multiple tenants and send message
**Success**: Bulk messaging works

## Phase 5: Testing & Polish (Day 5)

### Step 5.1: End-to-End Testing
**Tests to Run**:
1. Complete invitation flow (invite → accept → appear in list)
2. Edit tenant information and verify persistence
3. Remove tenant and verify soft delete
4. Navigate all screens without crashes
5. Test on both iOS and Android

### Step 5.2: Error Handling
**What**: Add proper error states and loading indicators
**Files**: All tenant screens
**Implementation**: Add try-catch blocks, loading states, error messages

### Step 5.3: UI Polish
**What**: Consistent styling and animations
**Files**: All tenant screens
**Implementation**: Apply design system consistently, add transitions

## Testing Checklist

### Unit Tests
- [ ] API methods return correct data
- [ ] Error handling works properly
- [ ] Validation functions work

### Integration Tests
- [ ] Invitation creates database record
- [ ] Tenant list updates after invitation
- [ ] Lease updates persist
- [ ] Tenant removal soft deletes

### E2E Tests
- [ ] Complete flow from invitation to management
- [ ] All navigation paths work
- [ ] Data persists across app restarts
- [ ] Works on both platforms

## Success Metrics

### Day 1 Success
- [ ] Database schema verified
- [ ] API layer complete
- [ ] Invitations table created

### Day 2 Success
- [ ] All three screens created
- [ ] Basic functionality working
- [ ] Navigation integrated

### Day 3 Success
- [ ] Screens accessible from app
- [ ] Data flows correctly
- [ ] Basic CRUD operations work

### Day 4 Success
- [ ] Enhanced features added
- [ ] Search and filter work
- [ ] Lease management functional

### Day 5 Success
- [ ] All tests passing
- [ ] Error handling complete
- [ ] UI polished and consistent

## Common Issues & Solutions

### Issue: Invitation email not sending
**Solution**: For MVP, use console.log. Later integrate SendGrid/Resend

### Issue: Tenant already exists
**Solution**: Check existing tenant before creating invitation

### Issue: Property has no units
**Solution**: Make unit number optional, use property address

### Issue: Tenant has active leases
**Solution**: Soft delete only, maintain history

## Next Steps After Completion

1. **Email Integration**: Real email sending with SendGrid
2. **Document Upload**: Lease documents and agreements
3. **Payment Tracking**: Rent payment history
4. **Maintenance Integration**: Link tenant to their requests
5. **Analytics**: Tenant metrics and insights