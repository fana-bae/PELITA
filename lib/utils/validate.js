/**
 * Pelita — Input Validation Utilities
 *
 * Semua input dari user WAJIB divalidasi di server sebelum diproses.
 * Jangan pernah percaya data yang datang dari client.
 */

// ── Custom error untuk validasi ──────────────────────────────
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.isValidation = true
  }
}

// ── NIS (Nomor Induk Santri) ──────────────────────────────────
/**
 * Validasi NIS: diawali A (laki-laki) atau B (perempuan),
 * diikuti 3-14 angka. Unik per santri.
 * Contoh: A20240001, B20240002
 */
export function assertNIS(value) {
  if (!value) throw new ValidationError('NIS tidak boleh kosong')
  const nis = String(value).trim().toUpperCase()
  if (!/^[AB]\d{3,14}$/.test(nis)) {
    throw new ValidationError('NIS tidak valid (contoh: A20240001 atau B20240002)')
  }
  return nis
}

/**
 * Konversi NIS → synthetic email untuk Supabase Auth.
 * Email ini tidak pernah dipakai sungguhan — hanya identifier internal.
 */
export function nisToEmail(nis) {
  return `${nis.toLowerCase()}@example.com`
}

// ── Sanitize string ──────────────────────────────────────────
/**
 * Bersihkan string dari karakter berbahaya dan batasi panjangnya.
 * - Strip tag HTML
 * - Trim whitespace
 * - Batasi panjang karakter
 */
export function sanitizeText(value, { maxLength = 255, fieldName = 'Field', required = true } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) throw new ValidationError(`${fieldName} tidak boleh kosong`)
    return null
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} harus berupa teks`)
  }

  // Strip HTML tags untuk cegah XSS
  const stripped = value.replace(/<[^>]*>/g, '').trim()

  if (required && stripped.length === 0) {
    throw new ValidationError(`${fieldName} tidak boleh kosong`)
  }

  if (stripped.length > maxLength) {
    throw new ValidationError(`${fieldName} maksimal ${maxLength} karakter`)
  }

  return stripped || null
}

// ── Validasi nilai enum ───────────────────────────────────────
/**
 * Pastikan nilai ada dalam daftar yang diizinkan (whitelist).
 */
export function assertEnum(value, allowed, fieldName = 'Field') {
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `${fieldName} tidak valid. Nilai yang diizinkan: ${allowed.join(', ')}`
    )
  }
  return value
}

// ── Validasi angka positif ────────────────────────────────────
/**
 * Pastikan nilai adalah angka positif dalam rentang yang ditentukan.
 */
export function assertPositiveNumber(value, { max = 999_999_999_999, min = 0.01, fieldName = 'Angka' } = {}) {
  const num = Number(value)

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} harus berupa angka`)
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} harus lebih dari ${min}`)
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} tidak boleh lebih dari ${max.toLocaleString('id-ID')}`)
  }

  return num
}

// ── Validasi format tanggal ───────────────────────────────────
/**
 * Pastikan format tanggal adalah YYYY-MM-DD yang valid.
 */
export function assertDate(value, fieldName = 'Tanggal', required = false) {
  if (!value) {
    if (required) throw new ValidationError(`${fieldName} tidak boleh kosong`)
    return null
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    throw new ValidationError(`${fieldName} format tidak valid (gunakan YYYY-MM-DD)`)
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} bukan tanggal yang valid`)
  }

  return value
}

// ── Validasi format waktu ─────────────────────────────────────
/**
 * Pastikan format waktu adalah HH:MM yang valid.
 */
export function assertTime(value, fieldName = 'Waktu', required = false) {
  if (!value) {
    if (required) throw new ValidationError(`${fieldName} tidak boleh kosong`)
    return null
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRegex.test(value)) {
    throw new ValidationError(`${fieldName} format tidak valid (gunakan HH:MM)`)
  }

  return value
}

// ── Validasi boolean ──────────────────────────────────────────
export function assertBoolean(value, fieldName = 'Field') {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} harus bernilai true atau false`)
  }
  return value
}

// ── Whitelist konstanta ───────────────────────────────────────
export const ALLOWED = {
  HABIT_TYPE:      ['good', 'bad'],
  HABIT_CATEGORY:  ['health', 'mind', 'productivity', 'lifestyle', 'finance', 'spiritual', 'other'],
  HABIT_FREQUENCY: ['daily', 'weekly', 'monthly'],
  TASK_PRIORITY:   ['high', 'medium', 'low'],
  TASK_CATEGORY:   ['work', 'personal', 'health', 'finance', 'study', 'other'],
  TX_TYPE:         ['income', 'expense'],
  TX_CATEGORY:     ['needs', 'debt', 'charity', 'savings', 'other'],
}
