# PayPal Email Cleanup Edge Function

## Purpose

This Supabase Edge Function automatically removes `payer_email` from PayPal payment details after 90 days to comply with data minimization principles and GDPR requirements.

## How It Works

1. Queries all PayPal payments older than 90 days
2. Checks if `payer_email` exists in the `paypal_details` JSONB column
3. Removes `payer_email` while preserving other PayPal transaction data
4. Logs all cleanup operations for audit trail
5. Returns summary of records cleaned

## Security

- **Access Control**: Requires `Authorization` header with service role key
- **RLS Bypass**: Uses service_role client to bypass Row Level Security
- **Audit Trail**: Logs all operations to function logs
- **No Public Access**: Not exposed as public endpoint

## Deployment

### 1. Deploy the Function

```bash
supabase functions deploy cleanup-paypal-emails
```

### 2. Set Environment Variables

The function requires these environment variables (set in Supabase Dashboard):

- `SUPABASE_URL` - Your Supabase project URL (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automatically set)

### 3. Schedule the Function

Use Supabase Cron Jobs or pg_cron to run this weekly:

```sql
-- Run every Sunday at 2 AM
SELECT cron.schedule(
  'cleanup-paypal-emails',
  '0 2 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-paypal-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

Or use an external cron service (recommended):

```bash
# Weekly cron job (every Sunday at 2 AM)
0 2 * * 0 curl -X POST \
  'https://your-project.supabase.co/functions/v1/cleanup-paypal-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve cleanup-paypal-emails

# Test the function (in another terminal)
curl -X POST http://localhost:54321/functions/v1/cleanup-paypal-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Manual Execution

To manually trigger the cleanup in production:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-paypal-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Response Format

```json
{
  "success": true,
  "recordsCleaned": 15,
  "timestamp": "2024-12-30T13:45:00.000Z"
}
```

Or on error:

```json
{
  "success": false,
  "recordsCleaned": 0,
  "error": "Error message here",
  "timestamp": "2024-12-30T13:45:00.000Z"
}
```

## Monitoring

### Check Function Logs

```bash
supabase functions logs cleanup-paypal-emails
```

Or via Supabase Dashboard:
1. Go to Edge Functions
2. Select `cleanup-paypal-emails`
3. View Logs tab

### Verify Cleanup

Run this query to check for old payments with payer_email:

```sql
SELECT 
  COUNT(*) as old_payments_with_email,
  MIN(created_at) as oldest_payment
FROM woolwitch.payments
WHERE 
  payment_method = 'paypal'
  AND created_at < NOW() - INTERVAL '90 days'
  AND paypal_details ? 'payer_email';
```

Should return 0 after successful cleanup.

## Troubleshooting

### "Missing authorization header"

Ensure you're passing the Authorization header:
```bash
-H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### "Missing Supabase configuration"

Environment variables not set. Check Supabase Dashboard > Edge Functions > Configuration.

### "Query failed"

Check that the `woolwitch` schema is accessible and the `payments` table exists.

## Rollback

If you need to temporarily disable cleanup:

```bash
# Undeploy the function
supabase functions delete cleanup-paypal-emails

# Or unschedule the cron job
SELECT cron.unschedule('cleanup-paypal-emails');
```

## Related Documentation

- [Data Retention Policy](../../docs/DATA_RETENTION.md)
- [Security Documentation](../../docs/SECURITY.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
