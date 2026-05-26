import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.MESSAGES_TABLE!;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const dossierId = event.pathParameters?.dossierId;
  const channel = event.pathParameters?.channel;

  if (!dossierId || !channel) {
    return response(400, { error: 'dossierId en channel zijn verplicht' });
  }

  const dossierChannel = `${dossierId}#${channel}`;

  try {
    // GET /api/messages/{dossierId}/{channel}
    if (method === 'GET') {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'dossierChannel = :dc',
        ExpressionAttributeValues: { ':dc': dossierChannel },
        ScanIndexForward: true,
      }));
      return response(200, { messages: result.Items || [] });
    }

    // POST /api/messages/{dossierId}/{channel}
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const item = {
        dossierChannel,
        timestamp: new Date().toISOString(),
        dossierId,
        channel,
        direction: body.direction || 'outbound',
        originalText: body.text || '',
        adaptedText: body.adaptedText || null,
        sentBy: body.sentBy || 'docent',
        readAt: null,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return response(201, item);
    }

    return response(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Messages handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
