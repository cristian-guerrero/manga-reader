import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu } from '../ContextMenu'
import type { ContextMenuItem } from '@types'

describe('ContextMenu', () => {
  const baseItems: ContextMenuItem[] = [
    { id: 'edit', label: 'Edit', onClick: vi.fn() },
    { id: 'delete', label: 'Delete', onClick: vi.fn(), danger: true },
  ]

  it('renders menu items', () => {
    render(<ContextMenu items={baseItems} position={{ x: 100, y: 200 }} onClose={vi.fn()} />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('renders separator items', () => {
    const items: ContextMenuItem[] = [
      { id: 'a', label: 'A', onClick: vi.fn() },
      { id: 'sep', type: 'separator', label: '' },
      { id: 'b', label: 'B', onClick: vi.fn() },
    ]
    const { container } = render(<ContextMenu items={items} position={{ x: 0, y: 0 }} onClose={vi.fn()} />)
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0)
  })

  it('calls onClick and onClose when item clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenu items={[{ id: 'test', label: 'Test', onClick }]} position={{ x: 0, y: 0 }} onClose={onClose} />)
    await user.click(screen.getByText('Test'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ContextMenu items={baseItems} position={{ x: 0, y: 0 }} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on click outside', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ContextMenu items={baseItems} position={{ x: 0, y: 0 }} onClose={onClose} />)
    await user.click(document.body)
    expect(onClose).toHaveBeenCalled()
  })

  it('positions menu at given coordinates', () => {
    const { container } = render(<ContextMenu items={baseItems} position={{ x: 50, y: 75 }} onClose={vi.fn()} />)
    const menu = container.firstChild as HTMLElement
    expect(menu.style.left).toBe('50px')
    expect(menu.style.top).toBe('75px')
  })

  it('does not call onClick when item is disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ContextMenu items={[{ id: 'd', label: 'Disabled', onClick, disabled: true }]} position={{ x: 0, y: 0 }} onClose={vi.fn()} />)
    await user.click(screen.getByText('Disabled'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
