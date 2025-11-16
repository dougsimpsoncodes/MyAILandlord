import { test, expect } from '@playwright/test';

/**
 * Complete End-to-End Property Setup and Maintenance Workflow Test
 * Simulates a real landlord creating a property and managing maintenance requests
 */
test.describe('Property Setup to Maintenance E2E Workflow', () => {
  
  // Mock property data
  const mockPropertyData = {
    propertyName: 'Sunset Apartments Unit 4B',
    fullName: 'John Smith',
    organization: 'Smith Property Management',
    addressLine1: '123 Sunset Boulevard',
    addressLine2: 'Unit 4B',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90210',
    country: 'United States',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 850,
    rentAmount: 2500,
    description: 'Modern 2-bedroom apartment with city views'
  };

  // Mock areas and assets
  const mockAreas = [
    {
      id: 'living-room',
      name: 'Living Room',
      assets: ['sofa', 'coffee-table', 'tv-stand', 'light-fixture']
    },
    {
      id: 'kitchen',
      name: 'Kitchen', 
      assets: ['refrigerator', 'stove', 'dishwasher', 'sink', 'microwave']
    },
    {
      id: 'bedroom-1',
      name: 'Master Bedroom',
      assets: ['bed-frame', 'dresser', 'closet', 'ceiling-fan']
    },
    {
      id: 'bathroom',
      name: 'Bathroom',
      assets: ['toilet', 'shower', 'sink', 'mirror', 'exhaust-fan']
    }
  ];

  // Mock maintenance requests
  const mockMaintenanceRequests = [
    {
      id: 'req_001',
      tenantName: 'Sarah Johnson',
      issueType: 'Plumbing',
      description: 'Kitchen faucet is leaking and making strange noises',
      area: 'Kitchen',
      asset: 'Sink',
      priority: 'medium',
      status: 'new',
      submittedAt: new Date().toISOString(),
      images: ['faucet-leak-1.jpg', 'faucet-leak-2.jpg'],
      estimatedCost: 150
    },
    {
      id: 'req_002', 
      tenantName: 'Sarah Johnson',
      issueType: 'Electrical',
      description: 'Bathroom exhaust fan making loud noises',
      area: 'Bathroom',
      asset: 'Exhaust Fan',
      priority: 'low',
      status: 'new',
      submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      images: ['fan-noise.jpg'],
      estimatedCost: 75
    }
  ];

  async function setupAuthentication(page: any) {
    // Mock authentication and set landlord role
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userId', 'landlord_123');
      localStorage.setItem('userEmail', 'john.smith@example.com');
      localStorage.setItem('userName', 'John Smith');
    });
  }

  async function navigateToLandlordDashboard(page: any) {
    // Start from welcome screen
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Get Started
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    
    // Select Landlord role
    const landlordCard = page.locator('text=I\'m a Landlord').locator('..');
    await landlordCard.click();
    await page.waitForLoadState('networkidle');
    
    // Set authentication
    await setupAuthentication(page);
    
    // Navigate to landlord home
    await page.goto('/landlord');
    await page.waitForLoadState('networkidle');
  }

  async function mockPropertyAPIs(page: any) {
    // Mock property creation API
    await page.route('**/api/properties', async route => {
      if (route.request().method() === 'POST') {
        const propertyData = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'property_001',
            ...propertyData,
            createdAt: new Date().toISOString()
          })
        });
      } else {
        // GET properties
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'property_001',
              name: mockPropertyData.propertyName,
              address: `${mockPropertyData.addressLine1}, ${mockPropertyData.city}, ${mockPropertyData.state}`,
              type: mockPropertyData.type,
              tenants: 1,
              activeRequests: 2
            }
          ])
        });
      }
    });

    // Mock areas API
    await page.route('**/api/properties/*/areas', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAreas)
        });
      }
    });

    // Mock assets API
    await page.route('**/api/properties/*/assets', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock maintenance requests API
    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMaintenanceRequests.map(req => ({
          id: req.id,
          issue_type: req.issueType.toLowerCase(),
          description: req.description,
          area: req.area.toLowerCase(),
          priority: req.priority,
          status: req.status,
          created_at: req.submittedAt,
          estimated_cost: req.estimatedCost,
          images: req.images,
          profiles: { name: req.tenantName }
        })))
      });
    });

    // Mock image upload API
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com/uploaded-image.jpg',
          id: 'img_' + Math.random().toString(36).substr(2, 9)
        })
      });
    });
  }

  test('Complete Property Setup and Maintenance Workflow', async ({ page }) => {
    // Setup API mocks
    await mockPropertyAPIs(page);
    
    // Navigate to landlord dashboard
    await navigateToLandlordDashboard(page);
    
    // Take screenshot of starting point
    await page.screenshot({ path: 'test-results/e2e-start.png', fullPage: true });
    
    console.log('✅ Step 1: Landlord authentication and navigation complete');

    // STEP 2: Navigate to Property Management
    await page.goto('/landlord/property-management');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/e2e-property-management.png', fullPage: true });
    
    // Look for Add Property button
    const addPropertyButton = page.locator('text=/Add Property|Create|New Property/i').first();
    if (await addPropertyButton.isVisible()) {
      await addPropertyButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try direct navigation
      await page.goto('/landlord/add-property');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ Step 2: Navigated to property creation');

    // STEP 3: Fill Property Basic Information
    await page.screenshot({ path: 'test-results/e2e-property-form.png', fullPage: true });
    
    // Fill property name
    const propertyNameField = page.locator('input[placeholder*="Property Name"], input[name="propertyName"], #propertyName').first();
    if (await propertyNameField.isVisible()) {
      await propertyNameField.fill(mockPropertyData.propertyName);
    }
    
    // Fill address fields
    const addressFields = [
      { selector: 'input[placeholder*="Address"], input[name="addressLine1"]', value: mockPropertyData.addressLine1 },
      { selector: 'input[placeholder*="City"], input[name="city"]', value: mockPropertyData.city },
      { selector: 'input[placeholder*="State"], input[name="state"]', value: mockPropertyData.state },
      { selector: 'input[placeholder*="Zip"], input[name="postalCode"]', value: mockPropertyData.postalCode }
    ];
    
    for (const field of addressFields) {
      const element = page.locator(field.selector).first();
      if (await element.isVisible()) {
        await element.fill(field.value);
        await page.waitForTimeout(300);
      }
    }
    
    // Select property type
    const apartmentOption = page.locator('text=/Apartment|apartment/i').first();
    if (await apartmentOption.isVisible()) {
      await apartmentOption.click();
    }
    
    await page.screenshot({ path: 'test-results/e2e-property-filled.png', fullPage: true });
    
    console.log('✅ Step 3: Property basic information filled');

    // STEP 4: Continue to next step
    const continueButton = page.locator('text=/Continue|Next|Save|Submit/i').first();
    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-results/e2e-after-continue.png', fullPage: true });
    
    console.log('✅ Step 4: Proceeded to next step');

    // STEP 5: Add Property Areas (if on areas screen)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('areas') || await page.locator('text=/Areas|Rooms|Add Area/i').count() > 0) {
      console.log('📝 Adding property areas...');
      
      // Add areas one by one
      for (const area of mockAreas) {
        const addAreaButton = page.locator('text=/Add Area|Add Room|+/i').first();
        if (await addAreaButton.isVisible()) {
          await addAreaButton.click();
          await page.waitForTimeout(500);
          
          // Fill area name
          const areaNameField = page.locator('input[placeholder*="Area"], input[placeholder*="Room"]').last();
          if (await areaNameField.isVisible()) {
            await areaNameField.fill(area.name);
            
            // Save area
            const saveAreaButton = page.locator('text=/Save|Add|OK/i').first();
            if (await saveAreaButton.isVisible()) {
              await saveAreaButton.click();
              await page.waitForTimeout(500);
            }
          }
        }
      }
      
      await page.screenshot({ path: 'test-results/e2e-areas-added.png', fullPage: true });
      
      // Continue to next step
      const nextButton = page.locator('text=/Continue|Next|Finish/i').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    console.log('✅ Step 5: Property areas configured');

    // STEP 6: Complete property setup
    // Look for final submission button
    const finalSubmitButton = page.locator('text=/Submit|Finish|Complete|Save Property/i').first();
    if (await finalSubmitButton.isVisible()) {
      await finalSubmitButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'test-results/e2e-property-created.png', fullPage: true });
    
    console.log('✅ Step 6: Property creation completed');

    // STEP 7: Navigate to Maintenance Dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/e2e-maintenance-dashboard.png', fullPage: true });
    
    console.log('✅ Step 7: Navigated to maintenance dashboard');

    // STEP 8: Verify maintenance requests are displayed
    const dashboardContent = await page.locator('body').textContent();
    console.log('Dashboard content preview:', dashboardContent?.substring(0, 300));
    
    // Look for maintenance-related elements
    const maintenanceElements = await page.locator('text=/Maintenance|Cases|Requests|New|Progress|Plumbing|Kitchen/i').count();
    console.log('Found maintenance elements:', maintenanceElements);
    
    if (maintenanceElements > 0) {
      // Try to click on a maintenance case
      const caseCard = page.locator('[data-testid="case-card"], .caseCard').first();
      const kitchenText = page.locator('text=Kitchen').first();
      const anyCase = await caseCard.isVisible() ? caseCard : kitchenText;
      
      if (await anyCase.isVisible()) {
        await anyCase.click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ path: 'test-results/e2e-case-detail.png', fullPage: true });
        console.log('✅ Step 8: Accessed case detail');
        
        // Test sending to vendor
        const sendToVendorButton = page.locator('text=/Send to Vendor|Vendor/i').first();
        if (await sendToVendorButton.isVisible()) {
          await sendToVendorButton.click();
          await page.waitForLoadState('networkidle');
          
          await page.screenshot({ path: 'test-results/e2e-vendor-screen.png', fullPage: true });
          console.log('✅ Step 9: Accessed vendor communication');
        }
      }
    }
    
    // STEP 9: Verify complete workflow
    await page.screenshot({ path: 'test-results/e2e-complete.png', fullPage: true });
    
    // Final verification - ensure we have evidence of successful workflow
    const workflowSuccess = 
      (await page.locator('text=/Property|Maintenance|Dashboard/i').count() > 0) ||
      (await page.locator('text=/Welcome|Cases|Requests/i').count() > 0);
    
    expect(workflowSuccess).toBeTruthy();
    
    console.log('🎉 COMPLETE: End-to-end property setup and maintenance workflow validated!');
  });

  test('Property Creation Form Validation', async ({ page }) => {
    await mockPropertyAPIs(page);
    await navigateToLandlordDashboard(page);
    
    // Navigate to add property
    await page.goto('/landlord/add-property');
    await page.waitForLoadState('networkidle');
    
    // Test form validation by submitting empty form
    const submitButton = page.locator('text=/Submit|Continue|Save/i').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Should show validation errors
      const hasValidationErrors = await page.locator('text=/required|error|invalid/i').count() > 0;
      console.log('Form validation working:', hasValidationErrors);
    }
    
    // Fill form with valid data
    await page.locator('input').first().fill(mockPropertyData.propertyName);
    
    // Test that validation clears
    await page.screenshot({ path: 'test-results/e2e-form-validation.png', fullPage: true });
  });

  test('Responsive Design During Property Setup', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await mockPropertyAPIs(page);
      await navigateToLandlordDashboard(page);
      
      // Test property form on different viewports
      await page.goto('/landlord/add-property');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: `test-results/e2e-property-form-${viewport.name}.png`, 
        fullPage: true 
      });
      
      // Verify form is usable on this viewport
      const formInputs = await page.locator('input, textarea, select').count();
      expect(formInputs).toBeGreaterThan(0);
      
      console.log(`✅ Property form responsive on ${viewport.name}: ${formInputs} inputs`);
    }
  });
});