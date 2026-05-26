import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb } from '../Breadcrumb'

const baseFolders = [
  { path: 'C:/manga/shonen', name: 'Shonen', addedAt: '2024-01-01', isVisible: true },
  { path: 'C:/manga/seinen', name: 'Seinen', addedAt: '2024-01-02', isVisible: true },
]

describe('Breadcrumb', () => {
  it('renders root label at root path', () => {
    render(
      <Breadcrumb
        currentPath={null}
        baseFolders={baseFolders}
        onNavigate={vi.fn()}
        rootLabel="My Explorer"
      />,
    )
    expect(screen.getByText('My Explorer')).toBeInTheDocument()
  })

  it('uses default label from t() when rootLabel is not provided', () => {
    render(
      <Breadcrumb
        currentPath={null}
        baseFolders={[]}
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByText('Explorer')).toBeInTheDocument()
  })

  it('builds breadcrumb for path inside a base folder', () => {
    render(
      <Breadcrumb
        currentPath="C:/manga/shonen/naruto/chapter-1"
        baseFolders={baseFolders}
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Shonen')).toBeInTheDocument()
    expect(screen.getByText('naruto')).toBeInTheDocument()
    expect(screen.getByText('chapter-1')).toBeInTheDocument()
  })

  it('marks last segment as not clickable', () => {
    render(
      <Breadcrumb
        currentPath="C:/manga/shonen/naruto/chapter-1"
        baseFolders={baseFolders}
        onNavigate={vi.fn()}
      />,
    )
    const buttons = screen.getAllByRole('button')
    const allText = screen.getAllByText('chapter-1')
    const chapterText = allText[0]
    expect(chapterText.closest('button')).toBeNull()
  })

  it('navigates when clicking a non-last segment', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <Breadcrumb
        currentPath="C:/manga/shonen/naruto/chapter-1"
        baseFolders={baseFolders}
        onNavigate={onNavigate}
      />,
    )
    await user.click(screen.getByText('naruto'))
    expect(onNavigate).toHaveBeenCalledWith('C:/manga/shonen/naruto')
  })

  it('navigates to base folder when clicking base folder name', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <Breadcrumb
        currentPath="C:/manga/shonen/naruto"
        baseFolders={baseFolders}
        onNavigate={onNavigate}
      />,
    )
    await user.click(screen.getByText('Shonen'))
    expect(onNavigate).toHaveBeenCalledWith('C:/manga/shonen')
  })

  it('handles paths without matching base folder', () => {
    render(
      <Breadcrumb
        currentPath="D:/some/other/path"
        baseFolders={baseFolders}
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('D:')).toBeInTheDocument()
    expect(screen.getByText('some')).toBeInTheDocument()
    expect(screen.getByText('other')).toBeInTheDocument()
    expect(screen.getByText('path')).toBeInTheDocument()
  })

  it('calls onAuxClick when middle-clicking a segment', async () => {
    const user = userEvent.setup()
    const onAuxClick = vi.fn()
    render(
      <Breadcrumb
        currentPath="C:/manga/shonen/naruto"
        baseFolders={baseFolders}
        onNavigate={vi.fn()}
        onAuxClick={onAuxClick}
      />,
    )
    const shonenBtn = screen.getByText('Shonen').closest('button')
    if (shonenBtn) {
      await user.pointer({ keys: '[MouseMiddle]', target: shonenBtn })
      expect(onAuxClick).toHaveBeenCalled()
    }
  })
})
