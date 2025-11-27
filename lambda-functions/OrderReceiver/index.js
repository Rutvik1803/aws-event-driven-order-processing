/**
 * OrderReceiver Lambda Function
 *
 * Purpose: Handle incoming order requests
 * - Validate inventory availability
 * - Create Stripe Payment Intent
 * - Save order to DynamoDB
 * - Return client secret for frontend payment
 *
 * Trigger: API Gateway POST /orders
 * Input: { userId, items: [{productId, quantity}] }
 * Output: { orderId, clientSecret, amount }
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  BatchGetCommand,
} = require('@aws-sdk/lib-dynamodb');
const Stripe = require('stripe');

// Initialize AWS SDK v3 clients
const dynamoClient = new DynamoDBClient({
  region: process.env.REGION || 'ap-south-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Initialize Stripe (will be configured via environment variable)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Environment variables
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const INVENTORY_TABLE = process.env.INVENTORY_TABLE;

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log(
    'OrderReceiver invoked with event:',
    JSON.stringify(event, null, 2)
  );

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { userId, items } = body;

    // Validate input
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return createResponse(400, {
        error: 'Invalid request',
        message: 'userId and items array are required',
      });
    }

    // Step 1: Validate inventory availability
    console.log('Step 1: Validating inventory for items:', items);
    const inventoryValidation = await validateInventory(items);

    if (!inventoryValidation.valid) {
      return createResponse(400, {
        error: 'Inventory validation failed',
        message: inventoryValidation.message,
        unavailableItems: inventoryValidation.unavailableItems,
      });
    }

    // Step 2: Calculate total amount
    const { totalAmount, orderItems } = calculateTotal(
      inventoryValidation.products,
      items
    );
    console.log(`Step 2: Total amount calculated: $${totalAmount}`);

    // Step 3: Create Stripe Payment Intent
    console.log('Step 3: Creating Stripe Payment Intent');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Stripe expects cents
      currency: 'usd',
      metadata: {
        userId: userId,
        orderItems: JSON.stringify(orderItems),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Stripe Payment Intent created:', paymentIntent.id);

    // Step 4: Generate orderId and save to DynamoDB
    const orderId = `ORD-${Date.now()}-${userId.substring(0, 5)}`;
    const timestamp = new Date().toISOString();

    const orderRecord = {
      orderId: orderId,
      userId: userId,
      items: orderItems,
      totalAmount: totalAmount,
      status: 'PAYMENT_PENDING',
      paymentIntentId: paymentIntent.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    console.log('Step 4: Saving order to DynamoDB:', orderId);
    await docClient.send(
      new PutCommand({
        TableName: ORDERS_TABLE,
        Item: orderRecord,
      })
    );

    console.log('Order saved successfully');

    // Step 5: Return response with client secret
    return createResponse(200, {
      success: true,
      orderId: orderId,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      message: 'Order created successfully. Complete payment to proceed.',
    });
  } catch (error) {
    console.error('Error in OrderReceiver:', error);

    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

/**
 * Validate inventory availability for requested items
 */
async function validateInventory(items) {
  try {
    const productIds = items.map((item) => item.productId);

    // Batch get all products from Inventory table
    const response = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [INVENTORY_TABLE]: {
            Keys: productIds.map((id) => ({ productId: id })),
          },
        },
      })
    );

    const products = response.Responses[INVENTORY_TABLE] || [];

    // Check if all products exist
    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.productId);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));

      return {
        valid: false,
        message: 'Some products not found',
        unavailableItems: missingIds,
      };
    }

    // Check stock availability
    const unavailableItems = [];

    for (const item of items) {
      const product = products.find((p) => p.productId === item.productId);

      if (product.stock < item.quantity) {
        unavailableItems.push({
          productId: item.productId,
          requested: item.quantity,
          available: product.stock,
        });
      }
    }

    if (unavailableItems.length > 0) {
      return {
        valid: false,
        message: 'Insufficient stock for some items',
        unavailableItems: unavailableItems,
      };
    }

    // All validations passed
    return {
      valid: true,
      products: products,
    };
  } catch (error) {
    console.error('Error validating inventory:', error);
    throw error;
  }
}

/**
 * Calculate total amount and prepare order items
 */
function calculateTotal(products, items) {
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const product = products.find((p) => p.productId === item.productId);
    const itemTotal = product.price * item.quantity;

    totalAmount += itemTotal;

    orderItems.push({
      productId: product.productId,
      name: product.productName,
      price: product.price,
      quantity: item.quantity,
      subtotal: itemTotal,
    });
  }

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    orderItems: orderItems,
  };
}

/**
 * Create API Gateway response
 */
function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CORS for frontend
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
