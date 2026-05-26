import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const TABLE = process.env.EVIDENCE_TABLE!;
const BUCKET = process.env.EVIDENCE_BUCKET!;

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
  const path = event.resource;

  try {
    // POST /api/evidence/upload-url — get presigned URL for direct S3 upload
    if (method === 'POST' && path.includes('upload-url')) {
      const body = JSON.parse(event.body || '{}');
      const key = `evidence/${body.dossierId}/${Date.now()}-${body.filename}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: body.contentType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

      return response(200, { uploadUrl, s3Key: key });
    }

    // POST /api/evidence/{dossierId} — save evidence metadata
    if (method === 'POST' && dossierId) {
      const body = JSON.parse(event.body || '{}');
      const item = {
        dossierId,
        evidenceId: `EV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: body.type || 'bestand',
        s3Key: body.s3Key || null,
        note: body.note || null,
        uploadedBy: body.uploadedBy || 'anonymous',
        uploadedAt: new Date().toISOString(),
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return response(201, item);
    }

    // GET /api/evidence/{dossierId} — list evidence for a dossier
    if (method === 'GET' && dossierId) {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'dossierId = :did',
        ExpressionAttributeValues: { ':did': dossierId },
      }));
      return response(200, { evidence: result.Items || [] });
    }

    return response(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Evidence handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
