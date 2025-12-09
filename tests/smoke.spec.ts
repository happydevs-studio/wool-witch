import { test, expect } from '@playwright/test';

/**
 * Simple smoke test to verify the Wool Witch site is working
 * Can be run against localhost or production (woolwitch.github.io)
 */

test.describe('Wool Witch - Smoke Test', () => {
  test('homepage loads and displays key elements', async ({ page }) => {
    // Go to the homepage
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/Woolwitch|Wool Witch/i);
    
    // Check that the header is present
    await expect(page.locator('header')).toBeVisible();
    
    // Check for navigation elements (use more specific selectors)
    await expect(page.locator('header').getByText('Shop')).toBeVisible();
    await expect(page.locator('header').getByText('About')).toBeVisible();
    await expect(page.locator('header').getByText('Contact')).toBeVisible();
    
    // Check for cart icon/button (ShoppingBag icon with item count)
    await expect(page.locator('button', { has: page.locator('svg') }).first()).toBeVisible();
    
    // Verify page doesn't have critical errors
    await expect(page.locator('text=Error')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=Not Found')).not.toBeVisible();
  });

  test('can navigate to shop page', async ({ page }) => {
    await page.goto('/');
    
    // Click on Shop link
    await page.getByText('Shop').click();
    
    // Wait for shop content to load
    // Check that shop content is displayed (SPA doesn't change URL)
    await page.waitForTimeout(1000); // Give time for state change
    
    // The page should not show error states
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('can navigate to about page', async ({ page }) => {
    await page.goto('/');
    
    // Click on About link (use header selector to avoid footer link)
    await page.locator('header').getByText('About').click();
    
    // Wait for about content to load
    await page.waitForTimeout(1000);
    
    // Should show some content (even basic text)
    await expect(page.locator('body')).toContainText(/about|wool|witch|crochet|handmade/i);
  });

  test('site is responsive and works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Page should still load properly
    await expect(page.locator('header')).toBeVisible();
    
    // Site should have basic functionality (cart button should be visible)
    await expect(page.locator('button', { has: page.locator('svg') }).first()).toBeVisible();
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate to homepage
    await page.goto('/');
    
    // Wait a moment for any async errors
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors (like network issues in test env)
    const criticalErrors = errors.filter(error => 
      !error.includes('net::ERR_') && // Network errors
      !error.includes('favicon.ico') && // Missing favicon
      !error.includes('localhost:54321') && // Supabase connection issues in test
      !error.toLowerCase().includes('supabase')
    );
    
    expect(criticalErrors).toEqual([]);
  });
});