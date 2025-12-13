# Task 01: Readability Improvements

## Overview

This task implements readability improvements for the Woolwitch application, focusing on code organization, type consolidation, constants extraction, and consistent patterns.

**Estimated Time:** 1-2 days  
**Risk Level:** Low  
**Dependencies:** None

---

## Pre-Task Checklist

- [ ] Ensure the app builds: `npm run build`
- [ ] Ensure lint passes: `npm run lint`
- [ ] Ensure typecheck passes: `npm run typecheck`
- [ ] Commit current state: `git add -A && git commit -m "chore: checkpoint before readability improvements"`

---

## Task 1.1: Create Centralized PageType Definition

### Problem

The page type union is repeated in multiple files (`App.tsx`, `Header.tsx`, `Footer.tsx`, etc.):

```typescript
'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service' | 'orders'
```

### Implementation

1. **Create the navigation types file:**

```typescript
// src/types/navigation.ts
export type PageType =
  | 'shop'
  | 'cart'
  | 'checkout'
  | 'admin'
  | 'about'
  | 'contact'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'orders';

export type CartPageType = 'shop' | 'cart' | 'checkout';
```

2. **Update `src/App.tsx`:**

```typescript
import { PageType, CartPageType } from './types/navigation';

// Replace inline type with:
const [currentPage, setCurrentPage] = useState<PageType>('shop');

// Update handler types:
const handleCartNavigation = (page: CartPageType) => {
  setCurrentPage(page);
};
```

3. **Update `src/components/Header.tsx`:**

```typescript
import { PageType } from '../types/navigation';

interface HeaderProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}
```

4. **Update `src/components/Footer.tsx`:**

```typescript
import { PageType } from '../types/navigation';

// Update any props that use the page type
```

5. **Update `src/pages/Cart.tsx`:**

```typescript
import { CartPageType } from '../types/navigation';

interface CartProps {
  onNavigate: (page: CartPageType) => void;
}
```

6. **Update `src/pages/Checkout.tsx`:**

```typescript
import { CartPageType } from '../types/navigation';

interface CheckoutProps {
  onNavigate: (page: CartPageType) => void;
}
```

7. **Update `src/pages/PrivacyPolicy.tsx` and `src/pages/TermsOfService.tsx`:**

```typescript
import { PageType } from '../types/navigation';

interface Props {
  onNavigate: (page: PageType) => void;
}
```

### Verification

```bash
npm run typecheck
npm run lint
```

---

## Task 1.2: Create Constants File

### Problem

Magic numbers and strings are scattered throughout the codebase.

### Implementation

1. **Create the constants file:**

```typescript
// src/constants/index.ts

/**
 * Cache configuration constants
 */
export const CACHE = {
  /** Default cache TTL: 30 minutes */
  DEFAULT_TTL: 30 * 60 * 1000,
  /** Product list cache TTL: 15 minutes */
  LIST_TTL: 15 * 60 * 1000,
  /** Category cache TTL: 1 hour */
  CATEGORY_TTL: 60 * 60 * 1000,
} as const;

/**
 * Local storage configuration
 */
export const STORAGE = {
  /** Key for cart data in localStorage */
  CART_KEY: 'woolwitch-cart',
  /** Prefix for cache entries */
  CACHE_PREFIX: 'woolwitch_cache_',
  /** Maximum image upload size: 5MB */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  /** Allowed image MIME types for upload */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 6,
  /** UK postcode regex pattern */
  UK_POSTCODE_REGEX: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
} as const;

/**
 * Delivery configuration
 */
export const DELIVERY = {
  /** Free delivery threshold in pounds */
  FREE_DELIVERY_THRESHOLD: 50,
  /** Standard delivery charge in pounds */
  STANDARD_CHARGE: 3.99,
} as const;

/**
 * UI configuration
 */
export const UI = {
  /** Number of products per page */
  PRODUCTS_PER_PAGE: 12,
  /** Debounce delay for search in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,
} as const;
```

