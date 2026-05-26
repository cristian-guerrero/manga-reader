import { render, screen } from '@testing-library/react'
import { GridContainer } from '../GridContainer'

describe('GridContainer', () => {
  it('renders children', () => {
    render(
      <GridContainer>
        <div data-testid="child">Item</div>
      </GridContainer>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('sets CSS variable for item width', () => {
    const { container } = render(
      <GridContainer itemWidth={300}>
        <div>Item</div>
      </GridContainer>,
    )
    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid).toBeInTheDocument()
    expect(grid.style.getPropertyValue('--grid-item-width')).toBe('300px')
  })

  it('enforces minimum width of 50px', () => {
    const { container } = render(
      <GridContainer itemWidth={10}>
        <div>Item</div>
      </GridContainer>,
    )
    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid.style.getPropertyValue('--grid-item-width')).toBe('50px')
  })

  it('applies className', () => {
    const { container } = render(
      <GridContainer className="my-class">
        <div>Item</div>
      </GridContainer>,
    )
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <GridContainer>
        <div data-testid="child-1">A</div>
        <div data-testid="child-2">B</div>
        <div data-testid="child-3">C</div>
      </GridContainer>,
    )
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })
})
