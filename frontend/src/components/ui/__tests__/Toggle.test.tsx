import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle } from '../Toggle'

describe('Toggle', () => {
  it('renders with correct aria-checked state', () => {
    const { rerender } = render(<Toggle checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    rerender(<Toggle checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with toggled value on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when checked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle checked={true} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} disabled />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies className', () => {
    render(<Toggle checked={false} onChange={vi.fn()} className="my-class" />)
    expect(screen.getByRole('switch')).toHaveClass('my-class')
  })

  it('prevents default on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    const btn = screen.getByRole('switch')
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault')
    await user.click(btn)
    expect(preventDefault).toHaveBeenCalled()
  })
})