2. **Update `src/contexts/CartContext.tsx`:**

Find and replace the cart storage key:

```typescript
import { STORAGE } from '../constants';

// Replace 'woolwitch-cart' with:
localStorage.getItem(STORAGE.CART_KEY)
localStorage.setItem(STORAGE.CART_KEY, ...)
```

3. **Update `src/lib/cacheUtils.ts`:**

```typescript
import { CACHE, STORAGE } from '../constants';

// Replace magic numbers with constants:
// 30 * 60 * 1000 -> CACHE.DEFAULT_TTL
// 'woolwitch_cache_' -> STORAGE.CACHE_PREFIX
```

4. **Update `src/lib/dataService.ts`:**

```typescript
import { CACHE } from '../constants';

// Replace TTL values with constants
```

5. **Update `src/pages/Admin.tsx`:**

```typescript
import { STORAGE, VALIDATION } from '../constants';

// Replace file size check:
// 5 * 1024 * 1024 -> STORAGE.MAX_IMAGE_SIZE

// Replace allowed types:
// ['image/jpeg', ...] -> VALIDATION.ALLOWED_IMAGE_TYPES
```

### Verification

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Task 1.3: Create Error Handling Utility

### Problem

Inconsistent error handling patterns across the codebase.

### Implementation

1. **Create the error handling utility:**

```typescript
// src/lib/errorHandling.ts

/**
 * Custom application error with error code and recoverability flag
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error codes for different failure scenarios
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Auth errors
  AUTH_FAILED: 'AUTH_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Data errors
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  
  // Generic
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Centralized error handler that logs errors consistently
 * @param error - The error to handle
 * @param context - A string describing where the error occurred
 */
export function handleError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const code = error instanceof AppError ? error.code : ErrorCodes.UNKNOWN;
  
  // Log in a consistent format
  console.error(`[${context}] ${code}: ${message}`);
  
  // Could integrate with error tracking service (Sentry, etc.)
  // if (import.meta.env.PROD) {
  //   trackError(error, context);
  // }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
```

2. **Update error handling in key files:**

**`src/contexts/AuthContext.tsx`** - Replace empty catch blocks:

```typescript
import { handleError, getErrorMessage } from '../lib/errorHandling';

// Replace:
// catch { }
// With:
// catch (error) { handleError(error, 'AuthContext.signOut'); }
```

**`src/components/Header.tsx`** - Update signOut handler:

```typescript
import { handleError } from '../lib/errorHandling';

const handleSignOut = async () => {
  try {
    await signOut();
    onNavigate('shop');
    setMobileMenuOpen(false);
  } catch (error) {
    handleError(error, 'Header.handleSignOut');
  }
};
```

### Verification

```bash
npm run typecheck
npm run lint
```

---

## Task 1.4: Add JSDoc Comments to Key Functions

### Problem

Many utility functions lack documentation.

### Implementation

Add JSDoc comments to public functions in these files:

1. **`src/lib/orderService.ts`:**

```typescript
/**
 * Creates a new order in the database
 * @param orderData - The order details including items and payment info
 * @returns The created order with ID
 * @throws {AppError} If order creation fails
 */
export async function createOrder(orderData: CreateOrderData): Promise<Order> {
  // ...
}

/**
 * Retrieves orders for the current authenticated user
 * @param limit - Maximum number of orders to retrieve (default: 50)
 * @returns Array of user orders sorted by creation date
 */
export async function getUserOrders(limit?: number): Promise<Order[]> {
  // ...
}
```

2. **`src/lib/dataService.ts`:**

