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
> This tells you exactly which permission is missing
> 
> **7. Test with AWS CLI locally:**
> ```bash
> aws dynamodb put-item \
>   --table-name Orders \
>   --item '{"orderId":{"S":"test"}}'
> ```
> If works locally but not in Lambda: Role issue

---

