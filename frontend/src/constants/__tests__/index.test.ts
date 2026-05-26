import { DEBOUNCE_DELAYS, MAIN_PAGES, MAIN_PAGES_TO_SAVE, VIEWER_DEFAULTS } from '../index'

describe('constants', () => {
  describe('DEBOUNCE_DELAYS', () => {
    it('has correct structure', () => {
      expect(DEBOUNCE_DELAYS.TAB_SAVE).toBe(500)
      expect(DEBOUNCE_DELAYS.VIEWER_STATE_SAVE).toBe(500)
      expect(DEBOUNCE_DELAYS.SCROLL_POSITION).toBe(100)
      expect(DEBOUNCE_DELAYS.WINDOW_RESIZE).toBe(200)
      expect(DEBOUNCE_DELAYS.SETTINGS_UPDATE).toBe(500)
    })
  })

  describe('MAIN_PAGES', () => {
    it('contains all navigation pages', () => {
      expect(MAIN_PAGES).toEqual([
        'home', 'explorer', 'history', 'oneShot', 'series',
        'download', 'colorizer', 'settings', 'library-manager',
      ])
    })
  })

  describe('MAIN_PAGES_TO_SAVE', () => {
    it('contains persistable pages', () => {
      expect(MAIN_PAGES_TO_SAVE).toEqual([
        'home', 'oneShot', 'series', 'history', 'download',
        'settings', 'library-manager',
      ])
    })

    it('excludes explorer and colorizer', () => {
      expect(MAIN_PAGES_TO_SAVE).not.toContain('explorer')
      expect(MAIN_PAGES_TO_SAVE).not.toContain('colorizer')
    })
  })

  describe('VIEWER_DEFAULTS', () => {
    it('has correct values', () => {
      expect(VIEWER_DEFAULTS.ZOOM_MIN).toBe(0.1)
      expect(VIEWER_DEFAULTS.ZOOM_MAX).toBe(5)
      expect(VIEWER_DEFAULTS.ZOOM_STEP).toBe(0.25)
      expect(VIEWER_DEFAULTS.VERTICAL_WIDTH_MIN).toBe(10)
      expect(VIEWER_DEFAULTS.VERTICAL_WIDTH_MAX).toBe(100)
    })
  })
})
