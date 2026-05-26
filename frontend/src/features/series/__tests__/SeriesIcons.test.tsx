import { render } from '@testing-library/react'
import { SeriesIcon, PlusIcon, TrashIcon, BookIcon, PlayIcon } from '../components/SeriesIcons'
import { ChevronLeftIcon, ImageIcon } from '../components/SeriesDetailsIcons'

describe('SeriesIcons', () => {
  it('SeriesIcon renders an SVG', () => {
    const { container } = render(<SeriesIcon />)
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

  it('BookIcon renders an SVG', () => {
    const { container } = render(<BookIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('PlayIcon renders an SVG', () => {
    const { container } = render(<PlayIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('SeriesDetailsIcons', () => {
  it('ChevronLeftIcon renders an SVG', () => {
    const { container } = render(<ChevronLeftIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ImageIcon renders an SVG', () => {
    const { container } = render(<ImageIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
