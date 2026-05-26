import { render } from '@testing-library/react'
import { FolderPlusIcon, BookOpenIcon, ArrowRightIcon, TrashIcon } from '../components/HomeIcons'

describe('HomeIcons', () => {
  it('FolderPlusIcon renders an SVG', () => {
    const { container } = render(<FolderPlusIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('BookOpenIcon renders an SVG', () => {
    const { container } = render(<BookOpenIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('ArrowRightIcon renders an SVG', () => {
    const { container } = render(<ArrowRightIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('TrashIcon renders an SVG', () => {
    const { container } = render(<TrashIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
