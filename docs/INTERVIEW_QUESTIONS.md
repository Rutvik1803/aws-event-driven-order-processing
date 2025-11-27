# 🎤 Project 3 - Interview Questions & Answers

This document contains all interview questions and detailed answers from each story in the Event-Driven Order Processing System project.

---

## 📚 Table of Contents

- [EPIC 3: IAM Roles & Permissions](#epic-3-iam-roles--permissions)
  - [Story 3.1: Create Lambda Execution Role](#story-31-create-lambda-execution-role)

---

## EPIC 3: IAM Roles & Permissions

### Story 3.1: Create Lambda Execution Role

#### **Q1: What is the difference between an IAM User, Role, and Policy?**

**Answer:**
> **IAM User:**
> - Represents a person or application
> - Has permanent credentials (access key, password)
> - Used for long-term access
> - Example: Your AWS console login
> 
> **IAM Role:**
> - Identity that can be assumed temporarily
> - No permanent credentials
> - Used by AWS services or applications
> - Example: Lambda function assumes a role
> 
> **IAM Policy:**
> - Document defining permissions (JSON)
> - Attached to users, roles, or groups
> - Defines what actions are allowed/denied
> - Example: "Allow DynamoDB read/write"
> 
> **Analogy:**
> - User = Employee with a permanent ID badge
> - Role = Visitor badge that can be borrowed temporarily
> - Policy = List of rooms the badge can access

---

#### **Q2: Why use FullAccess policies? Isn't that insecure?**

**Answer:**
> **You're absolutely right!** FullAccess policies are **not recommended for production**.
> 
> **Why we're using them in this project:**
> 1. **Learning focus:** Simplifies setup, lets us focus on architecture
> 2. **Development environment:** Not handling real customer data
> 3. **Time efficiency:** Creating custom policies takes longer
> 
> **Production best practice - Least Privilege:**
> ```json
> {
>   "Version": "2012-10-17",
>   "Statement": [
>     {
>       "Effect": "Allow",
>       "Action": [
>         "dynamodb:GetItem",
>         "dynamodb:PutItem",
>         "dynamodb:UpdateItem",
>         "dynamodb:Query"
>       ],
>       "Resource": [
>         "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
>         "arn:aws:dynamodb:us-east-1:123456789012:table/Inventory"
>       ]
>     }
>   ]
> }
> ```
> Only grants specific actions on specific tables.
> 
> **Interview answer:**
> "In this learning project, I used managed policies for simplicity. In production, I'd create custom policies following least-privilege principle, granting only specific actions on specific resources with conditions like IP restrictions and MFA requirements."

---

#### **Q3: What is the Trust Policy and why does Lambda need it?**

**Answer:**
> **Trust Policy** defines **WHO** can assume the role.
> 
> **Our trust policy:**
> ```json
> {
>   "Principal": {
>     "Service": "lambda.amazonaws.com"
>   },
>   "Action": "sts:AssumeRole"
> }
> ```
> 
> **Translation:** 
> - Allow the Lambda service to assume this role
> - Lambda can temporarily "become" this role and use its permissions
> 
> **Why Lambda needs it:**
> 1. Lambda runs in AWS's infrastructure (not your account directly)
> 2. Needs temporary credentials to access your resources
> 3. Assumes the role when function executes
> 4. Credentials auto-rotate (security best practice)
> 
> **Real-world analogy:**
> - Role = Company car with keys in the ignition
> - Trust policy = "Only employees can drive this car"
> - Lambda = Employee who borrows the car for a task
> 
> **Without trust policy:** Lambda can't assume the role, even if permissions are correct → "Access Denied" errors

---

#### **Q4: What does AWSLambdaBasicExecutionRole actually do?**

**Answer:**
> **AWSLambdaBasicExecutionRole** grants permissions to write logs to CloudWatch.
> 
> **Permissions included:**
> ```json
> {
>   "Action": [
>     "logs:CreateLogGroup",
>     "logs:CreateLogStream",
>     "logs:PutLogEvents"
>   ],
>   "Resource": "arn:aws:logs:*:*:*"
> }
> ```
> 
> **What each action does:**
> - **CreateLogGroup:** Create a log group (e.g., `/aws/lambda/OrderReceiver`)
> - **CreateLogStream:** Create log streams within the group (one per Lambda invocation)
> - **PutLogEvents:** Write actual log messages (console.log output)
> 
> **Without this policy:**
> - Lambda still executes
> - But logs are lost (you can't debug!)
> - CloudWatch shows "No logs available"
> 
> **Why it's critical:**
> - Debugging production issues requires logs
> - Monitoring Lambda performance
> - Tracking errors and exceptions
> - Compliance and audit trails

---

#### **Q5: How does Lambda use this role when it executes?**

**Answer:**
> **Execution Flow:**
> 
> ```
> 1. API Gateway invokes Lambda function
>    ↓
> 2. Lambda service calls: sts:AssumeRole (using trust policy)
>    ↓
> 3. AWS STS returns temporary credentials (valid for function duration)
>    ↓
> 4. Lambda injects credentials as environment variables:
>    - AWS_ACCESS_KEY_ID
>    - AWS_SECRET_ACCESS_KEY
>    - AWS_SESSION_TOKEN
>    ↓
> 5. Your Lambda code uses AWS SDK:
>    await dynamodb.putItem({...})
>    ↓
> 6. SDK reads credentials from environment
>    ↓
> 7. Makes API call to DynamoDB with credentials
>    ↓
> 8. DynamoDB checks IAM policy → Allows PutItem
>    ↓
> 9. Operation succeeds ✅
> ```
> 
> **Key points:**
> - Credentials are temporary (expire after function finishes)
> - You never see or manage these credentials
> - AWS SDK automatically finds and uses them
> - Each invocation gets fresh credentials (security)

---

#### **Q6: Can multiple Lambda functions share the same IAM role?**

**Answer:**
> **Yes, absolutely!** In fact, it's a common practice.
> 
> **Our project:**
> All 5 Lambda functions will use `OrderProcessingLambdaRole`:
> - OrderReceiver
> - PaymentHandler
> - EmailProcessor
> - InventoryProcessor
> - GetOrderStatus
> 
> **Benefits:**
> - Simpler management (one role to maintain)
> - Consistent permissions across functions
> - Easier to audit
> 
> **When to use separate roles:**
> 1. **Different permission needs:**
>    - GetOrderStatus only needs DynamoDB read
>    - OrderReceiver needs read + write
>    - Separate roles = least privilege
> 
> 2. **Security boundaries:**
>    - Payment function handles sensitive data
>    - Give it restricted role with extra audit logging
> 
> 3. **Compliance requirements:**
>    - Regulations require separation of duties
>    - Different roles for read vs write operations
> 
> **Best practice for production:**
> Create role per function or per responsibility, not one shared role.

---

#### **Q7: What are STS temporary credentials and why are they more secure?**

**Answer:**
> **STS (Security Token Service)** generates temporary credentials when Lambda assumes a role.
> 
> **Temporary vs Permanent Credentials:**
> 
> **Permanent (IAM User):**
> - Access key never expires (until you rotate it)
> - If leaked, valid forever until manually revoked
> - Stored in `.aws/credentials` file
> - Risk: Credentials committed to GitHub → exposed forever
> 
> **Temporary (IAM Role via STS):**
> - Valid for short duration (15 min to 12 hours)
> - Automatically expire
> - Never stored on disk
> - If leaked, limited damage window
> 
> **Security benefits:**
> 1. **Limited blast radius:** Stolen credentials expire quickly
> 2. **No rotation needed:** New credentials every invocation
> 3. **Automatic cleanup:** Can't forget to revoke
> 4. **Audit trail:** CloudTrail logs every AssumeRole call
> 
> **Real-world scenario:**
> - Lambda logs accidentally include AWS credentials
> - Logs are public in GitHub
> - **Permanent creds:** Full account access until you notice and rotate
> - **Temporary creds:** Expire in 15 minutes, attacker can't use them

---

#### **Q8: (Scenario) Lambda function gets "Access Denied" when trying to write to DynamoDB. How do you debug?**

**Answer:**
> **Step-by-step troubleshooting:**
> 
> **1. Verify Lambda has execution role assigned:**
> ```
> Lambda Console → Function → Configuration → Permissions
> Check: Execution role = OrderProcessingLambdaRole
> ```
> If missing: Assign the role
> 
> **2. Verify role has DynamoDB permissions:**
> ```
> IAM Console → Roles → OrderProcessingLambdaRole → Permissions
> Check: AmazonDynamoDBFullAccess attached
> ```
> If missing: Attach policy
> 
> **3. Check DynamoDB table name is correct:**
> ```javascript
> // Wrong: Hardcoded name
> TableName: 'orders' 
> 
> // Right: Environment variable
> TableName: process.env.ORDERS_TABLE
> ```
> Verify environment variable is set correctly
> 
> **4. Check table exists in same region:**
> ```
> Lambda region: us-east-1
> DynamoDB table: us-east-1 ✅
> 
> If different regions: Access denied
> ```
> 
> **5. Check for resource-based policies on table:**
> ```
> DynamoDB → Table → Additional settings → Resource-based policy
> If policy exists: Might explicitly deny Lambda access
> ```
> 
> **6. Check CloudWatch Logs for exact error:**
> ```
> Error: User: arn:aws:sts::123:assumed-role/OrderProcessingLambdaRole/OrderReceiver 
> is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:...:table/Orders
> ```
   This tells you exactly which permission is missing
> 
> **7. Test with AWS CLI locally:**
> ```bash
> aws dynamodb put-item \
>   --table-name Orders \
>   --item '{"orderId":{"S":"test"}}'
> ```
> If works locally but not in Lambda: Role issue

---

## EPIC 4: Lambda Functions

### Story 4.1: Create OrderReceiver Lambda

#### **Q1: Why use AWS SDK v3 instead of v2?**

**Answer:**
> **AWS SDK v3 advantages:**
> 
> **1. Smaller bundle size:**
> - v2: Import entire AWS SDK (~60MB uncompressed)
> - v3: Import only needed clients (~500KB for DynamoDB)
> - **Our Lambda ZIP:** 4.9MB vs ~10MB with v2
> 
> **2. Modular imports:**
> ```javascript
> // v2 - imports everything
> const AWS = require('aws-sdk');
> const dynamodb = new AWS.DynamoDB.DocumentClient();
> 
> // v3 - imports only what you need
> const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
> const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
> ```
> 
> **3. Better TypeScript support:**
> - Strong typing for all operations
> - Autocomplete in IDEs
> - Compile-time error checking
> 
> **4. Promise-native:**
> - v2: Requires `.promise()` calls
> - v3: Native async/await support
> 
> **5. Middleware stack:**
> - Customizable request/response handling
> - Better for logging, retries, custom auth
> 
> **Interview answer:**
> "I used AWS SDK v3 because it reduces Lambda cold start time with smaller bundle size (4.9MB vs ~10MB), provides modular imports so we only include DynamoDB and SNS clients we need, and offers better TypeScript support for type-safe code. The promise-native design also makes async/await cleaner without `.promise()` calls."

---

#### **Q2: Why create Stripe Payment Intent before confirming payment?**

**Answer:**
> **Payment Intent Workflow:**
> 
> ```
> Step 1: Backend creates Payment Intent
>    ↓
>    Returns clientSecret to frontend
>    ↓
> Step 2: Frontend uses clientSecret with Stripe Elements
>    ↓
>    User enters card details (stays on your site)
>    ↓
> Step 3: Stripe confirms payment (3D Secure if needed)
>    ↓
> Step 4: Stripe webhook notifies backend: payment_intent.succeeded
>    ↓
> Step 5: Backend updates order status to COMPLETED
> ```
> 
> **Why this approach:**
> 
> **1. PCI Compliance:**
> - Card details never touch our backend
> - Stripe handles all sensitive data
> - Reduces security liability
> 
> **2. Better UX:**
> - User stays on your website
> - No redirect to Stripe checkout
> - Seamless payment experience
> 
> **3. Advanced features:**
> - 3D Secure / SCA authentication
> - Save card for future use
> - Multiple payment methods (cards, wallets)
> - Installment plans
> 
> **4. Track payment lifecycle:**
> - `requires_payment_method` → Card details needed
> - `requires_action` → 3D Secure verification
> - `processing` → Payment being processed
> - `succeeded` → Payment complete
> 
> **Alternative (worse):**
> - Frontend collects card details
> - Sends to backend
> - Backend charges card
> - **Problem:** Card data touches our server → PCI DSS compliance required (expensive audits)
> 
> **Interview answer:**
> "Payment Intent separates payment authorization from execution. Backend creates the intent with order details, frontend uses the clientSecret to securely collect payment without card data ever touching our server. This is PCI-compliant, supports advanced features like 3D Secure, and provides better UX since users stay on our site. Webhooks then confirm payment asynchronously."

---

#### **Q3: Why use BatchGetCommand instead of multiple GetItem calls?**

**Answer:**
> **Performance comparison:**
> 
> **Approach 1: Loop with GetItem (BAD)**
> ```javascript
> for (const item of items) {
>   const product = await docClient.send(new GetCommand({
>     TableName: 'Inventory',
>     Key: { productId: item.productId }
>   }));
>   products.push(product.Item);
> }
> // Time: 3 items × 20ms = 60ms
> // API calls: 3 calls
> // Cost: 3 × $0.25 per million = more expensive
> ```
> 
> **Approach 2: BatchGetCommand (GOOD)**
> ```javascript
> const response = await docClient.send(new BatchGetCommand({
>   RequestItems: {
>     'Inventory': {
>       Keys: items.map(i => ({ productId: i.productId }))
>     }
>   }
> }));
> const products = response.Responses['Inventory'];
> // Time: 20ms (single API call)
> // API calls: 1 call
> // Cost: 1 × $0.25 per million = cheaper
> ```
> 
> **Benefits:**
> 1. **Latency:** 60ms → 20ms (3x faster)
> 2. **Lambda duration:** Less execution time = lower cost
> 3. **API calls:** 3 calls → 1 call = reduced throttling risk
> 4. **DynamoDB cost:** Fewer requests = lower bill
> 
> **Limitations:**
> - Max 100 items per batch
> - Max 16MB response size
> - If order has 100+ items, need pagination
> 
> **Handling unprocessed keys:**
> ```javascript
> if (response.UnprocessedKeys && Object.keys(response.UnprocessedKeys).length > 0) {
>   // Retry unprocessed items with exponential backoff
> }
> ```
> 
> **Interview answer:**
> "BatchGetCommand retrieves multiple items in a single API call, reducing latency from 60ms to 20ms for 3 items, lowering Lambda execution cost, and improving user experience. It's more efficient than looping with GetItem calls. The trade-off is handling unprocessed keys if DynamoDB is throttled, but for typical order sizes (1-10 items), it's always the better choice."

---

#### **Q4: Why not deduct inventory immediately when order is created?**

**Answer:**
> **Our approach: Validate stock, don't deduct yet**
> 
> **Reason:** Payment might fail!
> 
> **Scenario if we deduct immediately:**
> ```
> 1. User creates order → Stock: 100 → 99
> 2. Payment fails (card declined)
> 3. Order cancelled
> 4. Stock stuck at 99 (should be 100)
> 5. Need rollback logic (complex!)
> ```
> 
> **Better approach (our implementation):**
> ```
> 1. OrderReceiver: Validate stock exists (CHECK only)
> 2. Create Payment Intent
> 3. Wait for payment confirmation
> 4. PaymentHandler webhook: DEDUCT stock (Story 4.2)
> 5. InventoryProcessor: Update stock in background (Story 4.4)
> ```
> 
> **Two-phase inventory model:**
> 
> **Phase 1: Reserve (Optional for high-demand products)**
> - Add `reserved` field to Inventory table
> - OrderReceiver: `reserved += quantity`
> - Prevents overselling during payment window
> - Webhook: `reserved -= quantity`, `stock -= quantity`
> 
> **Phase 2: Deduct (Our current approach)**
> - OrderReceiver: Only check `stock >= quantity`
> - Webhook: `stock -= quantity` after payment succeeds
> - Simple but allows overselling if many simultaneous orders
> 
> **Which to use:**
> - **E-commerce (general):** Phase 2 (our approach) - Simple, good enough
> - **Limited inventory (concert tickets):** Phase 1 - Prevents overselling
> - **High volume (Amazon):** Distributed locking with DynamoDB transactions
> 
> **Interview answer:**
> "We validate stock availability during order creation but don't deduct yet because payment might fail. Deducting immediately would require rollback logic if payment fails, adding complexity. Instead, the PaymentHandler webhook deducts inventory only after Stripe confirms payment, ensuring inventory accuracy without rollbacks. For high-demand products, we'd add a 'reserved' field to prevent overselling during the payment window."

---

#### **Q5: How does Lambda get AWS credentials to access DynamoDB?**

**Answer:**
> **Credential flow:**
> 
> ```
> 1. Lambda function created with execution role: OrderProcessingLambdaRole
>    ↓
> 2. Lambda service calls: sts:AssumeRole (when function invoked)
>    ↓
> 3. STS returns temporary credentials:
>    - AWS_ACCESS_KEY_ID
>    - AWS_SECRET_ACCESS_KEY
>    - AWS_SESSION_TOKEN
>    ↓
> 4. Lambda injects credentials as environment variables
>    ↓
> 5. AWS SDK automatically reads these variables:
>    const client = new DynamoDBClient({ region: 'us-east-1' });
>    // No credentials needed in code!
>    ↓
> 6. SDK makes API call to DynamoDB with credentials
>    ↓
> 7. DynamoDB checks IAM policy → Allows PutItem
> ```
> 
> **Why you never see credentials in code:**
> - AWS SDK has credential provider chain:
>   1. Check environment variables (Lambda sets these)
>   2. Check EC2 instance metadata (for EC2)
>   3. Check ECS task role (for containers)
>   4. Check ~/.aws/credentials file (local dev)
> - Lambda environment variables are first in chain
> 
> **Security benefits:**
> - Credentials expire after function finishes (15-60 min)
> - Each invocation gets fresh credentials
> - No hardcoded keys in code
> - Impossible to leak long-term credentials
> 
> **What happens without execution role:**
> ```javascript
> const client = new DynamoDBClient();
> await client.send(new PutCommand({...}));
> // Error: Missing credentials in config, if using AWS_CONFIG_FILE, set AWS_SDK_LOAD_CONFIG=1
> ```
> 
> **Interview answer:**
> "Lambda uses the execution role to get temporary AWS credentials. When the function is invoked, Lambda calls STS AssumeRole and injects the returned credentials as environment variables. The AWS SDK automatically reads these variables - no credentials in code needed. This is more secure than hardcoded keys because credentials expire after each invocation and can't be leaked."

---

#### **Q6: Why convert amount to cents for Stripe?**

**Answer:**
> **Stripe amount format:**
> 
> ```javascript
> // Wrong - floating point errors
> const amount = 29.99;
> stripe.paymentIntents.create({ amount: amount }); // ❌ Stripe expects integer
> 
> // Wrong - direct multiplication has precision issues
> const amount = 29.99 * 100; // = 2999.0000000001 (floating point!)
> 
> // Right - round to avoid precision errors
> const amount = Math.round(29.99 * 100); // = 2999 (integer)
> stripe.paymentIntents.create({ amount: amount, currency: 'usd' }); // ✅
> ```
> 
> **Why Stripe uses cents (smallest currency unit):**
> 
> **Problem with decimals:**
> - Floating point arithmetic is imprecise
> - 0.1 + 0.2 = 0.30000000000000004 in JavaScript
> - Can't represent money accurately
> 
> **Solution: Use integers:**
> - $29.99 → 2999 cents
> - $100.00 → 10000 cents
> - No decimal point = no precision errors
> 
> **Currency units:**
> - **USD:** 1 dollar = 100 cents
> - **EUR:** 1 euro = 100 cents
> - **JPY:** 1 yen = 1 yen (no decimal)
> - **KWD:** 1 dinar = 1000 fils (3 decimals!)
> 
> **Stripe handles currency units:**
> ```javascript
> // USD - divide by 100
> { amount: 2999, currency: 'usd' } // = $29.99
> 
> // JPY - no division (0 decimal places)
> { amount: 2999, currency: 'jpy' } // = ¥2999
> 
> // KWD - divide by 1000 (3 decimal places)
> { amount: 29990, currency: 'kwd' } // = 29.990 KWD
> ```
> 
> **Our code:**
> ```javascript
> const totalAmount = 29.99; // calculated from products
> const paymentIntent = await stripe.paymentIntents.create({
>   amount: Math.round(totalAmount * 100), // 2999 cents
>   currency: 'usd'
> });
> ```
> 
> **Interview answer:**
> "Stripe requires amounts as integers in the smallest currency unit (cents for USD) to avoid floating-point precision errors. JavaScript's `0.1 + 0.2 = 0.30000000000000004` would cause incorrect charges. By using `Math.round(amount * 100)`, we convert $29.99 to 2999 cents as an integer. Stripe handles currency-specific conversions - USD has 2 decimals, JPY has 0, KWD has 3."

---

#### **Q7: What are the trade-offs of synchronous vs asynchronous order processing?**

**Answer:**
> **Approach 1: Synchronous (Our OrderReceiver)**
> 
> ```javascript
> // User waits for everything to complete
> 1. Validate inventory (50ms)
> 2. Create Stripe Payment Intent (300ms)
> 3. Save order to DynamoDB (20ms)
> 4. Return response (10ms)
> Total: ~380ms
> ```
> 
> **Pros:**
> - ✅ Simple code (no queues needed)
> - ✅ Immediate feedback to user
> - ✅ Easy to debug (single execution trace)
> - ✅ Consistency (all-or-nothing)
> 
> **Cons:**
> - ❌ User waits for all steps
> - ❌ If Stripe is slow (2s), user waits 2s
> - ❌ Any step fails → entire request fails
> 
> ---
> 
> **Approach 2: Asynchronous (Alternative)**
> 
> ```javascript
> // User gets immediate response, processing happens in background
> 1. Save order to DynamoDB (20ms) - status: PENDING
> 2. Publish message to SQS (15ms)
> 3. Return response immediately (10ms)
> Total: ~45ms (8x faster!)
> 
> // Background Lambda processes queue
> 4. Validate inventory (50ms)
> 5. Create Stripe Payment Intent (300ms)
> 6. Update order status (20ms)
> 7. Send email with payment link (100ms)
> ```
> 
> **Pros:**
> - ✅ Fast response to user (45ms vs 380ms)
> - ✅ Resilient (retries if Stripe fails)
> - ✅ Scales better (queue buffers spikes)
> - ✅ Can process heavy tasks (email, notifications)
> 
> **Cons:**
> - ❌ Complex (need SQS, DLQ, retry logic)
> - ❌ No immediate feedback (need polling or WebSocket)
> - ❌ Harder to debug (distributed tracing needed)
> - ❌ Eventual consistency (order pending for few seconds)
> 
> ---
> 
> **Hybrid Approach (Best for production):**
> 
> ```javascript
> Synchronous:
> - Inventory validation (must be immediate)
> - Create Payment Intent (user needs clientSecret now)
> - Save order (needed for payment reference)
> 
> Asynchronous (after payment webhook):
> - Send confirmation email (user can wait)
> - Update inventory stock (eventual consistency OK)
> - Send admin notifications (not critical)
> - Analytics tracking (can be delayed)
> ```
> 
> **Our project uses:**
> - **OrderReceiver:** Synchronous (Stories 4.1)
> - **PaymentHandler:** Synchronous (Story 4.2) - must update immediately
> - **EmailProcessor:** Asynchronous via SQS (Story 4.3)
> - **InventoryProcessor:** Asynchronous via SQS (Story 4.4)
> 
> **Interview answer:**
> "OrderReceiver uses synchronous processing because users need immediate validation and clientSecret to complete payment. For operations that don't require immediate response - like sending emails or updating inventory - we use asynchronous processing via SQS. This provides fast user experience (380ms response) while offloading heavy tasks to background workers. The trade-off is added complexity with queues and eventual consistency, but the user experience improvement is worth it."

---

#### **Q8: (Scenario) User creates order but payment fails. How do you handle this?**

**Answer:**
> **Current state after OrderReceiver:**
> - Order in DynamoDB: `status = PAYMENT_PENDING`
> - Payment Intent in Stripe: `status = incomplete`
> - No email sent yet
> - No inventory deducted
> 
> **Scenario 1: Card declined immediately**
> ```
> 1. Frontend submits payment with Stripe Elements
> 2. Stripe returns error: "Your card was declined"
> 3. Frontend shows error to user
> 4. User can try different card (same Payment Intent)
> 5. If successful → webhook triggers → order becomes COMPLETED
> 6. If user gives up → order stays PAYMENT_PENDING forever
> ```
> 
> **Problem: Abandoned orders clutter database**
> 
> ---
> 
> **Solution 1: TTL (Time To Live) in DynamoDB**
> ```javascript
> // When creating order
> const orderRecord = {
>   orderId: orderId,
>   status: 'PAYMENT_PENDING',
>   expiresAt: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
>   ...
> };
> ```
> - Enable TTL on `expiresAt` field in DynamoDB
> - DynamoDB automatically deletes orders after 30 min
> - Free, no code needed
> 
> ---
> 
> **Solution 2: Scheduled Lambda cleanup**
> ```javascript
> // EventBridge rule: Every 1 hour
> exports.handler = async () => {
>   const expiredOrders = await docClient.scan({
>     TableName: 'Orders',
>     FilterExpression: 'status = :pending AND createdAt < :cutoff',
>     ExpressionAttributeValues: {
>       ':pending': 'PAYMENT_PENDING',
>       ':cutoff': new Date(Date.now() - 30 * 60 * 1000).toISOString()
>     }
>   });
>   
>   // Delete or mark as EXPIRED
>   for (const order of expiredOrders.Items) {
>     await docClient.update({
>       TableName: 'Orders',
>       Key: { orderId: order.orderId },
>       UpdateExpression: 'SET status = :expired',
>       ExpressionAttributeValues: { ':expired': 'EXPIRED' }
>     });
>   }
> };
> ```
> 
> ---
> 
> **Solution 3: Cancel Payment Intent after timeout**
> ```javascript
> // In cleanup Lambda
> const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
> 
> if (paymentIntent.status === 'requires_payment_method') {
>   // Still waiting for payment → cancel it
>   await stripe.paymentIntents.cancel(order.paymentIntentId);
>   
>   // Update order status
>   await docClient.update({
>     TableName: 'Orders',
>     Key: { orderId: order.orderId },
>     UpdateExpression: 'SET status = :cancelled',
>     ExpressionAttributeValues: { ':cancelled': 'CANCELLED' }
>   });
> }
> ```
> 
> ---
> 
> **Solution 4: Frontend retry with exponential backoff**
> ```javascript
> // Frontend code
> const maxRetries = 3;
> let attempt = 0;
> 
> while (attempt < maxRetries) {
>   try {
>     const result = await stripe.confirmCardPayment(clientSecret, {
>       payment_method: { card: cardElement }
>     });
>     
>     if (result.error) {
>       // Show error to user, let them retry manually
>       break;
>     } else {
>       // Success!
>       break;
>     }
>   } catch (error) {
>     attempt++;
>     await sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
>   }
> }
> ```
> 
> ---
> 
> **Best practice (Combination):**
> 1. **DynamoDB TTL:** Auto-delete after 30 min (cleanup)
> 2. **Payment Intent:** Stripe auto-expires after 24 hours
> 3. **Frontend:** Show payment status, allow retry
> 4. **Email:** Send abandoned cart email after 1 hour (marketing opportunity!)
> 
> **Interview answer:**
> "If payment fails, the order stays in `PAYMENT_PENDING` status. To handle abandoned orders, I'd implement DynamoDB TTL to auto-delete unpaid orders after 30 minutes. Stripe Payment Intents automatically expire after 24 hours. For better user experience, the frontend can retry failed payments using the same clientSecret. As a bonus, we can send abandoned cart emails after 1 hour to recover lost sales."

---

