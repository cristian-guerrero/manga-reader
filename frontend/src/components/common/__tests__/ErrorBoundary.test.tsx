import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'

const ThrowError = () => {
  throw new Error('Test error')
}

const GoodChild = () => <div>All good</div>

describe('ErrorBoundary', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(<ErrorBoundary><GoodChild /></ErrorBoundary>)
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders fallback UI on error', () => {
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>)
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('calls onError when error caught', () => {
    const onError = vi.fn()
    render(<ErrorBoundary onError={onError}><ThrowError /></ErrorBoundary>)
    expect(onError).toHaveBeenCalled()
  })

  it('uses custom fallback when provided', () => {
    render(<ErrorBoundary fallback={<div>Custom Error</div>}><ThrowError /></ErrorBoundary>)
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
  })
})
