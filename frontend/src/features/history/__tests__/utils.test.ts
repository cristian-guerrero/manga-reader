import { formatDate, getProgress } from '../utils'
import type { HistoryEntry } from '../types'

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: '1',
  folderPath: '/test/path',
  folderName: 'Test',
  lastImage: 'img_001.jpg',
  lastImageIndex: 4,
  scrollPosition: 0,
  totalImages: 10,
  lastRead: new Date().toISOString(),
  ...overrides,
})

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const dateStr = '2024-01-15T10:30:00Z'
    const result = formatDate(dateStr)
    expect(result).toContain('2024')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  it('returns "Invalid Date" for invalid date strings', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('Invalid Date')
  })
})

describe('getProgress', () => {
  it('returns 0 for zero total images', () => {
    const entry = makeEntry({ totalImages: 0, lastImageIndex: 0 })
    expect(getProgress(entry)).toBe(0)
  })

  it('calculates correct percentage', () => {
    const entry = makeEntry({ lastImageIndex: 4, totalImages: 10 })
    expect(getProgress(entry)).toBe(50)
  })

  it('returns 100 for completed', () => {
    const entry = makeEntry({ lastImageIndex: 9, totalImages: 10 })
    expect(getProgress(entry)).toBe(100)
  })

  it('rounds to integer', () => {
    const entry = makeEntry({ lastImageIndex: 0, totalImages: 3 })
    expect(getProgress(entry)).toBe(33)
  })
})
