import { render } from '@testing-library/react'
import { OneShotIcon, PlusIcon, TrashIcon, ImageIcon } from '../components/OneShotIcons'

describe('OneShotIcons', () => {
  it('OneShotIcon renders an SVG', () => {
    const { container } = render(<OneShotIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('PlusIcon renders an SVG', () => {
    const { container } = render(<PlusIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('TrashIcon renders an SVG', () => {
    const { container } = render(<TrashIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ImageIcon renders an SVG', () => {
    const { container } = render(<ImageIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
