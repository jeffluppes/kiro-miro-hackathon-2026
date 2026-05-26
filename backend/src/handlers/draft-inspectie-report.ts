import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { invokeModel } from '../services/bedrock';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const DOSSIERS_TABLE = process.env.DOSSIERS_TABLE!;

const SYSTEM_PROMPT = `Je bent een expert in het opstellen van meldingen voor de Onderwijsinspectie (vertrouwensinspecteur) in Nederland.

Stel een conceptmelding op op basis van de dossiergegevens. De melding moet bevatten:
1. Samenvatting van het incident
2. Duur en ernst van het pesten
3. Betrokken partijen (geanonimiseerd)
4. Genomen acties door de school
5. Reden voor melding bij de Inspectie
6. Verwijzing naar relevante wetgeving (WPO art. 4c)

Schrijf in formeel Nederlands, geschikt voor officiële communicatie met de Onderwijsinspectie.
Gebruik de structuur die de vertrouwensinspecteur verwacht.`;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { dossierId } = body;

    if (!dossierId) {
      return response(400, { error: 'dossierId is verplicht' });
    }

    // Fetch dossier details
    const dossierResult = await ddb.send(new GetCommand({
      TableName: DOSSIERS_TABLE,
      Key: { dossierId },
    }));

    if (!dossierResult.Item) {
      return response(404, { error: 'Dossier niet gevonden' });
    }

    const dossier = dossierResult.Item;

    const prompt = `Stel een melding op voor de vertrouwensinspecteur op basis van dit dossier:

Type incident: ${dossier.incidentType}
Ernst: ${dossier.severity}
Beschrijving: ${dossier.description}
Status: ${dossier.status}
Aangemaakt: ${dossier.createdAt}
Prioriteit: ${dossier.priority}`;

    const report = await invokeModel(SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);

    return response(200, {
      dossierId,
      report: report.trim(),
      generatedAt: new Date().toISOString(),
      disclaimer: 'Dit is een conceptmelding. Controleer de inhoud voordat u deze indient bij de Onderwijsinspectie.',
    });
  } catch (err) {
    console.error('Inspectie report handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
