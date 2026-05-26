import { render, screen } from '@testing-library/react'
import { SectionHeader } from '../SectionHeader'

describe('SectionHeader', () => {
  it('renders the title', () => {
    render(<SectionHeader title="My Section" />)
    expect(screen.getByText('My Section')).toBeInTheDocument()
  })

  it('renders as h2', () => {
    render(<SectionHeader title="Section" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Section')
  })

  it('applies className', () => {
    const { container } = render(<SectionHeader title="Section" className="my-class" />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })
})
