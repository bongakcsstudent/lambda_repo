//initia
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const timestream = new AWS.TimestreamWrite();

const LOW_STOCK_THRESHOLD = process.env.LOW_STOCK_THRESHOLD || 10;
const REORDER_QUANTITY = process.env.REORDER_QUANTITY || 400;
const LOW_STOCK_TOPIC_ARN = process.env.LOW_STOCK_TOPIC_ARN;
const PROCUREMENT_TOPIC_ARN = process.env.PROCUREMENT_TOPIC_ARN;
const TIMESTREAM_DATABASE = process.env.TIMESTREAM_DATABASE;
const TIMESTREAM_TABLE = process.env.TIMESTREAM_TABLE;
const PURCHASE_ORDERS_TABLE = process.env.PURCHASE_ORDERS_TABLE;

//AELERT
exports.handler = async (event) => {
    try {
        for (const record of event.Records) {
            if (record.eventName === 'MODIFY') {
                const item = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
                const { idProduct, quantity } = item;
//who is jason
                if (!idProduct || typeof quantity !== 'number') {
                    console.warn(`Invalid item data: ${JSON.stringify(item)}`);
                    continue;
                }

                if (quantity < LOW_STOCK_THRESHOLD) {
                    console.log(`Low stock alert: Product ${idProduct} has only ${quantity} units left.`);
                    await Promise.all([
                        sendLowStockAlert(idProduct, quantity),
                        createPurchaseOrder(idProduct)
                    ]);
                }
//note to self: "pause until done"
                await recordInventoryChange(idProduct, quantity);
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Inventory update processed successfully' })
        };

// catch!
    } catch (error) {
        console.error('Error processing inventory update:', error);
        throw error; 
    }
};

// AELERT
async function sendLowStockAlert(idProduct, quantity) {
    if (!LOW_STOCK_TOPIC_ARN) {
        throw new Error('LOW_STOCK_TOPIC_ARN environment variable is not set');
    }

    const message = {
        productId: idProduct,
        currentQuantity: quantity,
        timestamp: new Date().toISOString(),
        alertType: 'LOW_STOCK'
    };

    const params = {
        Message: JSON.stringify(message),
        TopicArn: LOW_STOCK_TOPIC_ARN
    };

    try {
        await sns.publish(params).promise();
        console.log(`Low stock alert sent for product ${idProduct}`);
    } catch (error) {
        console.error(`Failed to send low stock alert for product ${idProduct}:`, error);
        throw error;
    }
}
// Automated Ordering of medssz

async function createPurchaseOrder(idProduct) {
    if (!PURCHASE_ORDERS_TABLE || !PROCUREMENT_TOPIC_ARN) {
        throw new Error('Required environment variables are not set');
    }

    const orderDetails = {
        idProduct,
        quantity: REORDER_QUANTITY,
        supplier: 'Globo Asiatico',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        orderId: `PO-${Date.now()}-${idProduct}`
    };
    
    try {
        await dynamodb.put({
            TableName: PURCHASE_ORDERS_TABLE,
            Item: orderDetails
        }).promise();
        
        const message = {
            type: 'PURCHASE_ORDER_CREATED',
            orderDetails
        };

        await sns.publish({
            Message: JSON.stringify(message),
            TopicArn: PROCUREMENT_TOPIC_ARN
        }).promise();

        console.log(`Purchase order ${orderDetails.orderId} created successfully`);
    } catch (error) {
        console.error(`Failed to create purchase order for product ${idProduct}:`, error);
        throw error;
    }
}

//accorToSD: Analytics
async function recordInventoryChange(idProduct, quantity) {
    if (!TIMESTREAM_DATABASE || !TIMESTREAM_TABLE) {
        throw new Error('Timestream configuration is missing');
    }

    const currentTime = Date.now().toString();
    const dimensions = [
        { Name: 'idProduct', Value: idProduct.toString() },
        { Name: 'event_type', Value: 'inventory_update' }
    ];
    
    const record = {
        Dimensions: dimensions,
        MeasureName: 'inventory_level',
        MeasureValue: quantity.toString(),
        MeasureValueType: 'DOUBLE',
        Time: currentTime
    };
    
    try {
        const params = {
            DatabaseName: TIMESTREAM_DATABASE,
            TableName: TIMESTREAM_TABLE,
            Records: [record]
        };
        await timestream.writeRecords(params).promise();
        console.log(`Inventory change recorded for product ${idProduct}`);
    } catch (error) {
        console.error(`Failed to record inventory change for product ${idProduct}:`, error);
        throw error;
    }
}
