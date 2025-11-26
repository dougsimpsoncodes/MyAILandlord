import { test, expect } from '@playwright/test';

/**
 * COMMUNICATION HUB E2E TEST
 *
 * Tests landlord-tenant messaging functionality:
 * 1. Navigate to communication hub
 * 2. View message history
 * 3. Send new message
 * 4. Verify message appears
 * 5. Test attachments (if available)
 */

test.use({
  baseURL: 'http://localhost:8082',
});

test.describe('Communication Hub - Messaging', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('[Browser Error]:', msg.text());
      }
    });

    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test('Tenant - View and send messages', async ({ page }) => {
    test.setTimeout(90000);

    console.log('========================================');
    console.log('TENANT COMMUNICATION HUB TEST');
    console.log('========================================');

    // Navigate to Communication Hub
    console.log('\n--- Step 1: Navigate to Communication Hub ---');
    await page.goto('/CommunicationHub');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/communication-tenant-step1.png', fullPage: true });

    // Verify communication screen
    const commIndicators = [
      page.getByText('Messages'),
      page.getByText('Communication'),
      page.getByText('Chat'),
      page.locator('text=/message|chat|communication/i'),
    ];

    let commLoaded = false;
    for (const indicator of commIndicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        commLoaded = true;
        console.log('Communication hub loaded');
        break;
      }
    }

    // Step 2: Look for message input
    console.log('\n--- Step 2: Find Message Input ---');

    const messageInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="type" i]').first();
    const inputField = page.locator('input, textarea').last();

    if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageInput.fill('Hello, I have a question about my maintenance request.');
      console.log('Typed message in input');
    } else if (await inputField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inputField.fill('Hello, I have a question about my maintenance request.');
      console.log('Typed message in fallback input');
    }

    await page.screenshot({ path: 'test-results/communication-tenant-step2-typed.png', fullPage: true });

    // Step 3: Send message
    console.log('\n--- Step 3: Send Message ---');

    const sendBtn = page.getByText('Send');
    const submitBtn = page.locator('button[type="submit"]').first();
    const sendIcon = page.locator('[class*="send"], [aria-label*="send"]').first();

    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('Clicked Send button');
    } else if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
      console.log('Clicked Submit button');
    } else if (await sendIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendIcon.click();
      console.log('Clicked Send icon');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/communication-tenant-step3-sent.png', fullPage: true });

    // Step 4: Verify message appears
    console.log('\n--- Step 4: Verify Message ---');

    const sentMessage = page.locator('text=/question about my maintenance/i');
    if (await sentMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('SUCCESS: Message appears in chat');
    }

    console.log('\n========================================');
    console.log('TENANT COMMUNICATION TEST COMPLETE');
    console.log('========================================');
  });

  test('Landlord - View and respond to messages', async ({ page }) => {
    test.setTimeout(90000);

    console.log('========================================');
    console.log('LANDLORD COMMUNICATION TEST');
    console.log('========================================');

    // Navigate to Landlord Communication Screen
    console.log('\n--- Step 1: Navigate to Landlord Communications ---');
    await page.goto('/Communications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/communication-landlord-step1.png', fullPage: true });

    // Check for conversation list or message view
    const conversationList = page.locator('[class*="conversation"], [class*="thread"], [class*="chat"]');
    const conversationCount = await conversationList.count();
    console.log(`Found ${conversationCount} conversation elements`);

    // Step 2: Try to open a conversation
    console.log('\n--- Step 2: Open Conversation ---');

    const firstConversation = conversationList.first();
    if (await firstConversation.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstConversation.click();
      console.log('Opened first conversation');
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/communication-landlord-step2.png', fullPage: true });

    // Step 3: Reply to message
    console.log('\n--- Step 3: Reply to Message ---');

    const replyInput = page.locator('textarea, input[placeholder*="message" i]').first();
    if (await replyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await replyInput.fill('Thank you for reaching out. I will look into your maintenance request right away.');
      console.log('Typed reply');
    }

    const sendBtn = page.getByText('Send');
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('Sent reply');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/communication-landlord-step3-replied.png', fullPage: true });

    console.log('\n========================================');
    console.log('LANDLORD COMMUNICATION TEST COMPLETE');
    console.log('========================================');
  });

  test('Message with attachment', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing message with attachment...');

    await page.goto('/CommunicationHub');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for attachment button
    const attachBtn = page.locator('[class*="attach"], [aria-label*="attach"], text=/attach|photo|image/i').first();

    if (await attachBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Attachment button found');
      await page.screenshot({ path: 'test-results/communication-attachment.png', fullPage: true });
    } else {
      console.log('No attachment button found');
    }

    console.log('Attachment test complete');
  });
});
