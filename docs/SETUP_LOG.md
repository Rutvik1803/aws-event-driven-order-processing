# Project Setup Log

## Story 1.1: Project Structure ✅
**Date:** November 25, 2025
**Status:** Completed

### Actions Taken:
- Created project folder structure
- Initialized Git repository
- Created .gitignore file
- Created initial README.md
- First commit: "Initial project setup with folder structure"

### Files Created:
- `/lambda-functions/` - Lambda function code
- `/frontend/` - React application
- `/docs/` - Documentation
- `/screenshots/` - Architecture & UI screenshots
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation

---

## Story 1.2: DynamoDB Tables ✅
**Date:** November 25, 2025
**Status:** Completed

### Tables Created:

#### 1. Orders Table
- **Table Name:** Orders
- **Partition Key:** orderId (String)
- **Billing Mode:** On-demand
- **Status:** Active
- **Current Items:** 0 (will populate during order processing)

**Attributes Schema:**
```
orderId (String, PK)
userId (String)
items (List)
totalAmount (Number)
status (String) - PENDING, PAID, PROCESSING, COMPLETED, FAILED
paymentIntentId (String)
createdAt (String)
updatedAt (String)
```

#### 2. Inventory Table
- **Table Name:** Inventory
- **Partition Key:** productId (String)
- **Billing Mode:** On-demand
- **Status:** Active
- **Current Items:** 5

**Sample Data:**
```
PROD001 - Wireless Mouse - $29.99 - Stock: 100
PROD002 - Mechanical Keyboard - $89.99 - Stock: 50
PROD003 - USB-C Cable (6ft) - $12.99 - Stock: 200
PROD004 - Adjustable Laptop Stand - $45.50 - Stock: 75
PROD005 - HD Webcam 1080p - $65.00 - Stock: 30
```

### Verification:
- ✅ Both tables created successfully
- ✅ On-demand billing enabled
- ✅ Inventory populated with 5 products
- ✅ Tables visible in AWS Console

### Screenshots Taken:
- `dynamodb-tables-list.png` - Both tables listed
- `inventory-table-data.png` - 5 products displayed
- `orders-table-empty.png` - Empty Orders table

---

## Story 2.1: Create SNS Topics ✅
**Date:** November 26, 2025
**Status:** Completed

### Topics Created:

#### 1. OrderEvents-Topic
- **Type:** Standard
- **Purpose:** Publish order-related events (ORDER_CREATED, PAYMENT_CONFIRMED, etc.)
- **ARN:** [Your ARN here - copy from AWS Console]
- **Tags:** Project: OrderProcessing
- **Subscribers:** None yet (will add SQS queues in Story 2.3)

#### 2. AdminAlerts-Topic
- **Type:** Standard
- **Purpose:** Send system alerts to administrators
- **ARN:** [Your ARN here - copy from AWS Console]
- **Tags:** Project: OrderProcessing
- **Subscribers:** Email (Confirmed ✅)

### Verification:
- ✅ Both topics created successfully
- ✅ Email subscription confirmed
- ✅ Test message sent and received
- ✅ ARNs noted for future Lambda configuration

### Screenshots Taken:
- `sns-topics-list.png` - Both topics listed
- `admin-alerts-subscription.png` - Confirmed subscription
- `test-email-received.png` - Test email in inbox

---

## Story 2.2: Create SQS Queues ✅
**Date:** November 26, 2025
**Status:** Completed

### Queues Created:

#### 1. EmailQueue (Main Queue)
- **Type:** Standard
- **Purpose:** Receive order events for email processing
- **URL:** [Your URL here]
- **ARN:** [Your ARN here]
- **Configuration:**
  - Visibility timeout: 30 seconds
  - Message retention: 4 days
  - Long polling: 20 seconds ✅
  - DLQ: EmailDLQ (max receives: 3)
- **Tags:** Project: OrderProcessing

#### 2. EmailDLQ (Dead Letter Queue)
- **Type:** Standard
- **Purpose:** Catch failed email processing messages
- **URL:** [Your URL here]
- **ARN:** [Your ARN here]
- **Configuration:**
  - Visibility timeout: 30 seconds
  - Message retention: 4 days
- **Tags:** Project: OrderProcessing

#### 3. InventoryQueue (Main Queue)
- **Type:** Standard
- **Purpose:** Receive payment events for inventory updates
- **URL:** [Your URL here]
- **ARN:** [Your ARN here]
- **Configuration:**
  - Visibility timeout: 30 seconds
  - Message retention: 4 days
  - Long polling: 20 seconds ✅
  - DLQ: InventoryDLQ (max receives: 3)
