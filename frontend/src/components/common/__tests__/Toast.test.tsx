import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../Toast'

function TestConsumer() {
  const { showToast } = useToast()
  return <button onClick={() => showToast('Hello')}>Show</button>
}

describe('ToastProvider', () => {
  it('shows toast with message', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><TestConsumer /></ToastProvider>)
    await user.click(screen.getByText('Show'))
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('removes toast on close button click', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><TestConsumer /></ToastProvider>)
    await user.click(screen.getByText('Show'))
    const closeBtn = screen.getByRole('button', { name: '' })
    await user.click(closeBtn)
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('shows multiple toasts', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><TestConsumer /></ToastProvider>)
    await user.click(screen.getByText('Show'))
    await user.click(screen.getByText('Show'))
    const toasts = screen.getAllByText('Hello')
    expect(toasts).toHaveLength(2)
  })
})

describe('useToast', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within a ToastProvider')
  })
})
