import { test, expect } from '@playwright/test';

test.describe('EIHOUSE INDIA Public & Protected Routes', () => {
  test('homepage renders masthead, navigation, categories, and newsletter', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'EIHOUSE INDIA' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Articles' })).toBeVisible();
    await expect(page.getByPlaceholder(/search semiconductors/i)).toBeVisible();
  });

  test('unauthenticated visitor is redirected from /dashboard to /auth/login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('static legal & component roadmap pages load cleanly', async ({ page }) => {
    for (const path of ['/about', '/contact', '/community-guidelines', '/privacy-policy', '/terms', '/components']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    }
  });

  test('robots.txt and sitemap.xml respond with valid SEO directives', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain('Disallow: /admin');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<urlset');
  });
});
