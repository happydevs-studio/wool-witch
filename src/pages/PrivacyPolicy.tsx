import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onNavigate?: (page: 'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service') => void;
}

export function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps = {}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {onNavigate && (
        <button
          onClick={() => onNavigate('shop')}
          className="flex items-center space-x-2 text-rose-600 hover:text-rose-700 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shop</span>
        </button>
      )}
      <h1 className="text-4xl font-serif font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> December 20, 2024
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Woolwitch ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our e-commerce platform for handmade crochet goods.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Account Information</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Email address and password:</strong> For creating and securing your account</li>
            <li><strong>Google account information:</strong> When you sign in with Google (name, email, profile picture)</li>
            <li><strong>User role:</strong> Whether you have customer or admin access</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Order Information</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Contact details:</strong> Email address and full name</li>
            <li><strong>Delivery address:</strong> Street address, city, and postcode</li>
            <li><strong>Order details:</strong> Products ordered, quantities, prices, and delivery charges</li>
            <li><strong>Payment information:</strong> Payment method type (card/PayPal) and transaction IDs - we do not store credit card numbers</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Shopping Cart</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Your shopping cart is stored locally in your browser's local storage to preserve your selections between visits.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Process and fulfill your orders</li>
            <li>Communicate with you about your orders and account</li>
            <li>Authenticate your login sessions and maintain account security</li>
            <li>Ship products to your delivery address</li>
            <li>Process payments securely through Stripe and PayPal</li>
            <li>Maintain order history for your reference</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Data Storage and Security</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Your data is stored securely using Supabase, which provides enterprise-grade security and data protection. All sensitive data is encrypted and access is protected by row-level security policies.
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Passwords are encrypted and never stored in plain text</li>
            <li>Payment card details are processed by Stripe and PayPal - we never store card numbers</li>
            <li>All data transmissions are encrypted using HTTPS/SSL</li>
            <li>Access to customer data is restricted to authorized personnel only</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use the following trusted third-party services to operate our store:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Supabase:</strong> Database hosting and authentication services</li>
            <li><strong>Stripe:</strong> Payment processing for credit and debit card transactions</li>
            <li><strong>PayPal:</strong> Alternative payment processing</li>
            <li><strong>Google OAuth:</strong> Optional sign-in method (when using "Sign in with Google")</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            These services have their own privacy policies and handle your data according to industry security standards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Information Sharing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We do not sell, trade, or rent your personal information to third parties. We only share information:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>With payment processors (Stripe/PayPal) to complete transactions</li>
            <li>When required by law or legal process</li>
            <li>To protect our rights, property, or safety</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Cookies and Local Storage</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our website uses:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Essential cookies:</strong> For authentication and session management</li>
            <li><strong>Local storage:</strong> To save your shopping cart between visits</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            We do not use tracking cookies or analytics tools. Your browsing behavior is not tracked.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Marketing Communications</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We do not send marketing emails or promotional communications. You will only receive:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Order confirmation emails</li>
            <li>Shipping notifications</li>
            <li>Direct responses to inquiries you send us</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Guest Checkout</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You can place orders without creating an account. Guest orders still require your email address and delivery information for order fulfillment, but no account is created unless you choose to register.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Your Rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
            <li><strong>Correction:</strong> Request correction of inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and personal data (subject to legal retention requirements for order records)</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
            <li><strong>Object:</strong> Object to processing of your personal data</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            To exercise these rights, please contact us using the information below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Data Retention</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We retain your information for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Maintain your account (until you request deletion)</li>
            <li>Fulfill orders and handle returns/exchanges</li>
            <li>Comply with legal obligations (e.g., tax and accounting records)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our services are not directed to children under 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date at the top of this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            For privacy-related questions or to exercise your data rights, please contact us:
          </p>
          <div className="bg-rose-50 p-6 rounded-lg border border-rose-100">
            <p className="text-gray-900 font-medium mb-2">Woolwitch</p>
            <p className="text-gray-700">
              Email: <a href="mailto:Support@woolwitch.co.uk" className="text-rose-600 hover:text-rose-700 font-medium">Support@woolwitch.co.uk</a>
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('contact')}
                className="mt-3 text-rose-600 hover:text-rose-700 font-medium underline"
              >
                Visit our Contact page
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}