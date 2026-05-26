import { render } from '@testing-library/react'
import { PlayIcon, TrashIcon, ClockIcon, GridIcon, ListIcon } from '../components/HistoryIcons'

describe('HistoryIcons', () => {
  it('PlayIcon renders an SVG', () => {
    const { container } = render(<PlayIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('TrashIcon renders an SVG', () => {
    const { container } = render(<TrashIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ClockIcon renders an SVG', () => {
    const { container } = render(<ClockIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('GridIcon renders an SVG', () => {
    const { container } = render(<GridIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ListIcon renders an SVG', () => {
    const { container } = render(<ListIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
