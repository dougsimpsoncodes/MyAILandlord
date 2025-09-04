#!/usr/bin/env node

/**
 * Test REST API Access
 * Verifies that the REST API can fetch maintenance requests
 */

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function testRestApi() {
  try {
    console.log('🔍 Testing REST API access to maintenance_requests...\n');
    
    // Test 1: Direct REST API call without authentication
    const response = await fetch(`${supabaseUrl}/rest/v1/maintenance_requests?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ REST API call failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ REST API call successful!');
    console.log(`📊 Found ${data.length} maintenance requests\n`);
    
    if (data.length > 0) {
      console.log('📋 Sample maintenance request:');
      const sample = data[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Title: ${sample.title}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Priority: ${sample.priority}`);
      console.log(`  Area: ${sample.area}`);
      console.log(`  Created: ${new Date(sample.created_at).toLocaleDateString()}\n`);
    }

    // Test 2: Check with joins
    const responseWithJoins = await fetch(
      `${supabaseUrl}/rest/v1/maintenance_requests?select=*,profiles!tenant_id(name,email),properties(name,address)&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (responseWithJoins.ok) {
      const dataWithJoins = await responseWithJoins.json();
      console.log('✅ REST API with joins successful!');
      console.log(`📊 Found ${dataWithJoins.length} maintenance requests with related data\n`);
      
      if (dataWithJoins.length > 0 && dataWithJoins[0].properties) {
        console.log('🏠 Property info available:', dataWithJoins[0].properties.name);
      }
      if (dataWithJoins.length > 0 && dataWithJoins[0].profiles) {
        console.log('👤 Tenant info available:', dataWithJoins[0].profiles.name);
      }
    } else {
      console.log('⚠️  REST API with joins failed - might be RLS issue');
    }

  } catch (error) {
    console.error('❌ Error testing REST API:', error);
  }
}

testRestApi();