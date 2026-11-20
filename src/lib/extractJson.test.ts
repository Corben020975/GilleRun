import { describe, expect, it } from 'vitest'
import { extractJsonObject } from './extractJson'

describe('extractJsonObject', () => {
  it('extrait depuis un fence markdown', () => {
    const raw = 'Voici\n```json\n{"a":1,}\n```\nfin'
    expect(extractJsonObject(raw)).toEqual({ a: 1 })
  })
  it('tolère le texte autour et trailing commas', () => {
    const raw = `Export:
{
  "x": true,
  "y": [1,2,],
}
ok`
    expect(extractJsonObject(raw)).toEqual({ x: true, y: [1, 2] })
  })
})
