import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders a spinner by default', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.querySelector('.animate-spin-slow')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />)
    expect(container.querySelector('.w-4')).toBeInTheDocument()

    rerender(<LoadingSpinner size="lg" />)
    expect(container.querySelector('.w-12')).toBeInTheDocument()

    rerender(<LoadingSpinner size="xl" />)
    expect(container.querySelector('.w-16')).toBeInTheDocument()
  })

  it('shows text when showText is true', () => {
    render(<LoadingSpinner showText text="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows default text when showText is true but no text provided', () => {
    render(<LoadingSpinner showText />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('does not show text by default', () => {
    render(<LoadingSpinner />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('shows text when text prop is provided even without showText', () => {
    render(<LoadingSpinner text="Processing" />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('applies fullScreen class', () => {
    const { container } = render(<LoadingSpinner fullScreen />)
    expect(container.querySelector('.h-screen')).toBeInTheDocument()
    expect(container.querySelector('.w-screen')).toBeInTheDocument()
  })

  it('applies fullHeight class', () => {
    const { container } = render(<LoadingSpinner fullHeight />)
    expect(container.querySelector('.h-screen')).toBeInTheDocument()
    expect(container.querySelector('.w-screen')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="my-class" />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })
})
