import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpDialog } from '../HelpDialog'

describe('HelpDialog', () => {
  it('renders when isOpen is true', () => {
    render(<HelpDialog isOpen={true} onClose={vi.fn()} title="Help Title"><p>Content</p></HelpDialog>)
    expect(screen.getByText('Help Title')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<HelpDialog isOpen={false} onClose={vi.fn()} title="Help"><p>Content</p></HelpDialog>)
    expect(screen.queryByText('Help')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HelpDialog isOpen={true} onClose={onClose} title="Title"><p>C</p></HelpDialog>)
    await user.click(screen.getByText('common.close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<HelpDialog isOpen={true} onClose={onClose} title="Title"><p>C</p></HelpDialog>)
    await user.click(container.firstElementChild!)
    expect(onClose).toHaveBeenCalled()
  })
})
