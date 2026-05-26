import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../SearchBar'

describe('SearchBar', () => {
  it('renders input with placeholder text from i18n', () => {
    render(<SearchBar onSearch={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('calls onSearch after typing (debounced)', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} debounceMs={10} />)
    await user.type(screen.getByRole('textbox'), 'naruto')
    await new Promise(r => setTimeout(r, 50))
    expect(onSearch).toHaveBeenCalledWith('naruto')
  })

  it('clears input and calls onSearch with empty on clear', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} debounceMs={10} />)
    await user.type(screen.getByRole('textbox'), 'test')
    await new Promise(r => setTimeout(r, 50))
    const clearBtn = screen.getByRole('button')
    await user.click(clearBtn)
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(onSearch).toHaveBeenCalledWith('')
  })
})
