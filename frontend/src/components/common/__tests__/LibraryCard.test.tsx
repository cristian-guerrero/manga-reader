import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryCard } from '../LibraryCard'

const defaultProps = {
  id: 'lib1',
  name: 'One Piece',
  count: 42,
  countLabel: 'chapters',
  countIcon: <span>📖</span>,
  onOpen: vi.fn(),
  fallbackIcon: <span>📁</span>,
}

class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

describe('LibraryCard', () => {
  it('renders name and count', () => {
    render(<LibraryCard {...defaultProps} />)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
    expect(screen.getByText('42 chapters')).toBeInTheDocument()
  })

  it('calls onOpen when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<LibraryCard {...defaultProps} onOpen={onOpen} />)
    await user.click(screen.getByText('One Piece'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('renders with split variant', () => {
    const { container } = render(<LibraryCard {...defaultProps} variant="split" />)
    expect(container.querySelector('.flex-col')).toBeInTheDocument()
  })

  it('shows badge when isTemporary', () => {
    render(<LibraryCard {...defaultProps} isTemporary archiveLabel="Archive" />)
    expect(screen.getByText('Archive')).toBeInTheDocument()
  })
})
