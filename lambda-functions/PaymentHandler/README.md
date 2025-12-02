# PaymentHandler Lambda Function

## Purpose
Receives Stripe webhook notifications when payments complete, verifies authenticity, updates order status, and publishes events to SNS for downstream processing.

## Flow
1. Receives POST request from Stripe webhook
2. Verifies webhook signature using STRIPE_WEBHOOK_SECRET
3. Handles `payment_intent.succeeded` event
4. Finds order by paymentIntentId
5. Updates order status to `COMPLETED` in DynamoDB
6. Publishes `ORDER_COMPLETED` event to SNS
7. Returns 200 response to Stripe

## Webhook Security
**CRITICAL:** Always verify webhook signatures!
- Prevents attackers from sending fake "payment succeeded" events
- Stripe signs each webhook with your secret
- If signature doesn't match, reject the request

## Input Format (from Stripe)
```json
{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 11998,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "userId": "user-123",
        "orderItems": "[...]"
      }
    }
  }
}
```

## Output Format
```json
{
  "received": true
}
```

## SNS Event Published
```json
{
  "eventType": "ORDER_COMPLETED",
  "orderId": "ORD-1732726800000-user-",
  "userId": "user-123",
  "items": [...],
  "totalAmount": 119.98,
  "paymentIntentId": "pi_xxx",
  "completedAt": "2025-11-27T10:00:00.000Z"
}
```

## Environment Variables Required
- `ORDERS_TABLE` - Name of DynamoDB Orders table
- `ORDER_EVENTS_TOPIC_ARN` - ARN of SNS OrderEvents-Topic
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (starts with whsec_)
- `AWS_REGION` - AWS region (default: ap-south-1)

## IAM Role Permissions Needed
- DynamoDB: UpdateItem, Scan (on Orders table)
- SNS: Publish (on OrderEvents-Topic)
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

## Dependencies
- `@aws-sdk/client-dynamodb` - AWS SDK v3 for DynamoDB
- `@aws-sdk/lib-dynamodb` - Document client
- `@aws-sdk/client-sns` - AWS SDK v3 for SNS
- `stripe` - Stripe SDK for webhook verification

## Setting Up Stripe Webhook
1. Deploy Lambda and get URL from API Gateway
2. Go to Stripe Dashboard → Developers → Webhooks
3. Add endpoint: `https://your-api.execute-api.us-east-1.amazonaws.com/prod/webhooks/stripe`
4. Select events: `payment_intent.succeeded`
5. Copy webhook signing secret (whsec_...)
6. Add to Lambda environment variables as STRIPE_WEBHOOK_SECRET

## Testing Locally
```bash
# Install dependencies
npm install

# Test requires Stripe CLI for webhook simulation
stripe listen --forward-to http://localhost:3000/webhooks/stripe
```

## Deployment
Upload `PaymentHandler.zip` to AWS Lambda:
```bash
zip -r PaymentHandler.zip . -x "*.git*" "*.zip"

aws lambda create-function \
  --function-name PaymentHandler \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/OrderProcessingLambdaRole \
  --handler index.handler \
  --zip-file fileb://PaymentHandler.zip \
  --timeout 30 \
  --memory-size 256
```

## Key Features
- **Signature verification** - Prevents fake payment notifications
- **Idempotent** - Can handle duplicate webhook calls safely
- **Scan fallback** - Uses scan to find orders (GSI recommended for production)
- **SNS fan-out** - Single publish triggers multiple downstream processes
- **Error handling** - Returns 200 even on errors to prevent Stripe retries

## Production Improvements
1. **Add GSI on paymentIntentId** - Replace scan with query (faster, cheaper)
2. **Implement idempotency** - Track processed webhook IDs to prevent duplicates
3. **Add webhook event logging** - Store all webhook events for audit
4. **Handle more events** - payment_intent.payment_failed, charge.refunded, etc.
5. **Add dead letter queue** - Catch failed SNS publishes

## Notes
- Stripe retries webhooks that don't return 200 status
- Webhook secret is different from API secret key
- Test webhooks in Stripe dashboard before going live
- SNS MessageAttributes allow SQS filtering by eventType
