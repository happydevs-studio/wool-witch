# Wool Witch Tests

This directory contains automated tests for the Wool Witch application.

## Test Suites

### Smoke Test

The smoke test (`smoke.spec.ts`) is a simple test suite that verifies the basic functionality of the Wool Witch website. It checks that:

- The homepage loads correctly
- Key navigation elements are present
- Basic page navigation works
- The site is responsive
- No critical JavaScript errors occur

### Image Compression Tests

The image compression test suite (`imageCompression.spec.ts`) thoroughly tests the image compression utility used for product uploads. It verifies:

- Images under 50KB are returned unchanged
- Images over 50KB are properly compressed to under 50KB
- Quality reduction algorithm works correctly
- Dimension scaling is applied when quality reduction alone isn't sufficient
- Very large images are handled without infinite recursion or hanging
- The `formatFileSize` utility formats byte sizes correctly
- Invalid image files are handled gracefully with proper error messages
- Original filenames are preserved after compression

These tests use a test harness page (`public/test-compression.html`) that loads the compression module via Vite, making it available for testing in the browser context.

## Running Tests

### Specific Test Suites

```bash
# Run smoke tests only
npm run test:smoke

# Run image compression tests only
npm run test:e2e -- tests/imageCompression.spec.ts

# Run a specific test suite on a single browser
npm run test:e2e -- tests/imageCompression.spec.ts --project=chromium
```

### Against Local Development Server

```bash
# Run smoke test against localhost:5173
npm run test:smoke

# Or using Task
task test:smoke
```

### Against Production Site

```bash
# Run smoke test against woolwitch.github.io
npm run test:smoke:prod

# Or using Task  
task test:smoke:prod
```

### All E2E Tests

```bash
# Run all Playwright tests
npm run test:e2e

# Run in headless mode (faster)
npm run test:e2e:headless

# Run with interactive UI
npm run test:e2e:ui
```

### Using Task Runner

```bash
# Run all available test tasks
task test:e2e          # All e2e tests
task test:e2e:headless # Headless mode
task test:e2e:ui       # Interactive UI
task test:smoke        # Smoke test (localhost)
task test:smoke:prod   # Smoke test (production)
```

## Configuration

The tests use Playwright and are configured in `playwright.config.ts`. Key features:

- **Automatic dev server**: When running against localhost, the dev server starts automatically
- **Multi-browser**: Tests run in Chrome, Firefox, and Safari by default
- **Environment-aware**: Use `BASE_URL` environment variable to test different URLs
- **Mobile testing**: Includes responsive/mobile viewport tests

## Custom Base URL

You can test against any URL by setting the `BASE_URL` environment variable:

```bash
BASE_URL=https://your-custom-domain.com npm run test:smoke
```

## Requirements

- Node.js 18+
- Playwright browsers will be installed automatically when first running tests

## Troubleshooting

If tests fail:

1. **Local tests**: Ensure the dev server is running (`npm run dev`)
2. **Production tests**: Check that https://woolwitch.github.io is accessible
3. **Browser issues**: Run `npx playwright install` to update browsers
4. **Detailed output**: Use `npm run test:e2e:ui` for interactive debugging