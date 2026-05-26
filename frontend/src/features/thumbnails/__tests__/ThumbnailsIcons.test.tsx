import { render } from '@testing-library/react'
import { ResetIcon, BackIcon, GripIcon } from '../components/ThumbnailsIcons'

describe('ThumbnailsIcons', () => {
  it('ResetIcon renders an SVG', () => {
    const { container } = render(<ResetIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('BackIcon renders an SVG', () => {
    const { container } = render(<BackIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('GripIcon renders an SVG', () => {
    const { container } = render(<GripIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
