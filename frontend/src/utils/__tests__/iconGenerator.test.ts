import { generateThemedIcon } from '../iconGenerator'
import { darkTheme } from '../../themes'

class MockPath2D {
  addPath: ReturnType<typeof vi.fn>
  constructor() {
    this.addPath = vi.fn()
  }
}

describe('generateThemedIcon', () => {
  beforeAll(() => {
    globalThis.Path2D = MockPath2D as unknown as typeof Path2D
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            createLinearGradient: vi.fn().mockReturnValue({
              addColorStop: vi.fn(),
            }),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            restore: vi.fn(),
            fillStyle: '',
          }),
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
        }
      }
      return document.createElement(tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a data URL from canvas', async () => {
    const result = await generateThemedIcon(darkTheme)
    expect(result).toBe('data:image/png;base64,mock')
  })

  it('returns empty string when canvas context is null', async () => {
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(null),
          toDataURL: vi.fn(),
        }
      }
      return document.createElement(tag)
    })

    const result = await generateThemedIcon(darkTheme)
    expect(result).toBe('')
  })
})
