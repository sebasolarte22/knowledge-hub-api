import { Transform } from 'class-transformer'
import sanitizeHtml from 'sanitize-html'

/**
 * Strips all HTML tags and dangerous content from a string field.
 * Apply to any DTO field that accepts free text from the user.
 */
export function Sanitize() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim()
  })
}
