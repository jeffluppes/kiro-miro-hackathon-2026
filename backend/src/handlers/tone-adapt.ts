import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { invokeModel } from '../services/bedrock';

const SYSTEM_PROMPT = `Je bent een communicatie-expert die berichten herschrijft voor verschillende doelgroepen in een schoolcontext over pestincidenten.

Regels per doelgroep:
- "leerling": Gebruik eenvoudige taal, wees warm en geruststellend. Vermijd juridisch jargon. Spreek het kind direct aan met "je/jij".
- "ouder": Wees professioneel maar empathisch. Gebruik "u". Geef duidelijke informatie over wat er gebeurt en wat de volgende stappen zijn.
- "intern" (collega's): Wees zakelijk en beknopt. Gebruik professionele terminologie. Focus op feiten en acties.

Herschrijf het bericht voor de opgegeven doelgroep. Behoud de kernboodschap maar pas toon, woordkeuze en complexiteit aan.

Antwoord ALLEEN met het herschreven bericht, geen uitleg of metadata.`;

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
    const { text, recipient } = body;

    if (!text || !recipient) {
      return response(400, { error: 'text en recipient zijn verplicht' });
    }

    if (!['leerling', 'ouder', 'intern'].includes(recipient)) {
      return response(400, { error: 'recipient moet leerling, ouder, of intern zijn' });
    }

    const prompt = `Herschrijf het volgende bericht voor doelgroep "${recipient}":

"${text}"`;

    const adaptedText = await invokeModel(SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);

    return response(200, {
      original: text,
      adapted: adaptedText.trim(),
      recipient,
    });
  } catch (err) {
    console.error('Tone adapt handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
