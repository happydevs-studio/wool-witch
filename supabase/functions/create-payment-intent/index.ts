import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Payment amount limits
const MAX_PAYMENT_AMOUNT = 100000000; // £1,000,000 in pence
const MIN_PAYMENT_AMOUNT = 1; // £0.01 in pence

// CORS headers - restrict to specific origins in production
const getAllowedOrigins = (): string[] => {
  // Get allowed origins from environment variable
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Default allowed origins for development
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];
};

const getCorsHeaders = (origin: string | null): Record<string, string> | null => {
  const allowedOrigins = getAllowedOrigins();
  
  // Only allow requests from whitelisted origins
  if (!origin || !allowedOrigins.includes(origin)) {
    return null;
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Reject requests from non-whitelisted origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'gbp', customer_email, metadata } = await req.json();

    // Validate required fields
    if (!amount || !customer_email) {
      throw new Error('Amount and customer email are required');
    }

    // Validate amount is positive and reasonable
    if (amount < MIN_PAYMENT_AMOUNT || amount > MAX_PAYMENT_AMOUNT) {
      throw new Error('Invalid payment amount');
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9]([A-Za-z0-9._%-]*[A-Za-z0-9])?@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(customer_email)) {
      throw new Error('Invalid email address');
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Payment processing unavailable');
    }

    // Create payment intent with Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency,
        receipt_email: customer_email,
        ...Object.fromEntries(
          Object.entries(metadata || {}).map(([key, value]) => [`metadata[${key}]`, String(value)])
        ),
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      // Log error in development, but don't expose details to client
      if (Deno.env.get('ENVIRONMENT') === 'development') {
        console.error('Stripe API error:', errorData);
      }
      throw new Error('Failed to process payment');
    }

    const paymentIntent = await stripeResponse.json();

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // Log detailed errors only in development
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.error('Error creating payment intent:', error);
    }
    
    // Return generic error message to client
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});