import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorDisplay } from '../ErrorDisplay'

describe('ErrorDisplay', () => {
  it('renders default title and message', () => {
    render(<ErrorDisplay message="Something went wrong" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<ErrorDisplay title="Oops" message="Failed" />)
    expect(screen.getByText('Oops')).toBeInTheDocument()
  })

  it('renders details when provided', () => {
    render(<ErrorDisplay message="Error" details="Stack trace here" />)
    expect(screen.getByText('Show details')).toBeInTheDocument()
  })

  it('shows retry button when onRetry is provided', () => {
    render(<ErrorDisplay message="Error" onRetry={vi.fn()} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows dismiss button when onDismiss is provided', () => {
    render(<ErrorDisplay message="Error" onDismiss={vi.fn()} />)
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('calls onRetry when clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorDisplay message="Error" onRetry={onRetry} />)
    await user.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ErrorDisplay message="Error" onDismiss={onDismiss} />)
    await user.click(screen.getByText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders custom icon', () => {
    render(
      <ErrorDisplay message="Error" icon={<span data-testid="custom-icon">⚠</span>} />,
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders with different variants', () => {
    const { container, rerender } = render(<ErrorDisplay message="Warning message" variant="warning" />)
    expect(screen.getByText('Warning message')).toBeInTheDocument()

    rerender(<ErrorDisplay message="Info message" variant="info" />)
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('uses fullHeight container when specified', () => {
    const { container } = render(<ErrorDisplay message="Error" fullHeight />)
    expect(container.querySelector('.h-full')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ErrorDisplay message="Error" className="my-class" />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })
})
