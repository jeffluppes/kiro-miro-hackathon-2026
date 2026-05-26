import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { invokeModel } from '../services/bedrock';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.CHECKLIST_TABLE!;

const SYSTEM_PROMPT = `Je bent een expert in Nederlandse schoolveiligheid en anti-pestprocedures.

Genereer een checklist van concrete stappen die een docent moet nemen voor een pestdossier.
Baseer je op:
- WPO (Wet primair onderwijs) artikel 4c: verplichting sociale veiligheid
- Onderwijsinspectie monitoringseisen
- Stichting School & Veiligheid protocollen

Geef de checklist als JSON array met objecten: [{"text": "stap beschrijving", "legalReference": "WPO art. X" of null}]

Pas de checklist aan op basis van de ernst:
- mild: 4-5 stappen, focus op gesprek en monitoring
- prolonged: 6-8 stappen, inclusief oudercontact en registratie
- severe: 8-10 stappen, inclusief vertrouwensinspecteur en externe hulp

Antwoord ALLEEN met de JSON array, geen andere tekst.`;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

const FALLBACK_CHECKLIST = [
  { text: 'Gesprek voeren met het kind dat gepest wordt', legalReference: null },
  { text: 'Incident documenteren in het dossier', legalReference: 'WPO art. 4c' },
  { text: 'Ouders/verzorgers informeren', legalReference: null },
  { text: 'Anti-pestprotocol van de school raadplegen', legalReference: null },
  { text: 'Monitoring inplannen (2 weken)', legalReference: 'Onderwijsinspectie' },
];

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { dossierId, description, severity } = body;

    if (!dossierId) {
      return response(400, { error: 'dossierId is verplicht' });
    }

    // Check if checklist already exists
    const existing = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'dossierId = :did',
      ExpressionAttributeValues: { ':did': dossierId },
    }));

    if (existing.Items && existing.Items.length > 0) {
      return response(200, { checklist: existing.Items });
    }

    // Generate checklist via Bedrock
    let checklist: Array<{ text: string; legalReference: string | null }>;
    try {
      const prompt = `Genereer een checklist voor een pestdossier.
Ernst: ${severity || 'mild'}
Beschrijving: ${description || 'Geen beschrijving beschikbaar'}`;

      const aiResponse = await invokeModel(SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);
      checklist = JSON.parse(aiResponse);
    } catch {
      // Fallback to static checklist if Bedrock fails
      checklist = FALLBACK_CHECKLIST;
    }

    // Save checklist items to DynamoDB
    const items = checklist.map((item, index) => ({
      dossierId,
      order: index + 1,
      text: item.text,
      legalReference: item.legalReference,
      done: false,
    }));

    for (const item of items) {
      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    }

    return response(201, { checklist: items });
  } catch (err) {
    console.error('Checklist handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
