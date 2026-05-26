/**
 * Keyword-based crisis detection as a fast fallback when Bedrock is unavailable.
 * Detects signals of acute distress, self-harm, or suicidal ideation.
 */

const CRISIS_KEYWORDS_NL = [
  'ik wil niet meer',
  'ik wil dood',
  'zelfmoord',
  'zelfdoding',
  'ik wil mezelf pijn doen',
  'ik snij mezelf',
  'ik haat mezelf',
  'niemand houdt van mij',
  'ik ben beter af dood',
  'het heeft geen zin meer',
  'ik wil verdwijnen',
  'ik kan niet meer',
  'einde maken',
  'pillen slikken',
  'van een brug springen',
];

const CRISIS_KEYWORDS_EN = [
  'i want to die',
  'kill myself',
  'suicide',
  'self-harm',
  'cut myself',
  'end it all',
  'no reason to live',
];

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return [...CRISIS_KEYWORDS_NL, ...CRISIS_KEYWORDS_EN].some(
    (keyword) => lower.includes(keyword)
  );
}
