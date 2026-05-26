import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { invokeModel, Message } from '../services/bedrock';
import { detectCrisis } from '../services/crisis';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.HELPLINE_TABLE!;

const SYSTEM_PROMPT = `Je bent de SchoolGuard Hulplijn, een AI-assistent die kinderen, ouders en docenten ondersteunt bij pestproblemen op school.

Je rol:
- Luister empathisch en stel open vragen
- Detecteer signalen van langdurig psychologisch pesten
- Help gebruikers om een melding te doen als dat nodig is
- Verwijs naar relevante hulpbronnen (Kindertelefoon, Stop Pesten Nu, etc.)
- Spreek in eenvoudig, begrijpelijk Nederlands

Belangrijk:
- Als je signalen van acuut gevaar of zelfbeschadiging detecteert, geef dan ONMIDDELLIJK de crisiscontacten: 113 Zelfmoordpreventie (0900-0113) en Kindertelefoon (0800-0432)
- Markeer in je antwoord als je een pestsignaal detecteert met [SIGNAAL_GEDETECTEERD]
- Markeer in je antwoord als je een crisissituatie detecteert met [CRISIS_GEDETECTEERD]

Je bent GEEN therapeut. Je biedt eerste opvang en verwijst door naar professionals.`;

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
    const conversationId = body.conversationId || `CONV-${Date.now()}`;
    const userMessage = body.message;

    if (!userMessage) {
      return response(400, { error: 'Bericht is verplicht' });
    }

    // Get existing conversation or start new
    let conversation: { messages: Message[]; signalDetected: boolean; crisisDetected: boolean };
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { conversationId },
    }));

    if (existing.Item) {
      conversation = {
        messages: existing.Item.messages || [],
        signalDetected: existing.Item.signalDetected || false,
        crisisDetected: existing.Item.crisisDetected || false,
      };
    } else {
      conversation = { messages: [], signalDetected: false, crisisDetected: false };
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: userMessage });

    // Check for crisis keywords (fast fallback)
    const crisisFromKeywords = detectCrisis(userMessage);

    // Invoke Bedrock
    const aiResponse = await invokeModel(SYSTEM_PROMPT, conversation.messages);

    // Detect signals from AI response
    const signalDetected = conversation.signalDetected || aiResponse.includes('[SIGNAAL_GEDETECTEERD]');
    const crisisDetected = conversation.crisisDetected || crisisFromKeywords || aiResponse.includes('[CRISIS_GEDETECTEERD]');

    // Clean markers from response shown to user
    const cleanResponse = aiResponse
      .replace(/\[SIGNAAL_GEDETECTEERD\]/g, '')
      .replace(/\[CRISIS_GEDETECTEERD\]/g, '')
      .trim();

    // Add assistant message
    conversation.messages.push({ role: 'assistant', content: cleanResponse });

    // Save conversation
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        conversationId,
        userId: body.userId || 'anonymous',
        messages: conversation.messages,
        linkedDossierId: body.linkedDossierId || null,
        signalDetected,
        crisisDetected,
        updatedAt: new Date().toISOString(),
      },
    }));

    return response(200, {
      conversationId,
      response: cleanResponse,
      signalDetected,
      crisisDetected,
      crisisResources: crisisDetected ? {
        message: 'Als je in nood bent, neem direct contact op:',
        resources: [
          { name: '113 Zelfmoordpreventie', phone: '0900-0113', website: 'https://www.113.nl' },
          { name: 'Kindertelefoon', phone: '0800-0432', website: 'https://www.kindertelefoon.nl' },
        ],
      } : null,
    });
  } catch (err) {
    console.error('Helpline handler error:', err);
    return response(500, { error: 'Interne serverfout' });
  }
}
