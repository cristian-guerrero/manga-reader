import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('renders children', () => {
    render(<Tooltip content="Help"><button>Hover me</button></Tooltip>)
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    render(<Tooltip content="Tooltip text"><button>Target</button></Tooltip>)
    await user.hover(screen.getByText('Target'))
    await new Promise(r => setTimeout(r, 200))
    expect(screen.getByText('Tooltip text')).toBeInTheDocument()
  })

  it('does not render tooltip when content is empty', () => {
    const { container } = render(<Tooltip content=""><button>Target</button></Tooltip>)
    expect(container.querySelector('.fixed')).not.toBeInTheDocument()
  })

  it('applies className to trigger element', () => {
    render(<Tooltip content="tip" className="my-class"><button>Btn</button></Tooltip>)
    expect(screen.getByText('Btn').parentElement).toHaveClass('my-class')
  })
})