```typescript
/**
 * DataService provides a caching layer for product data
 * with stale-while-revalidate strategy and request deduplication
 */
class DataService {
  /**
   * Fetches a list of products with optional filtering
   * @param options - Filter options for category, search, and pagination
   * @returns Array of products matching the criteria
   */
  async getProductList(options?: ProductListOptions): Promise<Product[]> {
    // ...
  }

  /**
   * Fetches a single product by ID
   * @param id - The product UUID
   * @returns The product or null if not found
   */
  async getProduct(id: string): Promise<Product | null> {
    // ...
  }

  /**
   * Fetches all available product categories
   * @returns Array of unique category names
   */
  async getCategories(): Promise<string[]> {
    // ...
  }
}
```

3. **`src/lib/cacheUtils.ts`:**

```typescript
/**
 * Sets a value in the persistent cache with expiration
 * @param key - Cache key (will be prefixed with cache prefix)
 * @param data - Data to cache (will be JSON serialized)
 * @param ttl - Time to live in milliseconds
 */
export function setCacheItem<T>(key: string, data: T, ttl: number): void {
  // ...
}

/**
 * Retrieves a value from the persistent cache
 * @param key - Cache key
 * @returns The cached data or null if expired/not found
 */
export function getCacheItem<T>(key: string): T | null {
  // ...
}

/**
 * Clears all cache entries with the app prefix
 */
export function clearCache(): void {
  // ...
}
```

### Verification

```bash
npm run typecheck
npm run lint
```

---

## Task 1.5: Create Type Exports Index

### Problem

Types are scattered and not easy to import from a central location.

### Implementation

1. **Create or update `src/types/index.ts`:**

```typescript
// Re-export all types from a central location
export * from './navigation';
export * from './database';
export * from './cart';

// Add any shared utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
```

### Verification

```bash
npm run typecheck
npm run lint
```

---

## Post-Task Checklist

- [ ] Run full build: `npm run build`
- [ ] Run lint: `npm run lint`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Test the application manually:
  - [ ] Navigate between pages
  - [ ] Add items to cart
  - [ ] Check admin page (if applicable)
- [ ] Commit changes: `git add -A && git commit -m "refactor: implement readability improvements (Task 01)"`

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types/navigation.ts` | Created | Centralized PageType definition |
| `src/constants/index.ts` | Created | Magic numbers and strings constants |
| `src/lib/errorHandling.ts` | Created | Centralized error handling utility |
| `src/types/index.ts` | Created/Updated | Central type exports |
| `src/App.tsx` | Modified | Use PageType from navigation.ts |
| `src/components/Header.tsx` | Modified | Use PageType, add error handling |
| `src/components/Footer.tsx` | Modified | Use PageType |
| `src/pages/Cart.tsx` | Modified | Use CartPageType |
| `src/pages/Checkout.tsx` | Modified | Use CartPageType |
| `src/pages/PrivacyPolicy.tsx` | Modified | Use PageType |
| `src/pages/TermsOfService.tsx` | Modified | Use PageType |
| `src/contexts/CartContext.tsx` | Modified | Use STORAGE constants |
| `src/contexts/AuthContext.tsx` | Modified | Use error handling utility |
| `src/lib/cacheUtils.ts` | Modified | Use CACHE/STORAGE constants, add JSDoc |
| `src/lib/dataService.ts` | Modified | Use CACHE constants, add JSDoc |
| `src/lib/orderService.ts` | Modified | Add JSDoc comments |
| `src/pages/Admin.tsx` | Modified | Use VALIDATION/STORAGE constants |

---

## Rollback Plan

If issues are encountered:

```bash
git checkout HEAD~1 -- .
npm install
npm run build
```

---

## Success Criteria

1. ✅ No duplicate PageType definitions in the codebase
2. ✅ All magic numbers/strings replaced with named constants
3. ✅ Consistent error handling pattern across files
4. ✅ Key utility functions have JSDoc documentation
5. ✅ `npm run build` succeeds
6. ✅ `npm run lint` passes with no errors
7. ✅ `npm run typecheck` passes with no errors
8. ✅ Application functions correctly in browser
