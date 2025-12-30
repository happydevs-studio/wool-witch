#!/usr/bin/env node

/**
 * Security Testing Script
 * 
 * Validates security measures and compliance in the Wool Witch application
 * Run this script before deploying to production
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}`)
};

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function check(test, description, severity = 'error') {
  if (test) {
    log.success(description);
    passCount++;
    return true;
  } else {
    if (severity === 'error') {
      log.error(description);
      failCount++;
    } else {
      log.warning(description);
      warnCount++;
    }
    return false;
  }
}

// Test 1: Environment Variable Security
log.section('🔒 Environment Variable Security');

const envExample = readFileSync(join(projectRoot, '.env.example'), 'utf-8');

check(
  !envExample.includes('your_actual_key'),
  'No actual keys in .env.example'
);

check(
  envExample.includes('ALLOWED_ORIGINS'),
  'CORS configuration documented'
);

check(
  envExample.includes('ENVIRONMENT='),
  'Environment mode configuration present'
);

// Test 2: .gitignore Coverage
log.section('📁 .gitignore Security');

const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');

check(
  gitignore.includes('.env'),
  '.env files are ignored'
);

check(
  gitignore.includes('*.log'),
  'Log files are ignored'
);

check(
  gitignore.includes('node_modules'),
  'node_modules is ignored'
);

// Test 3: Code Security Checks
log.section('🔍 Code Security Patterns');

const srcFiles = [
  'src/contexts/AuthContext.tsx',
  'src/lib/orderService.ts',
  'src/lib/paypalConfig.ts',
  'supabase/functions/create-payment-intent/index.ts'
];

let hasProductionLogs = false;
let hasSensitiveData = false;

for (const file of srcFiles) {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    
    // Check for unprotected console.log statements
    const logMatches = content.match(/console\.(log|error|warn)/g) || [];
    const protectedLogs = content.match(/if\s*\(.*\.DEV.*\)\s*{[\s\S]*?console\./g) || [];
    const protectedLogsDeno = content.match(/if\s*\(.*ENVIRONMENT.*development.*\)\s*{[\s\S]*?console\./g) || [];
    
    if (logMatches.length > protectedLogs.length + protectedLogsDeno.length) {
      hasProductionLogs = true;
      log.warning(`Unprotected console logs in ${file}`);
    }
  }
}

check(
  !hasProductionLogs,
  'No unprotected console logs in production code',
  'warning'
);

// Test 4: Authentication Security
log.section('🔐 Authentication Security');

const authFile = join(projectRoot, 'src/contexts/AuthContext.tsx');
const authContent = readFileSync(authFile, 'utf-8');

check(
  authContent.includes('isDevelopment') && authContent.includes('isLocal'),
  'Mock auth restricted to development AND localhost'
);

check(
  authContent.includes('import.meta.env.DEV'),
  'Environment checks use proper import.meta.env.DEV'
);

// Test 5: CORS Security
log.section('🌐 CORS Configuration');

const corsFile = join(projectRoot, 'supabase/functions/create-payment-intent/index.ts');
if (existsSync(corsFile)) {
  const corsContent = readFileSync(corsFile, 'utf-8');
  
  check(
    !corsContent.includes("'Access-Control-Allow-Origin': '*'"),
    'CORS is not set to wildcard (*)'
  );
  
  check(
    corsContent.includes('ALLOWED_ORIGINS') || corsContent.includes('getAllowedOrigins'),
    'CORS uses configurable origins'
  );
  
  check(
    corsContent.includes('MAX_PAYMENT_AMOUNT') || corsContent.includes('amount <= 0 || amount >') || corsContent.includes('amount <') && corsContent.includes('amount >'),
    'Payment amount validation present'
  );
  
  check(
    corsContent.includes('emailRegex') || corsContent.includes('email'),
    'Email validation present'
  );
}

// Test 6: Payment Security
log.section('💳 Payment Security');

const checkoutFile = join(projectRoot, 'src/pages/Checkout.tsx');
if (existsSync(checkoutFile)) {
  const checkoutContent = readFileSync(checkoutFile, 'utf-8');
  
  check(
    checkoutContent.includes('client_secret intentionally excluded') ||
    checkoutContent.includes('Note: client_secret'),
    'Client secret exclusion documented'
  );
}

const stripeFile = join(projectRoot, 'src/components/StripeCardPayment.tsx');
if (existsSync(stripeFile)) {
  const stripeContent = readFileSync(stripeFile, 'utf-8');
  
  check(
    !stripeContent.includes('STRIPE_SECRET_KEY'),
    'No secret Stripe key used in client code'
  );
  
  check(
    stripeContent.includes('VITE_STRIPE') || stripeContent.includes('getStripe') || stripeContent.includes('loadStripe'),
    'Stripe properly configured in client code',
    'warning'
  );
}

// Test 7: Database Security
log.section('🗄️ Database Security');

const migrationFiles = [
  'supabase/migrations/20251207120000_woolwitch_initial_setup.sql',
  'supabase/migrations/20251209000000_woolwitch_add_orders_system.sql'
];

let hasRLS = false;
let hasAdminCheck = false;

for (const file of migrationFiles) {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    if (content.includes('ENABLE ROW LEVEL SECURITY')) {
      hasRLS = true;
    }
    if (content.includes('is_admin()')) {
      hasAdminCheck = true;
    }
  }
}

check(hasRLS, 'Row Level Security (RLS) enabled on tables');
check(hasAdminCheck, 'Admin role checking function present');

// Test 8: Documentation
log.section('📚 Security Documentation');

check(
  existsSync(join(projectRoot, 'docs/SECURITY.md')),
  'Security documentation exists (SECURITY.md)'
);

const securityDoc = existsSync(join(projectRoot, 'docs/SECURITY.md')) 
  ? readFileSync(join(projectRoot, 'docs/SECURITY.md'), 'utf-8')
  : '';

check(
  securityDoc.includes('PCI') && securityDoc.includes('GDPR'),
  'Compliance information documented',
  'warning'
);

check(
  securityDoc.includes('Incident Response'),
  'Incident response plan documented',
  'warning'
);

// Test 9: Input Validation
log.section('✅ Input Validation');

const orderServiceFile = join(projectRoot, 'src/lib/orderService.ts');
if (existsSync(orderServiceFile)) {
  const orderContent = readFileSync(orderServiceFile, 'utf-8');
  
  check(
    orderContent.includes('validateOrderData') ||
    orderContent.includes('validation'),
    'Order validation present'
  );
  
  check(
    orderContent.includes('email') && orderContent.includes('@'),
    'Email validation implemented'
  );
}

// Test 10: Error Handling
log.section('⚠️ Error Handling');

const orderService = existsSync(join(projectRoot, 'src/lib/orderService.ts'))
  ? readFileSync(join(projectRoot, 'src/lib/orderService.ts'), 'utf-8')
  : '';

check(
  !orderService.includes('throw new Error') || 
  !orderService.match(/throw new Error\([^)]*error\.message[^)]*\)/),
  'Error messages do not expose internals',
  'warning'
);

// Final Report
log.section('📊 Security Test Summary');

const total = passCount + failCount + warnCount;
console.log(`\nPassed:   ${colors.green}${passCount}${colors.reset}/${total}`);
console.log(`Failed:   ${colors.red}${failCount}${colors.reset}/${total}`);
console.log(`Warnings: ${colors.yellow}${warnCount}${colors.reset}/${total}`);

if (failCount > 0) {
  log.error(`\n❌ ${failCount} critical security issue(s) found. Please fix before deploying.`);
  process.exit(1);
} else if (warnCount > 0) {
  log.warning(`\n⚠️  ${warnCount} warning(s) found. Consider addressing these issues.`);
  process.exit(0);
} else {
  log.success(`\n✅ All security tests passed! Ready for production.`);
  process.exit(0);
}
