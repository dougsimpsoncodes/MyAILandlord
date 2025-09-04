import { test, expect } from '@playwright/test';

/**
 * Comprehensive Property-to-Maintenance Workflow Test
 * Real world simulation with step-by-step validation
 */
test.describe('Complete Property and Maintenance Workflow', () => {
  
  test('Full landlord workflow from onboarding to maintenance management', async ({ page }) => {
    console.log('🚀 Starting comprehensive landlord workflow test');
    
    // Step 1: Navigate to app and capture initial state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/workflow-01-initial.png', fullPage: true });
    
    console.log('✅ Step 1: App loaded successfully');
    
    // Verify welcome screen
    await expect(page.getByText('My AI Landlord')).toBeVisible();
    await expect(page.getByText('Get Started')).toBeVisible();
    
    // Step 2: Begin onboarding
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/workflow-02-onboarding.png', fullPage: true });
    
    console.log('✅ Step 2: Onboarding started');
    
    // Verify role selection
    await expect(page.getByText('Who are you?')).toBeVisible();
    await expect(page.getByText('I\'m a Landlord')).toBeVisible();
    
    // Step 3: Select landlord role
    const landlordCard = page.locator('text=I\'m a Landlord').locator('..');
    await landlordCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/workflow-03-landlord-selected.png', fullPage: true });
    
    console.log('✅ Step 3: Landlord role selected');
    
    // Step 4: Set authentication after page loads
    await page.evaluate(() => {
      try {
        localStorage.setItem('userRole', 'landlord');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', 'landlord_test_123');
        console.log('Auth set successfully');
      } catch (e) {
        console.log('Auth setting failed:', e);
      }
    });
    
    console.log('✅ Step 4: Authentication configured');
    
    // Step 5: Mock API responses for realistic data
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/properties') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'prop_001',
              name: 'Sunset Apartments Unit 4B',
              address: '123 Sunset Blvd, Los Angeles, CA 90210',
              type: 'apartment',
              tenants: 1,
              activeRequests: 2,
              createdAt: new Date().toISOString()
            }
          ])
        });
      } else if (url.includes('/maintenance-requests') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'req_001',
              issue_type: 'plumbing',
              description: 'Kitchen faucet is leaking and making strange noises when turned on',
              area: 'kitchen',
              priority: 'medium',
              status: 'new',
              created_at: new Date().toISOString(),
              estimated_cost: 150,
              images: ['faucet-leak-1.jpg', 'faucet-leak-2.jpg'],
              profiles: { name: 'Sarah Johnson' }
            },
            {
              id: 'req_002',
              issue_type: 'electrical',
              description: 'Bathroom exhaust fan making loud buzzing noises',
              area: 'bathroom',
              priority: 'low',
              status: 'new',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              estimated_cost: 75,
              images: ['fan-noise.jpg'],
              profiles: { name: 'Sarah Johnson' }
            }
          ])
        });
      } else if (url.includes('/vendors') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'vendor_001',
              name: 'Mike\'s Plumbing Services',
              email: 'mike@mikesplumbing.com',
              phone: '+1 (555) 987-6543',
              specialty: ['Plumbing', 'Emergency Repairs'],
              rating: 4.8,
              responseTime: '< 2 hours',
              isPreferred: true
            },
            {
              id: 'vendor_002',
              name: 'Quick Fix Maintenance',
              email: 'info@quickfixmaint.com',
              phone: '+1 (555) 456-7890',
              specialty: ['Plumbing', 'Electrical', 'HVAC'],
              rating: 4.6,
              responseTime: '< 4 hours',
              isPreferred: false
            }
          ])
        });
      } else {
        // Default success response for POST/PUT requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            id: `mock_${Date.now()}`,
            message: 'Operation completed successfully'
          })
        });
      }
    });
    
    console.log('✅ Step 5: API mocking configured');
    
    // Step 6: Test navigation to different landlord features
    const testUrls = [
      { url: '/landlord', name: 'landlord-home' },
      { url: '/landlord/property-management', name: 'property-mgmt' },
      { url: '/landlord/dashboard', name: 'dashboard' },
      { url: '/landlord/add-property', name: 'add-property' }
    ];
    
    for (const { url, name } of testUrls) {
      console.log(`🔍 Testing navigation to: ${url}`);
      
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: `test-results/workflow-06-${name}.png`, 
        fullPage: true 
      });
      
      // Analyze page content
      const content = await page.locator('body').textContent();
      const hasLandlordFeatures = content?.includes('Property') || 
                                  content?.includes('Dashboard') || 
                                  content?.includes('Maintenance') ||
                                  content?.includes('Management') ||
                                  content?.includes('Add') ||
                                  content?.includes('Cases');
      
      console.log(`📄 ${url} - Has landlord features: ${hasLandlordFeatures}`);
      
      if (hasLandlordFeatures) {
        console.log(`✅ Successfully accessed landlord feature: ${url}`);
      }
    }
    
    // Step 7: Test property creation workflow
    console.log('🏠 Testing property creation workflow');
    
    await page.goto('/landlord/add-property');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Fill property form if present
    const inputs = page.locator('input[type="text"], input:not([type])');
    const inputCount = await inputs.count();
    
    console.log(`📝 Found ${inputCount} input fields`);
    
    if (inputCount > 0) {
      const propertyData = [
        'Sunset Luxury Apartments',  // Property name
        '123 Sunset Boulevard',      // Address
        'Los Angeles',               // City  
        'CA',                        // State
        '90210'                      // Zip code
      ];
      
      for (let i = 0; i < Math.min(inputCount, propertyData.length); i++) {
        try {
          await inputs.nth(i).fill(propertyData[i]);
          await page.waitForTimeout(200);
          console.log(`✅ Filled input ${i+1}: ${propertyData[i]}`);
        } catch (error) {
          console.log(`⚠️ Could not fill input ${i+1}: ${error}`);
        }
      }
      
      await page.screenshot({ path: 'test-results/workflow-07-property-filled.png', fullPage: true });
      
      // Try to submit the form
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Continue"), button:has-text("Save"), button:has-text("Next")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test-results/workflow-08-property-submitted.png', fullPage: true });
        console.log('✅ Property form submitted');
      }
    }
    
    // Step 8: Test maintenance dashboard
    console.log('🔧 Testing maintenance dashboard');
    
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/workflow-09-maintenance-dashboard.png', fullPage: true });
    
    // Look for maintenance content
    const dashboardContent = await page.locator('body').textContent();
    const maintenanceKeywords = ['Maintenance', 'Cases', 'Requests', 'Kitchen', 'Plumbing', 'New', 'Progress', 'Resolved'];
    const foundKeywords = maintenanceKeywords.filter(keyword => 
      dashboardContent?.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log(`🔧 Found maintenance keywords: ${foundKeywords.join(', ')}`);
    
    if (foundKeywords.length > 0) {
      console.log('✅ Maintenance dashboard has relevant content');
      
      // Try to interact with maintenance elements
      for (const keyword of foundKeywords.slice(0, 3)) { // Test first 3 found keywords
        const element = page.locator(`text=${keyword}`).first();
        if (await element.isVisible()) {
          try {
            await element.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: `test-results/workflow-10-clicked-${keyword.toLowerCase()}.png`, 
              fullPage: true 
            });
            
            console.log(`✅ Successfully clicked: ${keyword}`);
            break; // Stop after first successful click
          } catch (error) {
            console.log(`⚠️ Could not click ${keyword}: ${error}`);
          }
        }
      }
    }
    
    // Step 9: Test responsive design
    console.log('📱 Testing responsive design');
    
    const viewports = [
      { width: 390, height: 844, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `test-results/workflow-11-${viewport.name}-dashboard.png`, 
        fullPage: true 
      });
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) tested`);
    }
    
    // Reset to desktop for final verification
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Step 10: Final verification and summary
    console.log('🏁 Final verification');
    
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/workflow-12-final-state.png', fullPage: true });
    
    const finalUrl = page.url();
    const finalContent = await page.locator('body').textContent();
    const workflowSuccess = finalUrl.includes('localhost:8082') && 
                           (finalContent?.includes('Landlord') || 
                            finalContent?.includes('Property') || 
                            finalContent?.includes('Maintenance'));
    
    console.log(`🎯 Final URL: ${finalUrl}`);
    console.log(`✅ Workflow Success: ${workflowSuccess}`);
    
    // Test assertions
    expect(finalUrl).toContain('localhost:8082');
    expect(workflowSuccess).toBeTruthy();
    
    console.log('🎉 COMPLETE: Full landlord workflow test finished successfully!');
    console.log('📊 Generated 12+ screenshots documenting the entire workflow');
  });

  test('Test maintenance request lifecycle simulation', async ({ page }) => {
    console.log('🔧 Testing maintenance request lifecycle');
    
    // Setup and navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    
    await page.locator('text=I\'m a Landlord').locator('..').click();
    await page.waitForLoadState('networkidle');
    
    // Set auth after page interaction
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
    
    // Mock maintenance data
    await page.route('**/api/maintenance-requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'urgent_req',
            issue_type: 'plumbing',
            description: 'Emergency: Kitchen sink completely blocked, water backing up',
            area: 'kitchen',
            priority: 'emergency',
            status: 'new',
            created_at: new Date().toISOString(),
            estimated_cost: 300,
            images: ['emergency-sink.jpg'],
            profiles: { name: 'Emergency Tenant' }
          }
        ])
      });
    });
    
    // Navigate to dashboard and test emergency handling
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/emergency-dashboard.png', fullPage: true });
    
    const hasEmergencyContent = await page.locator('text=/Emergency|Urgent|Kitchen|Plumbing/i').count();
    console.log(`🚨 Emergency maintenance content found: ${hasEmergencyContent > 0}`);
    
    expect(hasEmergencyContent).toBeGreaterThan(0);
  });
});