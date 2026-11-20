/**
 * Extrait un objet JSON depuis un blob Coach 51 (markdown, texte autour, trailing commas).
 */
export function extractJsonObject(raw: string): unknown {
  let text = raw.trim()
  if (!text) throw new Error('Colle d’abord le JSON envoyé par Coach 51.')

  // Fence markdown ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) text = fence[1].trim()

  // Cherche le premier { ... } équilibré
  const start = text.indexOf('{')
  if (start < 0) throw new Error('Aucun objet JSON trouvé.')
  let depth = 0
  let inStr = false
  let esc = false
  let end = -1
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) throw new Error('JSON incomplet.')

  let slice = text.slice(start, end + 1)
  // Virgules finales : , ] ou , }
  slice = slice.replace(/,\s*([\]}])/g, '$1')

  try {
    return JSON.parse(slice)
  } catch {
    throw new Error('JSON invalide — demande à Coach 51 un export Arena 51.')
  }
}
