import { test, expect } from '@playwright/test';

/**
 * Test suite for Send to Vendor Screen functionality
 * Tests vendor selection, email configuration, and sending maintenance requests to vendors
 *
 * SKIP: These tests require a specific case to exist in the database.
 * They navigate to /landlord/send-to-vendor/test-case-1 which won't exist without seeding.
 * Enable when test data seeding is implemented.
 */
test.describe.skip('Send to Vendor Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and complete login flow
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Mock authentication state
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
    
    // Navigate to send to vendor screen with a test case ID
    await page.goto('/landlord/send-to-vendor/test-case-1');
    await page.waitForLoadState('networkidle');
  });

  test('should display screen header and case summary', async ({ page }) => {
    // Check header elements
    await expect(page.getByText('Send to Vendor')).toBeVisible();
    await expect(page.getByText('Select a vendor and customize the maintenance request email')).toBeVisible();
    
    // Check case summary section
    await expect(page.getByText('Case Summary')).toBeVisible();
    await expect(page.getByText('Tenant:')).toBeVisible();
    await expect(page.getByText('Issue:')).toBeVisible();
    await expect(page.getByText('Priority:')).toBeVisible();
    
    // Verify case data is displayed
    await expect(page.locator('.previewValue').first()).toBeVisible();
  });

  test('should display vendor selection with filtered vendors', async ({ page }) => {
    // Check vendor selection section
    await expect(page.getByText('Select Vendor')).toBeVisible();
    await expect(page.getByText(/Recommended vendors for .* issues/)).toBeVisible();
    
    // Check vendor cards exist
    const vendorCards = page.locator('.vendorCard');
    await expect(vendorCards.first()).toBeVisible();
    
    // Verify vendor card contains required information
    const firstVendor = vendorCards.first();
    await expect(firstVendor.locator('.vendorName')).toBeVisible();
    await expect(firstVendor.locator('.stars')).toBeVisible();
    await expect(firstVendor.locator('.ratingText')).toBeVisible();
    await expect(firstVendor.locator('.contactText')).toBeVisible();
    await expect(firstVendor.locator('.specialtyTag')).toBeVisible();
    await expect(firstVendor.locator('.responseTimeText')).toBeVisible();
  });

  test('should allow vendor selection and show selection state', async ({ page }) => {
    const vendorCards = page.locator('.vendorCard');
    const vendorCount = await vendorCards.count();
    
    if (vendorCount > 0) {
      const firstVendor = vendorCards.first();
      
      // Initially should show radio button off
      await expect(firstVendor.locator('[name="radio-button-off"]')).toBeVisible();
      
      // Click to select vendor
      await firstVendor.click();
      
      // Should show checkmark when selected
      await expect(firstVendor.locator('[name="checkmark-circle"]')).toBeVisible();
      
      // Should have selected styling
      await expect(firstVendor).toHaveClass(/vendorCardSelected/);
      
      // Test selecting different vendor
      if (vendorCount > 1) {
        const secondVendor = vendorCards.nth(1);
        await secondVendor.click();
        
        // First vendor should be deselected
        await expect(firstVendor.locator('[name="radio-button-off"]')).toBeVisible();
        await expect(firstVendor).not.toHaveClass(/vendorCardSelected/);
        
        // Second vendor should be selected
        await expect(secondVendor.locator('[name="checkmark-circle"]')).toBeVisible();
        await expect(secondVendor).toHaveClass(/vendorCardSelected/);
      }
    }
  });

  test('should display preferred vendor badges correctly', async ({ page }) => {
    const vendorCards = page.locator('.vendorCard');
    const vendorCount = await vendorCards.count();
    
    for (let i = 0; i < vendorCount; i++) {
      const vendor = vendorCards.nth(i);
      const hasPreferredBadge = await vendor.locator('.preferredBadge').isVisible();
      
      if (hasPreferredBadge) {
        // Check preferred badge content
        await expect(vendor.locator('.preferredBadge')).toContainText('Preferred');
        await expect(vendor.locator('.preferredBadge [name="star"]')).toBeVisible();
        
        // Check preferred styling
        await expect(vendor).toHaveClass(/vendorCardPreferred/);
      }
    }
  });

  test('should display and toggle email options correctly', async ({ page }) => {
    // Check email options section
    await expect(page.getByText('Email Options')).toBeVisible();
    
    // Check Include Photos option
    const includePhotosRow = page.locator('.optionRow').filter({ hasText: 'Include Photos' });
    await expect(includePhotosRow.getByText('Include Photos')).toBeVisible();
    await expect(includePhotosRow.getByText(/Attach \d+ photos/)).toBeVisible();
    
    const photosSwitch = includePhotosRow.locator('input[type="checkbox"], [role="switch"]').first();
    const isPhotosEnabled = await photosSwitch.isChecked();
    
    // Toggle photos option
    await includePhotosRow.locator('[role="switch"]').click();
    await expect(photosSwitch).toBeChecked(!isPhotosEnabled);
    
    // Check Include Tenant Contact option
    const tenantContactRow = page.locator('.optionRow').filter({ hasText: 'Include Tenant Contact' });
    await expect(tenantContactRow.getByText('Include Tenant Contact')).toBeVisible();
    await expect(tenantContactRow.getByText('Allow vendor to contact tenant directly')).toBeVisible();
    
    // Check Mark as Urgent option
    const urgentRow = page.locator('.optionRow').filter({ hasText: 'Mark as Urgent' });
    await expect(urgentRow.getByText('Mark as Urgent')).toBeVisible();
    await expect(urgentRow.getByText('Request priority scheduling')).toBeVisible();
  });

  test('should allow custom message input', async ({ page }) => {
    // Check custom message section
    await expect(page.getByText('Additional Notes (Optional)')).toBeVisible();
    
    // Find message input
    const messageInput = page.locator('.messageInput');
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toHaveAttribute('placeholder', /Add any special instructions/);
    
    // Test typing in message input
    const testMessage = 'Please prioritize this repair - tenant has young children.';
    await messageInput.fill(testMessage);
    await expect(messageInput).toHaveValue(testMessage);
  });

  test('should generate and display email preview correctly', async ({ page }) => {
    // Select a vendor first
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
    }
    
    // Check email preview section
    await expect(page.getByText('Email Preview')).toBeVisible();
    
    const previewContainer = page.locator('.previewContainer');
    await expect(previewContainer).toBeVisible();
    
    const previewContent = page.locator('.previewContent');
    await expect(previewContent).toBeVisible();
    
    // Verify email content includes expected elements
    await expect(previewContent).toContainText('Subject: Maintenance Request');
    await expect(previewContent).toContainText('Property Details:');
    await expect(previewContent).toContainText('Issue Description:');
    await expect(previewContent).toContainText('AI Analysis:');
    await expect(previewContent).toContainText('Preferred Service Times:');
    
    // Test that email preview updates when custom message is added
    const messageInput = page.locator('.messageInput');
    const customMessage = 'Please call before arriving.';
    await messageInput.fill(customMessage);
    
    // Preview should update to include custom message
    await expect(previewContent).toContainText('Additional Notes:');
    await expect(previewContent).toContainText(customMessage);
  });

  test('should update email preview based on option toggles', async ({ page }) => {
    // Select a vendor first
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
    }
    
    const previewContent = page.locator('.previewContent');
    
    // Initially should include tenant contact (default on)
    await expect(previewContent).toContainText('Tenant Contact:');
    
    // Toggle tenant contact off
    const tenantContactSwitch = page.locator('.optionRow')
      .filter({ hasText: 'Include Tenant Contact' })
      .locator('[role="switch"]');
    await tenantContactSwitch.click();
    
    // Preview should update to show coordination message
    await expect(previewContent).toContainText('Please coordinate through property management');
    
    // Toggle photos off
    const photosSwitch = page.locator('.optionRow')
      .filter({ hasText: 'Include Photos' })
      .locator('[role="switch"]');
    await photosSwitch.click();
    
    // Attachments section should not appear
    await expect(previewContent).not.toContainText('Attachments:');
  });

  test('should handle footer buttons correctly', async ({ page }) => {
    // Check footer buttons exist
    await expect(page.locator('.cancelButton')).toBeVisible();
    await expect(page.locator('.sendButton')).toBeVisible();
    
    // Initially send button should be disabled (no vendor selected)
    await expect(page.locator('.sendButton')).toBeDisabled();
    
    // Test cancel button
    await page.locator('.cancelButton').click();
    await page.waitForLoadState('networkidle');
    
    // Should navigate back
    await expect(page.url()).not.toContain('/send-to-vendor');
    
    // Go back to test send functionality
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Select a vendor to enable send button
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
      await expect(page.locator('.sendButton')).toBeEnabled();
    }
  });

  test('should handle send to vendor workflow', async ({ page }) => {
    // Select a vendor
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
      
      // Mock successful send response
      page.route('**/api/send-to-vendor', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, messageId: 'msg_123' })
        });
      });
      
      // Click send button
      await page.locator('.sendButton').click();
      
      // Should show loading state
      await expect(page.getByText('Sending...')).toBeVisible();
      await expect(page.locator('.sendButton')).toHaveClass(/sendButtonDisabled/);
      
      // Wait for success dialog
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Email Sent Successfully!');
        expect(dialog.message()).toContain('Your maintenance request has been sent');
        await dialog.accept();
      });
      
      // Should navigate back after success
      await page.waitForLoadState('networkidle');
      await expect(page.url()).not.toContain('/send-to-vendor');
    }
  });

  test('should handle send error gracefully', async ({ page }) => {
    // Select a vendor
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
      
      // Mock error response
      page.route('**/api/send-to-vendor', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send email' })
        });
      });
      
      // Click send button
      await page.locator('.sendButton').click();
      
      // Wait for error dialog
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Send Error');
        expect(dialog.message()).toContain('Failed to send email');
        await dialog.accept();
      });
      
      // Should remain on page and reset button state
      await expect(page.url()).toContain('/send-to-vendor');
      await expect(page.locator('.sendButton')).toBeEnabled();
      await expect(page.getByText('Send to Vendor')).toBeVisible();
    }
  });

  test('should validate vendor selection requirement', async ({ page }) => {
    // Try to send without selecting vendor
    await page.locator('.sendButton').click();
    
    // Should show validation alert
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Select Vendor');
      expect(dialog.message()).toContain('Please select a vendor before sending');
      await dialog.accept();
    });
    
    // Should remain on page
    await expect(page.url()).toContain('/send-to-vendor');
  });

  test('should display vendor ratings and response times correctly', async ({ page }) => {
    const vendorCards = page.locator('.vendorCard');
    const vendorCount = await vendorCards.count();
    
    for (let i = 0; i < vendorCount; i++) {
      const vendor = vendorCards.nth(i);
      
      // Check star rating display
      const stars = vendor.locator('.stars [name="star"], .stars [name="star-outline"]');
      const starCount = await stars.count();
      expect(starCount).toBe(5); // Should have 5 stars total
      
      // Check rating text
      const ratingText = vendor.locator('.ratingText');
      await expect(ratingText).toBeVisible();
      const ratingValue = await ratingText.textContent();
      expect(parseFloat(ratingValue || '0')).toBeGreaterThan(0);
      
      // Check response time
      const responseTime = vendor.locator('.responseTimeText');
      await expect(responseTime).toBeVisible();
      await expect(responseTime).toContainText(/< \d+ hours?/);
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Verify mobile layout
    await expect(page.getByText('Send to Vendor')).toBeVisible();
    
    // Check that vendor cards stack properly
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      const firstCard = vendorCards.first();
      const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width);
      expect(cardWidth).toBeLessThan(400); // Should fit mobile screen
    }
    
    // Check footer buttons layout on mobile
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    
    // Check email preview scrolling on mobile
    const previewContainer = page.locator('.previewContainer');
    await expect(previewContainer).toBeVisible();
    const maxHeight = await previewContainer.evaluate(el => 
      parseInt(window.getComputedStyle(el).maxHeight)
    );
    expect(maxHeight).toBeGreaterThan(0);
  });

  test('should handle scrolling in email preview', async ({ page }) => {
    // Select vendor to generate email content
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
    }
    
    // Add custom message to make email longer
    const messageInput = page.locator('.messageInput');
    const longMessage = 'This is a very long custom message. '.repeat(20);
    await messageInput.fill(longMessage);
    
    // Check that preview container is scrollable
    const previewContainer = page.locator('.previewContainer');
    await expect(previewContainer).toBeVisible();
    
    // Test scrolling within preview
    await previewContainer.evaluate(el => {
      el.scrollTop = 50;
    });
    
    const scrollTop = await previewContainer.evaluate(el => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });
});