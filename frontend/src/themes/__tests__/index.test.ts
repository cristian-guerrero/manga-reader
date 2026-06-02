import {
  adjustColorBrightness,
  hexToRgba,
  getThemeById,
  parseCustomTheme,
  builtInThemes,
  darkTheme,
  lightTheme,
  applyTheme,
} from '../index'

vi.mock('../../utils/iconGenerator', () => ({
  generateThemedIcon: vi.fn(() => Promise.resolve('data:image/png;base64,icon')),
}))

vi.mock('../../services/api/appAPI', () => ({
  AppAPI: {
    updateTaskbarIcon: vi.fn(() => Promise.resolve()),
  },
}))

describe('adjustColorBrightness', () => {
  it('lightens a color', () => {
    const result = adjustColorBrightness('#8b5cf6', 15)
    expect(result).toBe('#9c74f7')
  })

  it('darkens a color', () => {
    const result = adjustColorBrightness('#8b5cf6', -15)
    expect(result).toBe('#7943f4')
  })

  it('handles 3-char hex', () => {
    const result = adjustColorBrightness('#fff', -10)
    expect(result).toBe('#fefefe')
  })

  it('handles hex with hash', () => {
    const result = adjustColorBrightness('#8b5cf6', 0)
    expect(result).toBe('#8b5cf6')
  })

  it('handles hex without hash', () => {
    const result = adjustColorBrightness('8b5cf6', 0)
    expect(result).toBe('#8b5cf6')
  })

  it('handles -100% brightness (approach black)', () => {
    const result = adjustColorBrightness('#ffffff', -100)
    expect(result).toBe('#fefefe')
  })

  it('handles +100% brightness (approach white from black)', () => {
    const result = adjustColorBrightness('#000000', 100)
    expect(result).toBe('#000000')
  })
})

describe('hexToRgba', () => {
  it('converts hex to rgba', () => {
    const result = hexToRgba('#8b5cf6', 0.5)
    expect(result).toBe('rgba(139, 92, 246, 0.5)')
  })

  it('handles 3-char hex', () => {
    const result = hexToRgba('#fff', 0.8)
    expect(result).toBe('rgba(255, 255, 255, 0.8)')
  })

  it('handles hex without hash', () => {
    const result = hexToRgba('ff0000', 1)
    expect(result).toBe('rgba(255, 0, 0, 1)')
  })
})

describe('getThemeById', () => {
  it('returns dark theme', () => {
    const theme = getThemeById('dark')
    expect(theme).toEqual(darkTheme)
  })

  it('returns light theme', () => {
    const theme = getThemeById('light')
    expect(theme).toEqual(lightTheme)
  })

  it('returns undefined for unknown theme', () => {
    const theme = getThemeById('nonexistent')
    expect(theme).toBeUndefined()
  })
})

describe('parseCustomTheme', () => {
  it('parses valid JSON theme', () => {
    const json = JSON.stringify({
      id: 'custom',
      name: 'Custom',
      isDark: true,
      colors: {
        accent: '#000',
        accentHover: '#111',
        accentGlow: 'rgba(0,0,0,0.5)',
        surfacePrimary: '#000',
        surfaceSecondary: '#111',
        surfaceTertiary: '#222',
        surfaceElevated: '#333',
        surfaceOverlay: 'rgba(0,0,0,0.9)',
        titlebarBg: '#111',
        titlebarText: '#fff',
        textPrimary: '#fff',
        textSecondary: '#ccc',
        textMuted: '#999',
        textDisabled: '#666',
        border: '#333',
        borderHover: '#444',
        borderFocus: '#555',
      },
    })
    const result = parseCustomTheme(json)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('custom')
    expect(result!.name).toBe('Custom')
    expect(result!.isDark).toBe(true)
  })

  it('returns null for invalid JSON', () => {
    expect(parseCustomTheme('not json')).toBeNull()
  })

  it('returns null for missing required fields', () => {
    const json = JSON.stringify({ id: 'custom' })
    expect(parseCustomTheme(json)).toBeNull()
  })

  it('returns parsed theme even with string colors (no deep validation)', () => {
    const json = JSON.stringify({
      id: 'custom',
      name: 'Custom',
      isDark: true,
      colors: 'not-an-object',
    })
    const result = parseCustomTheme(json)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('custom')
  })
})

describe('builtInThemes', () => {
  it('has 13 themes', () => {
    expect(builtInThemes).toHaveLength(13)
  })

  it('each theme has required fields', () => {
    for (const theme of builtInThemes) {
      expect(theme.id).toBeDefined()
      expect(theme.name).toBeDefined()
      expect(typeof theme.isDark).toBe('boolean')
      expect(theme.colors.accent).toBeDefined()
      expect(theme.colors.surfacePrimary).toBeDefined()
      expect(theme.colors.textPrimary).toBeDefined()
    }
  })

  it('has unique IDs', () => {
    const ids = builtInThemes.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-id')
    vi.clearAllMocks()
  })

  it('sets data-theme and data-theme-id attributes', async () => {
    await applyTheme(darkTheme)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme-id')).toBe(darkTheme.id)
  })

  it('sets color-scheme to light for light themes', async () => {
    await applyTheme(lightTheme)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('sets color-scheme to dark for dark themes', async () => {
    await applyTheme(darkTheme)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('applies CSS custom properties from theme colors', async () => {
    await applyTheme(darkTheme)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--color-accent')).toBe(darkTheme.colors.accent)
    expect(root.style.getPropertyValue('--color-surface-primary')).toBe(darkTheme.colors.surfacePrimary)
    expect(root.style.getPropertyValue('--color-text-primary')).toBe(darkTheme.colors.textPrimary)
    expect(root.style.getPropertyValue('--color-border')).toBe(darkTheme.colors.border)
    expect(root.style.getPropertyValue('--color-titlebar-bg')).toBe(darkTheme.colors.titlebarBg)
  })

  it('applies gradient variables', async () => {
    await applyTheme(darkTheme)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--gradient-accent')).toContain(darkTheme.colors.accent)
    expect(root.style.getPropertyValue('--gradient-glow')).toContain('radial-gradient')
  })

  it('overrides accent color when customAccentColor is provided', async () => {
    const customAccent = '#ff0000'
    await applyTheme(darkTheme, customAccent)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--color-accent')).toBe(customAccent)
    expect(root.style.getPropertyValue('--color-accent-hover')).not.toBe(darkTheme.colors.accentHover)
  })

  it('calls generateThemedIcon and updateTaskbarIcon', async () => {
    const { generateThemedIcon } = await import('../../utils/iconGenerator')
    const { AppAPI } = await import('../../services/api/appAPI')
    await applyTheme(darkTheme)
    expect(generateThemedIcon).toHaveBeenCalled()
    expect(AppAPI.updateTaskbarIcon).toHaveBeenCalledWith('data:image/png;base64,icon')
  })

  it('does not throw when updateTaskbarIcon fails', async () => {
    const { AppAPI } = await import('../../services/api/appAPI')
    vi.mocked(AppAPI.updateTaskbarIcon).mockRejectedValueOnce(new Error('icon error'))
    await expect(applyTheme(darkTheme)).resolves.toBeUndefined()
  })
})
