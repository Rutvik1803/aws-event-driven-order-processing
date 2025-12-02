/**
 * PaymentHandler Lambda Function
 *
 * Purpose: Handle Stripe webhook events for payment completion
 * - Verify webhook signature (security)
 * - Update order status to COMPLETED
 * - Publish ORDER_COMPLETED event to SNS
 * - Trigger email notifications and inventory updates
 *
 * Trigger: API Gateway POST /webhooks/stripe (from Stripe)
 * Input: Stripe webhook event (payment_intent.succeeded)
 * Output: { received: true }
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const Stripe = require('stripe');

// Initialize AWS SDK v3 clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Environment variables
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const ORDER_EVENTS_TOPIC_ARN = process.env.ORDER_EVENTS_TOPIC_ARN;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('PaymentHandler invoked');

  try {
    // Get Stripe signature from headers
    const signature =
      event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

    if (!signature) {
      console.error('Missing Stripe signature header');
      return createResponse(400, { error: 'Missing signature' });
    }

    // Step 1: Verify webhook signature (CRITICAL for security)
    console.log('Step 1: Verifying Stripe webhook signature');
    let stripeEvent;

    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
      console.log('Webhook signature verified successfully');
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return createResponse(400, { error: 'Invalid signature' });
    }

    console.log('Webhook event type:', stripeEvent.type);

    // Step 2: Handle payment_intent.succeeded event
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      console.log('Payment succeeded for:', paymentIntent.id);

      await handlePaymentSuccess(paymentIntent);
    } else {
      console.log('Ignoring event type:', stripeEvent.type);
    }

    // Step 3: Return 200 to acknowledge receipt (Stripe retries if not 200)
    return createResponse(200, { received: true });
  } catch (error) {
    console.error('Error in PaymentHandler:', error);

    // Still return 200 to prevent Stripe retries for application errors
    return createResponse(200, { received: true, error: error.message });
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent) {
  try {
    const paymentIntentId = paymentIntent.id;
    const userId = paymentIntent.metadata.userId;

    console.log('Processing payment success:', {
      paymentIntentId,
      userId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });

    // Step 1: Find order by paymentIntentId
    // Note: In production, use GSI (Global Secondary Index) for efficient query
    // For now, we'll scan (not optimal but works for learning)
    const order = await findOrderByPaymentIntent(paymentIntentId);

    if (!order) {
      console.error('Order not found for paymentIntentId:', paymentIntentId);
      throw new Error('Order not found');
    }

    console.log('Found order:', order.orderId);

    // Step 2: Update order status to COMPLETED
    console.log('Updating order status to COMPLETED');
    const timestamp = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId: order.orderId },
        UpdateExpression:
          'SET #status = :completed, updatedAt = :timestamp, paidAt = :timestamp',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':completed': 'COMPLETED',
          ':timestamp': timestamp,
        },
      })
    );

    console.log('Order status updated successfully');

    // Step 3: Publish ORDER_COMPLETED event to SNS
    console.log('Publishing ORDER_COMPLETED event to SNS');

    const snsMessage = {
      eventType: 'ORDER_COMPLETED',
      orderId: order.orderId,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentIntentId: paymentIntentId,
      completedAt: timestamp,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: ORDER_EVENTS_TOPIC_ARN,
        Message: JSON.stringify(snsMessage),
        Subject: 'Order Completed',
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'ORDER_COMPLETED',
          },
          orderId: {
            DataType: 'String',
            StringValue: order.orderId,
          },
        },
      })
    );

    console.log('SNS event published successfully');
    console.log('Payment processing complete for order:', order.orderId);
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Find order by paymentIntentId
 * Note: In production, create a GSI on paymentIntentId for efficient queries
 */
async function findOrderByPaymentIntent(paymentIntentId) {
  try {
    // For learning purposes, we'll scan the table
    // In production: Use GSI (Global Secondary Index) on paymentIntentId

    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

    const response = await docClient.send(
      new ScanCommand({
        TableName: ORDERS_TABLE,
        FilterExpression: 'paymentIntentId = :piId',
        ExpressionAttributeValues: {
          ':piId': paymentIntentId,
        },
        Limit: 1,
      })
    );

    if (response.Items && response.Items.length > 0) {
      return response.Items[0];
    }

    return null;
  } catch (error) {
    console.error('Error finding order:', error);
    throw error;
  }
}

/**
 * Create API Gateway response
 */
function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
