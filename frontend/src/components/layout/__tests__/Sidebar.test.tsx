import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useTabStore } from '../../../stores/tabStore'
import { useGlobalNavigationStore } from '../../../stores/globalNavigationStore'
import type { Tab } from '../../../stores/tabStore'

const createTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: 'tab-1',
  title: 'Home',
  page: 'home',
  fromPage: null,
  params: {},
  history: [{ page: 'home', params: {} }],
  activeMenuPage: 'home',
  explorerState: null,
  thumbnailScrollPositions: {},
  viewerState: null,
  ...overrides,
})

describe('Sidebar', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [createTab()],
      activeTabId: 'tab-1',
      isReady: false,
    })
    useGlobalNavigationStore.setState({
      isPanicMode: false,
      isProcessing: false,
      folders: [],
    })
    useSettingsStore.setState({
      sidebarCollapsed: false,
      enabledMenuItems: {
        home: true,
        explorer: true,
        history: true,
        oneShot: true,
        series: true,
        download: true,
        colorizer: true,
        'library-manager': true,
        settings: true,
      },
    })
  })

  it('renders all nav items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('One Shot')).toBeInTheDocument()
    expect(screen.getByText('Series')).toBeInTheDocument()
    expect(screen.getByText('Downloads')).toBeInTheDocument()
    expect(screen.getByText('Colorizer')).toBeInTheDocument()
    expect(screen.getByText('Library Manager')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('highlights active item', () => {
    useTabStore.setState({
      tabs: [createTab({ activeMenuPage: 'settings' })],
    })
    render(<Sidebar />)
    const settingsBtn = screen.getByText('Settings').closest('button')!
    expect(settingsBtn.style.backgroundColor).toBeTruthy()
  })

  it('renders collapsed sidebar', () => {
    useSettingsStore.setState({ sidebarCollapsed: true })
    render(<Sidebar />)
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument()
  })

  it('renders collapse toggle button', () => {
    render(<Sidebar />)
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('calls toggleSidebar on collapse button click', () => {
    render(<Sidebar />)
    const buttons = screen.getAllByText('Close')
    const collapseBtn = buttons.find(b => b.closest('div')?.closest('aside'))
    fireEvent.click(collapseBtn!)
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
  })

  it('calls navigate on nav item click', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Settings'))
    const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
    expect(tab?.page).toBe('settings')
  })

  it('navigates explorer with resetToRoot when already on explorer', () => {
    useTabStore.setState({
      tabs: [createTab({ activeMenuPage: 'explorer', page: 'explorer' })],
    })
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Explorer'))
    const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
    expect(tab?.params).toEqual({ resetToRoot: 'true' })
  })

  it('filters items by enabledMenuItems', () => {
    useSettingsStore.setState({
      enabledMenuItems: {
        home: true,
        explorer: true,
        history: true,
        oneShot: true,
        series: true,
        download: false,
        colorizer: false,
        'library-manager': false,
        settings: true,
      },
    })
    render(<Sidebar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Downloads')).not.toBeInTheDocument()
    expect(screen.queryByText('Colorizer')).not.toBeInTheDocument()
    expect(screen.queryByText('Library Manager')).not.toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows context menu on nav item right-click', () => {
    render(<Sidebar />)
    const homeBtn = screen.getByText('Home').closest('button')!
    fireEvent.contextMenu(homeBtn)
    expect(screen.getByText('Open in tab')).toBeInTheDocument()
  })

  it('shows context menu on container right-click without nav item', () => {
    render(<Sidebar />)
    const nav = screen.getByText('Home').closest('nav')!
    fireEvent.contextMenu(nav)
    expect(screen.queryByText('Open in tab')).not.toBeInTheDocument()
    const closeItems = screen.getAllByText('Close')
    expect(closeItems.length).toBeGreaterThanOrEqual(1)
  })

  it('context menu open in tab calls addTab', () => {
    render(<Sidebar />)
    const homeBtn = screen.getByText('Home').closest('button')!
    fireEvent.contextMenu(homeBtn)
    fireEvent.click(screen.getByText('Open in tab'))
    expect(useTabStore.getState().tabs).toHaveLength(2)
  })

  it('context menu close app calls runtime.Quit', () => {
    window.runtime.Quit = vi.fn()
    render(<Sidebar />)
    const nav = screen.getByText('Home').closest('nav')!
    fireEvent.contextMenu(nav)
    const closeButtons = screen.getAllByText('Close')
    const closeAppBtn = closeButtons.at(-1)!
    fireEvent.click(closeAppBtn)
    expect(window.runtime.Quit).toHaveBeenCalled()
  })
})