- **Tags:** Project: OrderProcessing

#### 4. InventoryDLQ (Dead Letter Queue)
- **Type:** Standard
- **Purpose:** Catch failed inventory update messages
- **URL:** [Your URL here]
- **ARN:** [Your ARN here]
- **Configuration:**
  - Visibility timeout: 30 seconds
  - Message retention: 4 days
- **Tags:** Project: OrderProcessing

### Verification:
- ✅ All 4 queues created successfully
- ✅ DLQ configured with max receive count = 3
- ✅ Long polling enabled (20 seconds) on main queues
- ✅ Message retention set to 4 days
- ✅ Visibility timeout set to 30 seconds
- ✅ All URLs and ARNs noted

### Screenshots Taken:
- `sqs-queues-list.png` - All 4 queues visible
- `email-queue-dlq-config.png` - DLQ configuration

---

## Story 2.3: Subscribe SQS to SNS ✅
**Date:** November 26, 2025
**Status:** Completed

### Subscriptions Created:

#### 1. EmailQueue → OrderEvents-Topic
- **Protocol:** Amazon SQS
- **Endpoint:** EmailQueue ARN
- **Status:** Confirmed ✅
- **Raw message delivery:** Enabled ✅
- **Filter policy:** None (receives all events)

#### 2. InventoryQueue → OrderEvents-Topic
- **Protocol:** Amazon SQS
- **Endpoint:** InventoryQueue ARN
- **Status:** Confirmed ✅
- **Raw message delivery:** Enabled ✅
- **Filter policy:** None (receives all events)

### Access Policies Updated:
- ✅ EmailQueue: Allows SNS to send messages
- ✅ InventoryQueue: Allows SNS to send messages

### Testing Results:
- ✅ Published test message to OrderEvents-Topic
- ✅ EmailQueue received the message
- ✅ InventoryQueue received the same message
- ✅ Fan-out pattern verified successfully!
- ✅ SNS metrics: 1 publish, 2 deliveries
- ✅ Test messages cleaned up

### Screenshots Taken:
- `sns-sqs-subscriptions.png` - Both subscriptions confirmed
- `sqs-messages-received.png` - Messages in both queues
- `sns-monitoring-metrics.png` - Delivery metrics

---

## ✅ EPIC 2 Complete!

All SNS & SQS infrastructure is ready:
- 2 SNS topics created (OrderEvents, AdminAlerts)
- 4 SQS queues created (2 main + 2 DLQs)
- Subscriptions configured with raw message delivery
- Fan-out pattern tested and working

---

## ✅ EPIC 3: IAM Roles & Permissions

### Story 3.1: Create Lambda Execution Role ✅
**Date:** November 27, 2025
**Status:** Completed

#### Role Created:
- **Role Name:** OrderProcessingLambdaRole
- **Role ARN:** [Your ARN here - copy from IAM Console]
- **Description:** Execution role for Order Processing Lambda functions

#### Trust Policy:
- **Trusted Entity:** Lambda service (lambda.amazonaws.com)
- **Action:** sts:AssumeRole

#### Permissions Attached:
1. **AWSLambdaBasicExecutionRole**
   - Purpose: Write logs to CloudWatch
   - Actions: CreateLogGroup, CreateLogStream, PutLogEvents

2. **AmazonDynamoDBFullAccess**
   - Purpose: Read/write to Orders and Inventory tables
   - Actions: All DynamoDB operations

3. **AmazonSNSFullAccess**
   - Purpose: Publish messages to OrderEvents-Topic
   - Actions: All SNS operations

4. **AmazonSQSFullAccess**
   - Purpose: Poll messages from EmailQueue and InventoryQueue
   - Actions: All SQS operations

#### Tags:
- Project: OrderProcessing

#### Verification:
- ✅ Role created successfully
- ✅ Trust relationship configured correctly
- ✅ All 4 policies attached
- ✅ Role ARN copied for Lambda function creation

#### Screenshots Taken:
- `iam-role-overview.png` - Role with attached policies
- `iam-trust-relationship.png` - Lambda trust policy
- `iam-permissions-policies.png` - All 4 policies listed

---

## Next: Story 4.1 - Create OrderReceiver Lambda
**Estimated Time:** 30 minutes
**Prerequisites:** IAM role created, DynamoDB tables ready
