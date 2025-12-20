import { MessageSquare } from 'lucide-react';

export function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100 to-pink-100 opacity-50"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <MessageSquare className="w-8 h-8 text-rose-500 mr-3" />
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900">
              Get in Touch
            </h1>
            <MessageSquare className="w-8 h-8 text-rose-500 ml-3" />
          </div>
          <p className="text-xl text-gray-700 leading-relaxed mb-4">
            For all other questions and information please complete the form below or contact us at:
          </p>
          <a 
            href="mailto:Support@woolwitch.co.uk" 
            className="inline-block text-3xl font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            Support@woolwitch.co.uk
          </a>
        </div>
      </section>
    </div>
  );
}