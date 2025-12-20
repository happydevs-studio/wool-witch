import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onNavigate?: (page: 'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service') => void;
}

export function TermsOfService({ onNavigate }: TermsOfServiceProps = {}) {
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
      <h1 className="text-4xl font-serif font-bold text-gray-900 mb-8">Terms & Conditions</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> December 20, 2024
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Welcome to Woolwitch. These Terms and Conditions govern your use of our website and the purchase of our handmade crochet products. By using our website and making purchases, you agree to these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">About Our Products</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Woolwitch offers handmade crochet items including accessories, home decor, and gifts. All products are:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li><strong>Handmade:</strong> Each item is individually crafted with care</li>
            <li><strong>Unique:</strong> Slight variations in size, color, and appearance are natural characteristics of handmade items</li>
            <li><strong>Made to order:</strong> Some items may require additional production time</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            Product images are representative. Due to the handmade nature of our products and variations in screen displays, actual colors and dimensions may vary slightly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Your Account</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You can create an account using your email address or Google account. When you create an account, you agree to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Provide accurate and complete information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Notify us immediately of any unauthorized access to your account</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            You can also purchase as a guest without creating an account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Orders and Purchasing</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Placing Orders</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            When you place an order through our website, you are making an offer to purchase the products. We reserve the right to accept or decline your order for any reason, including product availability, errors in pricing, or suspected fraud.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Payment Methods</h3>
          <p className="text-gray-700 leading-relaxed mb-4">We accept the following payment methods:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Credit and debit cards (via Stripe)</li>
            <li>PayPal</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            Payment is processed immediately upon order completion. All transactions are secured through our payment processors.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Pricing</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            All prices are displayed in British Pounds (GBP) and include VAT where applicable. Delivery charges are calculated separately and shown at checkout. We reserve the right to change prices at any time, but changes will not affect orders already placed.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Order Confirmation</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            You will receive an email confirmation once your order is successfully placed. This confirmation does not constitute acceptance of your order—acceptance occurs when we dispatch your items.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Shipping and Delivery</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Delivery Charges</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Delivery charges vary by product and are displayed on each product page. The total delivery cost will be shown at checkout before you complete your purchase.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Delivery Times</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Estimated delivery times will be provided at checkout. Please note that delivery times are estimates and may be affected by factors beyond our control, including postal delays and customs processing.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Delivery Address</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Please ensure your delivery address is accurate. We are not responsible for orders delivered to incorrect addresses provided by the customer.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Failed Deliveries</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            If delivery fails due to incorrect address information or unavailability to receive the package, you may be responsible for redelivery charges.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Returns and Refunds</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Consumer Rights</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Under the Consumer Contracts Regulations, you have the right to cancel your order within 14 days of receiving your items, without giving any reason.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Return Conditions</h3>
          <p className="text-gray-700 leading-relaxed mb-4">To return an item, it must be:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>In its original condition, unused and unworn</li>
            <li>In its original packaging where possible</li>
            <li>Returned within 14 days of receipt</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Custom Orders</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Custom or personalized items cannot be returned unless they are faulty or not as described.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Return Shipping</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            You are responsible for the cost of returning items unless the item is faulty or we sent you the wrong item.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Refund Processing</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Once we receive and inspect your returned item, we will process your refund. Refunds will be issued to your original payment method within 14 days of receiving the return.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Faulty Items</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you receive a faulty item, please contact us immediately at Support@woolwitch.co.uk with photos. We will arrange a replacement or full refund, including return shipping costs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All content on this website, including product designs, images, text, and logos, is the property of Woolwitch or used with permission. You may not:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Copy or reproduce our product designs for commercial purposes</li>
            <li>Use our images or content without permission</li>
            <li>Claim our work as your own</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            You are welcome to share photos of items you have purchased on social media with credit to Woolwitch.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Prohibited Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Use our website for any illegal purpose or in violation of these terms</li>
            <li>Attempt to gain unauthorized access to our systems or other user accounts</li>
            <li>Interfere with the proper functioning of our website</li>
            <li>Submit false or misleading information</li>
            <li>Use automated systems to access or collect data from our website</li>
            <li>Engage in fraudulent activities or payment disputes without valid cause</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Product Care</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Care instructions are provided with each product. Following these instructions will help maintain the quality and longevity of your handmade item. We are not responsible for damage resulting from improper care.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            To the fullest extent permitted by law, Woolwitch shall not be liable for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
            <li>Any indirect, incidental, or consequential damages</li>
            <li>Loss of profits, revenue, or data</li>
            <li>Delays or failures due to circumstances beyond our reasonable control</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4">
            Nothing in these terms shall limit our liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our total liability for any claim arising from your use of our website or purchase of products shall not exceed the amount you paid for the relevant product(s).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Dispute Resolution</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have a complaint or dispute, please contact us first at Support@woolwitch.co.uk. We will make every effort to resolve the issue directly with you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Governing Law</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Changes to These Terms</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We reserve the right to update these Terms and Conditions at any time. Changes will be posted on this page with an updated "Last updated" date. Your continued use of our website after changes are posted constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Severability</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If any provision of these terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have questions about these Terms and Conditions, please contact us:
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