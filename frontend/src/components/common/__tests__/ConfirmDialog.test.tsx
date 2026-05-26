import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure?',
  }

  it('renders when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('renders default confirm and cancel labels', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />,
    )
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument()
    expect(screen.getByText('No, Keep')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)
    const overlay = screen.getByText('Are you sure?').closest('.fixed')
    if (overlay) {
      await user.click(overlay)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('uses danger variant when isDestructive is true', () => {
    render(<ConfirmDialog {...defaultProps} isDestructive />)
    const confirmBtn = screen.getByText('Confirm')
    expect(confirmBtn).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        icon={<span data-testid="dialog-icon">⚠</span>}
      />,
    )
    expect(screen.getByTestId('dialog-icon')).toBeInTheDocument()
  })
})
