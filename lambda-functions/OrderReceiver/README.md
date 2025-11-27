# OrderReceiver Lambda Function

## Purpose
Receives incoming order requests from API Gateway, validates inventory, creates Stripe payment intents, and saves orders to DynamoDB.

## Flow
1. Receives POST request with userId and items array
2. Validates all products exist in Inventory table
3. Checks stock availability
4. Calculates total amount
5. Creates Stripe Payment Intent (amount in cents)
6. Saves order to Orders table with status `PAYMENT_PENDING`
7. Returns orderId and clientSecret to frontend

## Input Format
```json
{
  "userId": "user-123",
  "items": [
    {
      "productId": "PROD001",
      "quantity": 2
    },
    {
      "productId": "PROD002",
      "quantity": 1
    }
  ]
}
```

## Output Format (Success)
```json
{
  "success": true,
  "orderId": "ORD-1732726800000-user-",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 149.97,
  "message": "Order created successfully. Complete payment to proceed."
}
```

## Output Format (Error - Insufficient Stock)
```json
{
  "error": "Inventory validation failed",
  "message": "Insufficient stock for some items",
  "unavailableItems": [
    {
      "productId": "PROD001",
      "requested": 200,
      "available": 100
    }
  ]
}
```

## Environment Variables Required
- `ORDERS_TABLE` - Name of DynamoDB Orders table
- `INVENTORY_TABLE` - Name of DynamoDB Inventory table
- `STRIPE_SECRET_KEY` - Stripe API secret key (starts with sk_test_ or sk_live_)
- `AWS_REGION` - AWS region (default: us-east-1)

## IAM Role Permissions Needed
- DynamoDB: GetItem, PutItem, BatchGetItem (on Orders and Inventory tables)
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

## Dependencies
- `@aws-sdk/client-dynamodb` - AWS SDK v3 for DynamoDB
- `@aws-sdk/lib-dynamodb` - Document client for easier DynamoDB operations
- `stripe` - Stripe SDK for payment processing

## Testing Locally
```bash
# Install dependencies
npm install

# Test with sample event (requires .env with STRIPE_SECRET_KEY, etc.)
node -e "console.log(JSON.stringify(require('./index').handler({body: JSON.stringify({userId: 'user-123', items: [{productId: 'PROD001', quantity: 1}]})})))"
```

## Deployment
Upload `OrderReceiver.zip` to AWS Lambda console or use AWS CLI:
```bash
aws lambda create-function \
  --function-name OrderReceiver \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/OrderProcessingLambdaRole \
  --handler index.handler \
  --zip-file fileb://OrderReceiver.zip \
  --timeout 30 \
  --memory-size 256
```

## Key Features
- **Batch inventory validation** - Uses BatchGetCommand for efficient multi-product lookup
- **Stock checking** - Prevents overselling by validating stock before payment
- **Idempotent** - Generates unique orderId with timestamp and userId
- **CORS enabled** - Includes headers for frontend integration
- **Error handling** - Returns appropriate status codes (400 for validation, 500 for server errors)
- **Stripe integration** - Creates payment intent with automatic payment methods enabled

## Notes
- Amount is converted to cents for Stripe (multiply by 100)
- Order status starts as `PAYMENT_PENDING` until webhook confirms payment
- Payment Intent metadata includes userId and orderItems for tracking
- Frontend will use clientSecret with Stripe Elements to complete payment
