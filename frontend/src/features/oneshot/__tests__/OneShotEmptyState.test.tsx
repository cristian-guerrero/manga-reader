import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OneShotEmptyState } from '../components/OneShotEmptyState'

describe('OneShotEmptyState', () => {
  it('renders translated text', () => {
    render(<OneShotEmptyState onSelectFolder={vi.fn()} />)
    expect(screen.getByText('No folders yet')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop folders here')).toBeInTheDocument()
    expect(screen.getByText('Select Folder')).toBeInTheDocument()
  })

  it('calls onSelectFolder when button clicked', async () => {
    const user = userEvent.setup()
    const onSelectFolder = vi.fn()
    render(<OneShotEmptyState onSelectFolder={onSelectFolder} />)
    await user.click(screen.getByText('Select Folder'))
    expect(onSelectFolder).toHaveBeenCalledTimes(1)
  })

  it('renders SVG icon', () => {
    const { container } = render(<OneShotEmptyState onSelectFolder={vi.fn()} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
