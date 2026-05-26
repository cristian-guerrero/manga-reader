import { errorService, ErrorType } from '../services/errorService'

describe('errorService', () => {
  it('returns network error type for timeout messages', () => {
    const error = new Error('request timeout')
    expect(errorService.getErrorType(error)).toBe(ErrorType.NETWORK)
  })

  it('returns unknown error type for generic errors', () => {
    const error = new Error('something went wrong')
    expect(errorService.getErrorType(error)).toBe(ErrorType.UNKNOWN)
  })

  it('returns user-friendly message from error', () => {
    const message = errorService.handleAndGetMessage(new Error('not found'), {
      component: 'Test',
      action: 'test',
    })
    expect(message).toBe('Resource not found.')
  })

  it('returns original message for short unknown errors', () => {
    const message = errorService.handleAndGetMessage(new Error('weird error'), {
      component: 'Test',
      action: 'doSomething',
    })
    expect(message).toBe('weird error')
  })

  it('returns fallback message for long unknown errors', () => {
    const longMsg = 'a'.repeat(101)
    const message = errorService.handleAndGetMessage(new Error(longMsg), {
      component: 'Test',
      action: 'doSomething',
    })
    expect(message).toBe('Failed to doSomething. Please try again.')
  })
})
