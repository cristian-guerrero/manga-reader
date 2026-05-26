import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add some items" />)
    expect(screen.getByText('Add some items')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByText('Add some items')).not.toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState title="Empty" action={{ label: 'Add Item', onClick: vi.fn() }} />,
    )
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('calls action onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState title="Empty" action={{ label: 'Add', onClick }} />,
    )
    await user.click(screen.getByText('Add'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<span data-testid="custom-icon">🔍</span>}
      />,
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('uses fullHeight by default', () => {
    const { container } = render(<EmptyState title="Empty" />)
    expect(container.querySelector('.h-full')).toBeInTheDocument()
  })

  it('does not use fullHeight when set to false', () => {
    const { container } = render(<EmptyState title="Empty" fullHeight={false} />)
    expect(container.querySelector('.h-full')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="my-class" />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })
})
