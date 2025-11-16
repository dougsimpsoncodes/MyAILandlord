import { test, expect } from '@playwright/test';

/**
 * Test suite for UI/UX consistency and responsive design
 * Tests design system consistency, accessibility, and responsive behavior across maintenance features
 */
test.describe('UI/UX Consistency & Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
  });

  test.describe('Design System Consistency', () => {
    test('should use consistent colors across maintenance screens', async ({ page }) => {
      // Test Dashboard
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check primary brand colors
      const headerElement = page.locator('.header');
      const headerBgColor = await headerElement.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(headerBgColor).toBe('rgb(255, 255, 255)'); // White background

      // Check status colors consistency
      const statusBadges = page.locator('.statusBadge');
      if (await statusBadges.count() > 0) {
        const newStatusColor = await statusBadges.first().evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        // Should use consistent blue for "new" status
        expect(newStatusColor).toMatch(/rgb\(52, 152, 219\)|rgb\(59, 130, 246\)/);
      }

      // Test Case Detail consistency
      await page.goto('/landlord/case-detail/test-case-1');
      await page.waitForLoadState('networkidle');

      const caseDetailHeader = page.locator('.header');
      const caseDetailBgColor = await caseDetailHeader.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(caseDetailBgColor).toBe(headerBgColor); // Should match dashboard

      // Test Send to Vendor consistency
      await page.goto('/landlord/send-to-vendor/test-case-1');
      await page.waitForLoadState('networkidle');

      const primaryButton = page.locator('.sendButton');
      const buttonColor = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      // Should use consistent orange/amber for primary actions
      expect(buttonColor).toMatch(/rgb\(243, 156, 18\)|rgb\(245, 158, 11\)/);
    });

    test('should use consistent typography scale', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check title font sizes
      const welcomeTitle = page.getByText('Welcome back!');
      const titleFontSize = await welcomeTitle.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      expect(parseFloat(titleFontSize)).toBeGreaterThan(20); // Large title

      // Check subtitle consistency
      const subtitle = page.getByText('Maintenance Dashboard');
      const subtitleFontSize = await subtitle.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      expect(parseFloat(subtitleFontSize)).toBeLessThan(parseFloat(titleFontSize));

      // Check case detail typography
      await page.goto('/landlord/case-detail/test-case-1');
      await page.waitForLoadState('networkidle');

      const tenantName = page.locator('.tenantName');
      if (await tenantName.isVisible()) {
        const tenantNameFontSize = await tenantName.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        expect(parseFloat(tenantNameFontSize)).toBeGreaterThan(16); // Consistent sizing
      }
    });

    test('should use consistent spacing and padding', async ({ page }) => {
      const screens = [
        '/landlord/dashboard',
        '/landlord/case-detail/test-case-1',
        '/landlord/send-to-vendor/test-case-1'
      ];

      for (const screen of screens) {
        await page.goto(screen);
        await page.waitForLoadState('networkidle');

        // Check container padding consistency
        const containers = page.locator('.container, .content');
        if (await containers.count() > 0) {
          const paddingLeft = await containers.first().evaluate(el => 
            window.getComputedStyle(el).paddingLeft
          );
          const paddingRight = await containers.first().evaluate(el => 
            window.getComputedStyle(el).paddingRight
          );
          
          // Should have consistent horizontal padding
          expect(paddingLeft).toBe(paddingRight);
          expect(parseFloat(paddingLeft)).toBeGreaterThan(0);
        }

        // Check card spacing consistency
        const cards = page.locator('.caseCard, .vendorCard, .statCard');
        if (await cards.count() > 1) {
          const firstCardBottom = await cards.first().evaluate(el => 
            el.getBoundingClientRect().bottom
          );
          const secondCardTop = await cards.nth(1).evaluate(el => 
            el.getBoundingClientRect().top
          );
          
          const gap = secondCardTop - firstCardBottom;
          expect(gap).toBeGreaterThan(8); // Consistent spacing between cards
          expect(gap).toBeLessThan(32); // Not too much spacing
        }
      }
    });

    test('should use consistent border radius and shadows', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check card border radius consistency
      const cards = page.locator('.caseCard, .statCard');
      if (await cards.count() > 0) {
        const borderRadius = await cards.first().evaluate(el => 
          window.getComputedStyle(el).borderRadius
        );
        
        // Should have consistent border radius
        expect(borderRadius).toMatch(/12px|16px|1rem/);

        // Check all cards have same border radius
        for (let i = 0; i < await cards.count(); i++) {
          const cardRadius = await cards.nth(i).evaluate(el => 
            window.getComputedStyle(el).borderRadius
          );
          expect(cardRadius).toBe(borderRadius);
        }
      }

      // Check button border radius
      const buttons = page.locator('button, .actionButton');
      if (await buttons.count() > 0) {
        const buttonRadius = await buttons.first().evaluate(el => 
          window.getComputedStyle(el).borderRadius
        );
        expect(buttonRadius).toMatch(/8px|12px|0.5rem|0.75rem/);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport (390x844)', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check header is responsive
      const header = page.locator('.header');
      const headerWidth = await header.evaluate(el => 
        el.getBoundingClientRect().width
      );
      expect(headerWidth).toBeLessThanOrEqual(390);

      // Check stats cards stack on mobile
      const statsContainer = page.locator('.statsContainer');
      if (await statsContainer.isVisible()) {
        const containerHeight = await statsContainer.evaluate(el => 
          el.getBoundingClientRect().height
        );
        // Should be taller on mobile (stacked layout)
        expect(containerHeight).toBeGreaterThan(100);
      }

      // Check case cards are full width on mobile
      const caseCards = page.locator('.caseCard');
      if (await caseCards.count() > 0) {
        const cardWidth = await caseCards.first().evaluate(el => 
          el.getBoundingClientRect().width
        );
        expect(cardWidth).toBeGreaterThan(300); // Should use most of screen width
        expect(cardWidth).toBeLessThan(390);
      }
    });

    test('should adapt to tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check layout utilizes tablet space
      const container = page.locator('.container');
      const containerWidth = await container.evaluate(el => 
        el.getBoundingClientRect().width
      );
      expect(containerWidth).toBeGreaterThan(500);
      expect(containerWidth).toBeLessThanOrEqual(768);

      // Check stats cards layout on tablet
      const statCards = page.locator('.statCard');
      if (await statCards.count() >= 3) {
        const firstCardRect = await statCards.first().evaluate(el => 
          el.getBoundingClientRect()
        );
        const thirdCardRect = await statCards.nth(2).evaluate(el => 
          el.getBoundingClientRect()
        );
        
        // Should fit 3 cards in a row on tablet
        expect(thirdCardRect.right).toBeLessThanOrEqual(768);
        expect(thirdCardRect.top).toBe(firstCardRect.top); // Same row
      }
    });

    test('should adapt to desktop viewport (1200x800)', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check desktop layout
      const container = page.locator('.container');
      const containerWidth = await container.evaluate(el => 
        el.getBoundingClientRect().width
      );
      
      // Should have max width on desktop (not full screen)
      expect(containerWidth).toBeLessThan(1200);
      expect(containerWidth).toBeGreaterThan(800);

      // Check responsive grid works on desktop
      const caseCards = page.locator('.caseCard');
      if (await caseCards.count() > 0) {
        const cardWidth = await caseCards.first().evaluate(el => 
          el.getBoundingClientRect().width
        );
        // Should not be full width on desktop
        expect(cardWidth).toBeLessThan(containerWidth * 0.8);
      }
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check touch targets are appropriately sized
      const buttons = page.locator('button, .actionButton');
      if (await buttons.count() > 0) {
        const buttonRect = await buttons.first().evaluate(el => 
          el.getBoundingClientRect()
        );
        
        // Touch targets should be at least 44px (iOS HIG recommendation)
        expect(buttonRect.height).toBeGreaterThanOrEqual(44);
        expect(buttonRect.width).toBeGreaterThanOrEqual(44);
      }

      // Test swipe/scroll interactions
      const scrollContainer = page.locator('.casesContainer');
      if (await scrollContainer.isVisible()) {
        // Should be scrollable
        const isScrollable = await scrollContainer.evaluate(el => 
          el.scrollHeight > el.clientHeight
        );
        // If there's content, it should be scrollable
        const hasContent = await page.locator('.caseCard').count() > 0;
        if (hasContent) {
          expect(isScrollable).toBeTruthy();
        }
      }
    });

    test('should optimize text for different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 390, height: 844, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1200, height: 800, name: 'desktop' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/landlord/dashboard');
        await page.waitForLoadState('networkidle');

        // Check title text is readable
        const title = page.getByText('Welcome back!');
        if (await title.isVisible()) {
          const fontSize = await title.evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          
          // Font should scale appropriately
          if (viewport.name === 'mobile') {
            expect(fontSize).toBeGreaterThanOrEqual(20);
            expect(fontSize).toBeLessThanOrEqual(28);
          } else if (viewport.name === 'desktop') {
            expect(fontSize).toBeGreaterThanOrEqual(24);
            expect(fontSize).toBeLessThanOrEqual(36);
          }
        }

        // Check body text is readable
        const descriptions = page.locator('.description');
        if (await descriptions.count() > 0) {
          const bodyFontSize = await descriptions.first().evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          
          // Body text should be readable
          expect(bodyFontSize).toBeGreaterThanOrEqual(14);
          expect(bodyFontSize).toBeLessThanOrEqual(18);
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper color contrast ratios', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Test text contrast
      const textElements = page.locator('h1, h2, h3, p, span').first();
      if (await textElements.isVisible()) {
        const textColor = await textElements.evaluate(el => 
          window.getComputedStyle(el).color
        );
        const backgroundColor = await textElements.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Should have sufficient contrast (simplified check)
        expect(textColor).not.toBe(backgroundColor);
        expect(textColor).not.toBe('rgb(255, 255, 255)'); // White text on white bg
      }

      // Test button contrast
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const buttonTextColor = await buttons.first().evaluate(el => 
          window.getComputedStyle(el).color
        );
        const buttonBgColor = await buttons.first().evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        expect(buttonTextColor).not.toBe(buttonBgColor);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.tagName
      );
      
      // Should focus on interactive elements
      expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement || '')).toBeTruthy();

      // Test keyboard interaction with buttons
      const buttons = page.locator('button:visible');
      if (await buttons.count() > 0) {
        await buttons.first().focus();
        
        // Should be able to activate with Enter or Space
        await page.keyboard.press('Enter');
        // Button should respond to keyboard interaction
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check buttons have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const hasText = await button.textContent().then(text => text?.trim().length > 0);
        const hasAriaLabel = await button.getAttribute('aria-label').then(label => !!label);
        
        // Should have either text content or aria-label
        expect(hasText || hasAriaLabel).toBeTruthy();
      }

      // Check status badges have proper roles
      const statusBadges = page.locator('.statusBadge');
      if (await statusBadges.count() > 0) {
        const badgeText = await statusBadges.first().textContent();
        expect(badgeText?.trim()).toBeTruthy();
      }
    });

    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Check heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        // Should start with h1
        const firstHeading = await headings.first().evaluate(el => el.tagName);
        expect(['H1', 'H2'].includes(firstHeading)).toBeTruthy();
      }

      // Check list structure for cases
      const lists = page.locator('ul, ol');
      if (await lists.count() > 0) {
        const listItems = lists.first().locator('li');
        const itemCount = await listItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }

      // Check form labels
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate(el => {
          const id = el.getAttribute('id');
          return id ? !!document.querySelector(`label[for="${id}"]`) : false;
        });
        const hasAriaLabel = await input.getAttribute('aria-label');
        
        // Should have associated label or aria-label
        expect(hasLabel || !!hasAriaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Performance & Loading States', () => {
    test('should show loading states with proper styling', async ({ page }) => {
      // Mock slow API to test loading states
      await page.route('**/api/maintenance-requests', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/landlord/dashboard');
      
      // Should show loading spinner
      const loadingElement = page.locator('[data-testid="loading"], .loadingContainer');
      await expect(loadingElement).toBeVisible();

      // Loading should have proper styling
      const spinner = page.locator('[data-testid="loading-spinner"]');
      if (await spinner.isVisible()) {
        const spinnerColor = await spinner.evaluate(el => 
          window.getComputedStyle(el).color
        );
        // Should use brand colors for loading
        expect(spinnerColor).toBeTruthy();
      }

      // Wait for loading to complete
      await page.waitForLoadState('networkidle');
    });

    test('should maintain consistent styling during state changes', async ({ page }) => {
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');

      // Record initial styling
      const container = page.locator('.container');
      const initialPadding = await container.evaluate(el => 
        window.getComputedStyle(el).padding
      );

      // Trigger state change (filter)
      const filterButton = page.getByRole('button', { name: /New/ });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        // Styling should remain consistent
        const newPadding = await container.evaluate(el => 
          window.getComputedStyle(el).padding
        );
        expect(newPadding).toBe(initialPadding);
      }
    });
  });

  test.describe('Cross-Screen Consistency', () => {
    test('should maintain design consistency across all maintenance screens', async ({ page }) => {
      const screens = [
        '/landlord/dashboard',
        '/landlord/case-detail/test-case-1',
        '/landlord/send-to-vendor/test-case-1'
      ];

      let previousHeaderStyle: string | null = null;
      let previousButtonStyle: string | null = null;

      for (const screen of screens) {
        await page.goto(screen);
        await page.waitForLoadState('networkidle');

        // Check header consistency
        const header = page.locator('.header, header').first();
        if (await header.isVisible()) {
          const headerStyle = await header.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          
          if (previousHeaderStyle) {
            expect(headerStyle).toBe(previousHeaderStyle);
          }
          previousHeaderStyle = headerStyle;
        }

        // Check primary button consistency
        const primaryButton = page.locator('.primaryButton, .sendButton').first();
        if (await primaryButton.isVisible()) {
          const buttonStyle = await primaryButton.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          
          if (previousButtonStyle) {
            expect(buttonStyle).toBe(previousButtonStyle);
          }
          previousButtonStyle = buttonStyle;
        }
      }
    });
  });
});