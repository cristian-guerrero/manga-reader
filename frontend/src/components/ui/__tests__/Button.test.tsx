import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>)
    const btn = screen.getByRole('button', { name: /click me/i })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.querySelector('svg.animate-spin')).toBeInTheDocument()
  })

  it('does not render icon or rightIcon when loading', () => {
    render(
      <Button isLoading icon={<span data-testid="icon">I</span>}>
        Loading
      </Button>,
    )
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('renders icon when not loading', () => {
    render(
      <Button icon={<span data-testid="icon">I</span>}>
        With Icon
      </Button>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('forwards disabled prop', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies additional className', () => {
    render(<Button className="extra-class">Styled</Button>)
    expect(screen.getByRole('button')).toHaveClass('extra-class')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire click when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders right icon', () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">R</span>}>
        Right Icon
      </Button>,
    )
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })
})
