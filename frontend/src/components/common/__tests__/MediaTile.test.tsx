import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MediaTile } from '../MediaTile'

describe('MediaTile', () => {
  beforeEach(() => {
    const mockObserve = vi.fn()
    const mockDisconnect = vi.fn()
    const mockUnobserve = vi.fn()

    class MockIntersectionObserver {
      constructor() {
        // empty
      }
      observe = mockObserve
      disconnect = mockDisconnect
      unobserve = mockUnobserve
      root = null
      rootMargin = ''
      thresholds = []
      takeRecords = () => []
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the name', () => {
    render(<MediaTile id="test-1" name="Chapter 1" />)
    expect(screen.getByText('Chapter 1')).toBeInTheDocument()
  })

  it('renders thumbnail when provided', () => {
    render(<MediaTile id="test-1" name="Chapter 1" thumbnail="https://example.com/img.jpg" />)
    const img = screen.getByAltText('Chapter 1')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  it('renders fallback icon when no thumbnail', () => {
    const { container } = render(<MediaTile id="test-1" name="Chapter 1" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders custom fallback icon', () => {
    render(<MediaTile id="test-1" name="Chapter 1" fallbackIcon={<span>📁</span>} />)
    expect(screen.getByText('📁')).toBeInTheDocument()
  })

  it('renders badge text', () => {
    render(<MediaTile id="test-1" name="Chapter 1" badgeText="NEW" />)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('renders badge with custom color', () => {
    const { container } = render(
      <MediaTile id="test-1" name="Chapter 1" badgeText="ARCHIVE" badgeColor="red" />,
    )
    const badge = container.querySelector('.absolute.top-2.left-2')
    expect(badge).toBeInTheDocument()
  })

  it('renders secondary action button', async () => {
    const onSecondaryAction = vi.fn()
    render(
      <MediaTile
        id="test-1"
        name="Chapter 1"
        secondaryActionIcon={<span>✕</span>}
        secondaryActionLabel="Remove"
        onSecondaryAction={onSecondaryAction}
      />,
    )
    const btn = screen.getByText('✕').closest('button')!
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onSecondaryAction).toHaveBeenCalled()
  })

  it('renders drag handle when dragHandleProps provided', () => {
    render(
      <MediaTile
        id="test-1"
        name="Chapter 1"
        dragHandleProps={{ 'data-drag': 'handle' } as any}
      />,
    )
    const btn = screen.getByLabelText('Drag to reorder')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('data-drag', 'handle')
  })

  it('renders overlay content', () => {
    render(
      <MediaTile id="test-1" name="Chapter 1" overlayContent={<button>Play</button>} />,
    )
    expect(screen.getByText('Play')).toBeInTheDocument()
  })

  it('renders footer with left and right content', () => {
    render(
      <MediaTile
        id="test-1"
        name="Chapter 1"
        footerLeft={<span>10 pages</span>}
        footerRight={<span>100MB</span>}
      />,
    )
    expect(screen.getByText('10 pages')).toBeInTheDocument()
    expect(screen.getByText('100MB')).toBeInTheDocument()
  })

  it('hides footer when showFooter is false', () => {
    render(
      <MediaTile
        id="test-1"
        name="Chapter 1"
        footerLeft={<span>10 pages</span>}
        showFooter={false}
      />,
    )
    expect(screen.queryByText('10 pages')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<MediaTile id="test-1" name="Chapter 1" onClick={onClick} />)
    fireEvent.click(screen.getByText('Chapter 1').closest('[class*="group/tile"]')!)
    expect(onClick).toHaveBeenCalled()
  })

  it('calls onAuxClick on middle-click', () => {
    const onAuxClick = vi.fn()
    render(<MediaTile id="test-1" name="Chapter 1" onAuxClick={onAuxClick} />)
    const tile = screen.getByText('Chapter 1').closest('[class*="group/tile"]')!
    tile.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }))
    expect(onAuxClick).toHaveBeenCalled()
  })

  it('calls onContextMenu on right-click', () => {
    const onContextMenu = vi.fn()
    render(<MediaTile id="test-1" name="Chapter 1" onContextMenu={onContextMenu} />)
    const tile = screen.getByText('Chapter 1').closest('[class*="group/tile"]')!
    fireEvent.contextMenu(tile)
    expect(onContextMenu).toHaveBeenCalled()
  })

  it('applies variant class "elevated"', () => {
    const { container } = render(<MediaTile id="test-1" name="Chapter 1" variant="elevated" />)
    const tile = container.firstChild as HTMLElement
    expect(tile.className).toContain('shadow-lg')
  })

  it('applies variant class "glass"', () => {
    const { container } = render(<MediaTile id="test-1" name="Chapter 1" variant="glass" />)
    const tile = container.firstChild as HTMLElement
    expect(tile.className).toContain('backdrop-blur-md')
  })

  it('applies default variant', () => {
    const { container } = render(<MediaTile id="test-1" name="Chapter 1" />)
    const tile = container.firstChild as HTMLElement
    expect(tile.className).toContain('bg-surface-secondary')
  })

  it('applies custom className', () => {
    const { container } = render(
      <MediaTile id="test-1" name="Chapter 1" className="custom-class" />,
    )
    const tile = container.firstChild as HTMLElement
    expect(tile.className).toContain('custom-class')
  })

  it('applies drag state styling', () => {
    const { container } = render(<MediaTile id="test-1" name="Chapter 1" isDragging />)
    const tile = container.firstChild as HTMLElement
    expect(tile.className).toContain('opacity-50')
    expect(tile.className).toContain('scale-95')
  })

  it('renders without footer when both footerLeft and footerRight are absent but showFooter is true', () => {
    render(<MediaTile id="test-1" name="Chapter 1" />)
    expect(screen.getByText('Chapter 1')).toBeInTheDocument()
  })
})
