import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const DUTCH_RESOURCES = [
  {
    id: 'school-veiligheid',
    name: 'Stichting School & Veiligheid',
    description: 'Anti-pestprotocollen, crisisondersteuning, klasinterventies en sociale veiligheidstraining.',
    website: 'https://www.schoolenveiligheid.nl',
    phone: null,
    audience: 'docent',
    whenToUse: 'Bij het opzetten of verbeteren van anti-pestbeleid op school.',
  },
  {
    id: 'stop-pesten-nu',
    name: 'Stop Pesten Nu',
    description: 'Anti-pesteducatie, meldingsadvies, bewustwordingscampagnes en praktische ondersteuning voor slachtoffers.',
    website: 'https://www.stoppestennu.nl',
    phone: null,
    audience: 'leerling',
    whenToUse: 'Voor informatie over pesten en hoe je het kunt melden.',
  },
  {
    id: 'kindertelefoon',
    name: 'Kindertelefoon',
    description: 'Anonieme ondersteuning voor kinderen en tieners over pesten, eenzaamheid, onveilige thuissituaties en online intimidatie.',
    website: 'https://www.kindertelefoon.nl',
    phone: '0800-0432',
    audience: 'leerling',
    whenToUse: 'Als een kind met iemand wil praten over wat er gebeurt.',
  },
  {
    id: '113-zelfmoordpreventie',
    name: '113 Zelfmoordpreventie',
    description: 'Crisishulp bij mentale nood voor jongeren en volwassenen.',
    website: 'https://www.113.nl',
    phone: '0900-0113',
    audience: 'leerling',
    whenToUse: 'Bij acute nood of zelfbeschadigingsgedachten. ALTIJD direct doorverwijzen.',
  },
  {
    id: 'ouders-onderwijs',
    name: 'Ouders & Onderwijs',
    description: 'Juridische informatie, bemiddeling, communicatieadvies met scholen en escalatieprocedures.',
    website: 'https://www.oudersenonderwijs.nl',
    phone: null,
    audience: 'ouder',
    whenToUse: 'Als ouders hulp nodig hebben bij communicatie met de school of hun rechten willen kennen.',
  },
  {
    id: 'onderwijsinspectie',
    name: 'Onderwijsinspectie',
    description: 'Meldingssystemen, veiligheidskaders, incidentmonitoring en toezicht op sociale veiligheid.',
    website: 'https://www.onderwijsinspectie.nl',
    phone: null,
    audience: 'docent',
    whenToUse: 'Bij ernstige of langdurige pestincidenten die gemeld moeten worden.',
  },
  {
    id: 'expertisepunt-burgerschap',
    name: 'Expertisepunt Burgerschap',
    description: 'Gratis adviseurs voor scholen, beleidsadvies, docentprofessionalisering en curriculumondersteuning.',
    website: 'https://www.expertisepuntburgerschap.nl',
    phone: null,
    audience: 'school',
    whenToUse: 'Voor structurele verbetering van burgerschapsonderwijs en sociale cohesie.',
  },
  {
    id: 'wijkteam',
    name: 'Wijkteam (gemeente)',
    description: 'Jeugdmaatschappelijk werkers, buurtteams, schoolmaatschappelijk werk en doorverwijzing naar GGZ.',
    website: null,
    phone: null,
    audience: 'docent',
    whenToUse: 'Als een leerling extra ondersteuning nodig heeft buiten de school.',
  },
];

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const audience = event.queryStringParameters?.audience;

  let resources = DUTCH_RESOURCES;
  if (audience) {
    resources = resources.filter((r) => r.audience === audience);
  }

  return response(200, { resources });
}
