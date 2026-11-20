/** Nettoie les noms d'exercices pour le TTS. */
export function sanitizeForTts(input: string): string {
  let s = input
  s = s.replace(/@\s*(\d+(?:[.,]\d+)?)\s*kg?/gi, '$1 kilos')
  s = s.replace(/@\s*(\d+(?:[.,]\d+)?)/gi, '$1 kilos')
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*kg\b/gi, '$1 kilos')
  s = s.replace(/\bKB\b/gi, 'kettlebell')
  s = s.replace(/\bDB\b/gi, 'haltères')
  s = s.replace(/\bPDC\b/gi, 'poids du corps')
  s = s.replace(/\bEMOM\b/gi, 'E M O M')
  s = s.replace(/\bAMRAP\b/gi, 'A M R A P')
  s = s.replace(/\b2×/gi, 'double ')
  s = s.replace(/\b2x/gi, 'double ')
  return s.replace(/\s+/g, ' ').trim()
}
