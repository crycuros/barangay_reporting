export function normalizeAnnouncementImage(value: unknown): string | null {
  if (!value) return null

  const asString = (() => {
    if (typeof value === "string") return value.trim()
    if (Buffer.isBuffer(value)) return value.toString("utf8").trim()
    return ""
  })()

  if (!asString) return null

  if (asString.startsWith("http://") || asString.startsWith("https://") || asString.startsWith("/")) {
    return asString
  }

  if (asString.startsWith("data:image/")) {
    const compact = asString.replace(/\s+/g, "")

    // Valid data URL with base64 payload.
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(compact)) {
      return compact
    }

    // Repair malformed `data:image/...;base64<raw>` (missing comma).
    const missingComma = compact.match(/^data:image\/([a-zA-Z0-9.+-]+);base64([A-Za-z0-9+/=]+)$/)
    if (missingComma) {
      return `data:image/${missingComma[1]};base64,${missingComma[2]}`
    }

    // Invalid data URL (e.g. `data:image/png;`) should not be rendered.
    return null
  }

  // If DB contains raw/base64 image content without a data URL prefix.
  const compact = asString.replace(/\s+/g, "")
  const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 100
  if (looksLikeBase64) {
    return `data:image/jpeg;base64,${compact}`
  }

  return null
}
