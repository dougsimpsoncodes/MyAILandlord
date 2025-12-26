#!/usr/bin/env node
/**
 * Real E2E Test: Area Photos Persistence
 *
 * This test actually:
 * 1. Creates test property via API
 * 2. Uploads real photos to storage
 * 3. Saves areas with photos to database
 * 4. Adds an asset
 * 5. Verifies photos still exist in database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  console.log('🧪 Real E2E Test: Area Photos Persistence\n');

  try {
    // Step 1: Sign in
    console.log('Step 1: Authenticating...');
    const testEmail = process.env.TEST_LANDLORD_EMAIL || 'e2e-test@myailandlord.com';
    const testPassword = process.env.TEST_LANDLORD_PASSWORD || 'TestUser123!E2E';

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) throw new Error(`Auth failed: ${authError.message}`);
    console.log('  ✅ Authenticated as', authData.user.email);

    // Step 2: Create test property
    console.log('\nStep 2: Creating test property...');
    const { data: property, error: propError } = await supabase.rpc('create_property', {
      p_name: 'E2E Test Property - Photo Persistence',
      p_address_jsonb: {
        line1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102'
      },
      p_property_type: 'house',
      p_unit: '',
      p_bedrooms: 2,
      p_bathrooms: 2
    });

    if (propError) throw new Error(`Property creation failed: ${propError.message}`);
    const propertyId = property;
    console.log('  ✅ Property created:', propertyId);

    // Step 3: Create kitchen area with photos
    console.log('\nStep 3: Creating kitchen area with 3 photos...');

    // Create simple test images (1x1 pixel PNG)
    const testPhotoData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const photoPaths = [];
    for (let i = 1; i <= 3; i++) {
      const photoPath = `${propertyId}/kitchen/test-photo-${i}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(photoPath, testPhotoData, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw new Error(`Photo ${i} upload failed: ${uploadError.message}`);
      photoPaths.push(photoPath);
      console.log(`  ✅ Uploaded photo ${i}:`, photoPath);
    }

    // Insert kitchen area with photo paths
    const { data: area, error: areaError } = await supabase
      .from('property_areas')
      .insert({
        property_id: propertyId,
        name: 'Kitchen',
        area_type: 'kitchen',
        icon_name: 'restaurant',
        is_default: true,
        photos: photoPaths, // CRITICAL: Store paths, not URLs
        inventory_complete: false,
        condition: 'good'
      })
      .select()
      .single();

    if (areaError) throw new Error(`Area creation failed: ${areaError.message}`);
    console.log('  ✅ Kitchen area created with 3 photos');

    // Step 4: Verify photos are retrievable
    console.log('\nStep 4: Verifying photos are retrievable...');
    const { data: areaCheck1 } = await supabase
      .from('property_areas')
      .select('*')
      .eq('id', area.id)
      .single();

    if (!areaCheck1.photos || areaCheck1.photos.length !== 3) {
      throw new Error(`❌ Kitchen should have 3 photos, found: ${areaCheck1.photos?.length || 0}`);
    }
    console.log(`  ✅ Kitchen has ${areaCheck1.photos.length} photos in database`);

    // Step 5: Add asset to kitchen
    console.log('\nStep 5: Adding Fridge asset...');
    const { error: assetError } = await supabase
      .from('property_assets')
      .insert({
        area_id: area.id,
        property_id: propertyId,
        name: 'Fridge',
        asset_type: 'appliance',
        category: 'appliance',
        brand: 'Whirlpool',
        model: 'WRF555SDFZ',
        condition: 'good',
        is_active: true
      });

    if (assetError) throw new Error(`Asset creation failed: ${assetError.message}`);
    console.log('  ✅ Fridge asset added');

    // Step 6: CRITICAL - Verify kitchen photos STILL exist
    console.log('\nStep 6: Verifying kitchen photos STILL exist after adding asset...');
    const { data: areaCheck2 } = await supabase
      .from('property_areas')
      .select('*')
      .eq('id', area.id)
      .single();

    if (!areaCheck2.photos || areaCheck2.photos.length !== 3) {
      throw new Error(`❌ BUG REPRODUCED: Kitchen photos disappeared! Found: ${areaCheck2.photos?.length || 0}`);
    }
    console.log(`  ✅ Kitchen STILL has ${areaCheck2.photos.length} photos (bug fixed!)`);

    // Step 7: Verify photos can be accessed via signed URLs
    console.log('\nStep 7: Verifying photos can be accessed via signed URLs...');
    for (const photoPath of areaCheck2.photos) {
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('property-images')
        .createSignedUrl(photoPath, 60);

      if (urlError) throw new Error(`Failed to get signed URL for ${photoPath}: ${urlError.message}`);
      console.log(`  ✅ Photo accessible:`, photoPath);
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await supabase.from('property_assets').delete().eq('property_id', propertyId);
    await supabase.from('property_areas').delete().eq('property_id', propertyId);
    await supabase.from('properties').delete().eq('id', propertyId);

    for (const photoPath of photoPaths) {
      await supabase.storage.from('property-images').remove([photoPath]);
    }
    console.log('  ✅ Cleanup complete');

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ REAL E2E TEST PASSED - Fix validated with real data! ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Verified:');
    console.log('  • Photos uploaded to real Supabase storage ✅');
    console.log('  • Photo paths saved to real database ✅');
    console.log('  • Photos persisted after adding asset ✅');
    console.log('  • Photos accessible via signed URLs ✅\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:\n');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runTest();
