import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortControls } from '../SortControls'

const options = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'size', label: 'Size' },
]

describe('SortControls', () => {
  it('renders select with options', () => {
    render(
      <SortControls
        sortBy="name"
        sortOrder="asc"
        onSortByChange={vi.fn()}
        onSortOrderChange={vi.fn()}
        options={options}
      />,
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Size')).toBeInTheDocument()
  })

  it('calls onSortByChange when select changes', async () => {
    const user = userEvent.setup()
    const onSortByChange = vi.fn()
    render(
      <SortControls
        sortBy="name"
        sortOrder="asc"
        onSortByChange={onSortByChange}
        onSortOrderChange={vi.fn()}
        options={options}
      />,
    )
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'date')
    expect(onSortByChange).toHaveBeenCalledWith('date')
  })

  it('renders sort order button', () => {
    render(
      <SortControls
        sortBy="name"
        sortOrder="asc"
        onSortByChange={vi.fn()}
        onSortOrderChange={vi.fn()}
        options={options}
      />,
    )
    const orderBtn = screen.getByRole('button')
    expect(orderBtn).toBeInTheDocument()
  })

  it('returns null when show is false', () => {
    const { container } = render(
      <SortControls
        sortBy="name"
        sortOrder="asc"
        onSortByChange={vi.fn()}
        onSortOrderChange={vi.fn()}
        options={options}
        show={false}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
