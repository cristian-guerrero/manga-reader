import { render } from '@testing-library/react'
import { GridIcon, ListIcon } from '../components/ExplorerIcons'

describe('ExplorerIcons', () => {
  it('GridIcon renders an SVG', () => {
    const { container } = render(<GridIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ListIcon renders an SVG', () => {
    const { container } = render(<ListIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
