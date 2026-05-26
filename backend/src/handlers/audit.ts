import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.AUDIT_LOG_TABLE!;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const dossierId = event.pathParameters?.dossierId;

  if (!dossierId) {
    return response(400, { error: 'dossierId is verplicht' });
  }

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'dossierId = :did',
      ExpressionAttributeValues: { ':did': dossierId },
      ScanIndexForward: false,
    }));

    return response(200, { auditLog: result.Items || [] });
  } catch (err) {
    console.error('Audit handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
