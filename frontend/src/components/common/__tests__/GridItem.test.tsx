import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GridItem } from '../GridItem'

describe('GridItem', () => {
  it('renders children', () => {
    render(
      <GridItem>
        <span data-testid="content">Hello</span>
      </GridItem>,
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('sets width from prop', () => {
    const { container } = render(
      <GridItem width={250}>
        <div>Content</div>
      </GridItem>,
    )
    const item = container.firstChild as HTMLElement
    expect(item.style.width).toBe('250px')
  })

  it('uses default width of 200', () => {
    const { container } = render(
      <GridItem>
        <div>Content</div>
      </GridItem>,
    )
    const item = container.firstChild as HTMLElement
    expect(item.style.width).toBe('200px')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <GridItem onClick={onClick}>
        <div>Clickable</div>
      </GridItem>,
    )
    await user.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies className', () => {
    const { container } = render(
      <GridItem className="my-class">
        <div>Styled</div>
      </GridItem>,
    )
    expect(container.firstChild).toHaveClass('my-class')
  })

  it('merges custom styles with width', () => {
    const { container } = render(
      <GridItem width={200} style={{ backgroundColor: 'red' }}>
        <div>Styled</div>
      </GridItem>,
    )
    const item = container.firstChild as HTMLElement
    expect(item.style.width).toBe('200px')
    expect(item.style.backgroundColor).toBe('red')
  })
})
