import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaTile } from '../MediaTile'

const defaultProps = {
  id: 'tile1',
  name: 'One Piece',
  onClick: vi.fn(),
}

class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

describe('MediaTile', () => {
  it('renders name', () => {
    render(<MediaTile {...defaultProps} />)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
  })

  it('renders fallback icon when no thumbnail', () => {
    const { container } = render(<MediaTile {...defaultProps} fallbackIcon={<span>FB</span>} />)
    expect(container.textContent).toContain('FB')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<MediaTile {...defaultProps} onClick={onClick} />)
    await user.click(screen.getByText('One Piece'))
    expect(onClick).toHaveBeenCalled()
  })

  it('shows badge when badgeText provided', () => {
    render(<MediaTile {...defaultProps} badgeText="NEW" />)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('renders overlay content', () => {
    render(<MediaTile {...defaultProps} overlayContent={<button>Play</button>} />)
    expect(screen.getByText('Play')).toBeInTheDocument()
  })

  it('does not render footer when showFooter is false', () => {
    const { container } = render(<MediaTile {...defaultProps} showFooter={false} />)
    expect(container.querySelector('.rounded-b-lg')).not.toBeInTheDocument()
  })

  it('renders footerLeft and footerRight', () => {
    render(<MediaTile {...defaultProps} footerLeft={<span>L</span>} footerRight={<span>R</span>} />)
    expect(screen.getByText('L')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
  })
})
