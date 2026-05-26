import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Dossier, DossierStatus } from '../models/Dossier';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DOSSIERS_TABLE!;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const dossierId = event.pathParameters?.dossierId;

  try {
    // GET /api/dossiers/{dossierId}
    if (method === 'GET' && dossierId) {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { dossierId },
      }));
      if (!result.Item) {
        return response(404, { error: 'Dossier niet gevonden' });
      }
      return response(200, result.Item);
    }

    // GET /api/dossiers?teacherId=xxx
    if (method === 'GET' && !dossierId) {
      const teacherId = event.queryStringParameters?.teacherId;
      if (teacherId) {
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'teacherId-index',
          KeyConditionExpression: 'teacherId = :tid',
          ExpressionAttributeValues: { ':tid': teacherId },
          ScanIndexForward: false,
        }));
        return response(200, { dossiers: result.Items || [] });
      }
      // List all (for PoC)
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'status-index',
        KeyConditionExpression: '#s = :status',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':status': 'melding' },
        ScanIndexForward: false,
      }));
      return response(200, { dossiers: result.Items || [] });
    }

    // POST /api/dossiers
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();
      const dossier: Dossier = {
        dossierId: `DOS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        teacherId: body.teacherId,
        studentId: body.studentId,
        status: 'melding',
        priority: body.priority || 'gemiddeld',
        severity: body.severity || 'mild',
        incidentType: body.incidentType || 'pesten',
        description: body.description || '',
        createdAt: now,
        updatedAt: now,
      };

      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: dossier,
      }));

      return response(201, dossier);
    }

    // PUT /api/dossiers/{dossierId}
    if (method === 'PUT' && dossierId) {
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();

      const updateExpressions: string[] = ['#updatedAt = :now'];
      const expressionNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
      const expressionValues: Record<string, unknown> = { ':now': now };

      if (body.status) {
        updateExpressions.push('#status = :status');
        expressionNames['#status'] = 'status';
        expressionValues[':status'] = body.status as DossierStatus;
      }
      if (body.priority) {
        updateExpressions.push('priority = :priority');
        expressionValues[':priority'] = body.priority;
      }
      if (body.teacherId) {
        updateExpressions.push('teacherId = :teacherId');
        expressionValues[':teacherId'] = body.teacherId;
      }
      if (body.severity) {
        updateExpressions.push('severity = :severity');
        expressionValues[':severity'] = body.severity;
      }

      const result = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { dossierId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      }));

      return response(200, result.Attributes);
    }

    return response(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Dossiers handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
