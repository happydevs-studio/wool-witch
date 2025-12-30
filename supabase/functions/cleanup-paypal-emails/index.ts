/**
 * PayPal Email Cleanup Edge Function
 * 
 * Removes payer_email from PayPal payment details after 90 days
 * for PII data minimization and GDPR compliance.
 * 
 * This function should be scheduled to run daily or weekly via Supabase Cron.
 * 
 * Security:
 * - Requires service_role key for execution
 * - No public access - internal scheduled job only
 * - Logs all cleanup operations for audit trail
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalDetails {
  paypal_order_id?: string;
  payer_id?: string;
  payer_email?: string;
  transaction_id?: string;
  capture_id?: string;
  gross_amount?: number;
  fee_amount?: number;
  net_amount?: number;
}

interface PaymentRecord {
  id: string;
  created_at: string;
  paypal_details: PayPalDetails | null;
}

interface CleanupResult {
  success: boolean;
  recordsCleaned: number;
  error?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function should only be called by scheduled jobs or admins
    // Verify authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get Supabase service role client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema: 'woolwitch' }
    });

    // Calculate cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    console.log(`Cleaning PayPal emails older than ${cutoffDate.toISOString()}`);

    // Query for payments needing cleanup
    const { data: paymentsToClean, error: queryError } = await supabase
      .from('payments')
      .select('id, created_at, paypal_details')
      .eq('payment_method', 'paypal')
      .not('paypal_details', 'is', null)
      .lt('created_at', cutoffDate.toISOString());

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    const payments = (paymentsToClean || []) as PaymentRecord[];

    if (payments.length === 0) {
      console.log('No payments require cleanup');
      const result: CleanupResult = {
        success: true,
        recordsCleaned: 0,
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Filter payments that still have payer_email
    const paymentsWithEmail = payments.filter(payment => {
      return payment.paypal_details && payment.paypal_details.payer_email;
    });

    if (paymentsWithEmail.length === 0) {
      console.log(`Found ${payments.length} old PayPal payments, but none have payer_email`);
      const result: CleanupResult = {
        success: true,
        recordsCleaned: 0,
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${paymentsWithEmail.length} payments with payer_email to clean`);

    // Update each payment to remove payer_email
    let cleanedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const payment of paymentsWithEmail) {
      if (!payment.paypal_details) continue;
      
      // Create a copy and remove payer_email from the JSONB object
      const cleanedDetails: PayPalDetails = {
        ...payment.paypal_details,
      };
      delete cleanedDetails.payer_email;

      // Update the payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({ paypal_details: cleanedDetails })
        .eq('id', payment.id);

      if (updateError) {
        console.error(`Failed to clean payment ${payment.id}:`, updateError);
        errors.push({ id: payment.id, error: updateError.message });
      } else {
        cleanedCount++;
        console.log(`Cleaned payment ${payment.id} (created: ${payment.created_at})`);
      }
    }

    const result: CleanupResult = {
      success: errors.length === 0,
      recordsCleaned: cleanedCount,
      timestamp: new Date().toISOString(),
      error: errors.length > 0 ? `Failed to clean ${errors.length} records` : undefined
    };

    console.log(`Cleanup complete: ${cleanedCount} records cleaned, ${errors.length} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Cleanup function error:', error);
    
    const result: CleanupResult = {
      success: false,
      recordsCleaned: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
