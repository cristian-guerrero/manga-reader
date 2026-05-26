import { useUpdaterStore } from '../updaterStore'
import { UpdaterAPI } from '../../services/api/updaterAPI'

vi.mock('../../services/api/updaterAPI', () => ({
  UpdaterAPI: {
    getCurrentVersion: vi.fn(),
    getUpdateState: vi.fn(),
    wasJustUpdated: vi.fn(),
    checkForUpdate: vi.fn(),
    downloadUpdate: vi.fn(),
  },
}))

describe('updaterStore', () => {
  beforeEach(() => {
    useUpdaterStore.setState({
      currentVersion: '',
      updateInfo: null,
      updateState: { pending: false, pendingVersion: '', downloadedAt: '' },
      isChecking: false,
      isDownloading: false,
      lastCheckTime: null,
      updatedRecently: false,
    })
    vi.clearAllMocks()
  })

  it('starts with defaults', () => {
    const s = useUpdaterStore.getState()
    expect(s.currentVersion).toBe('')
    expect(s.isChecking).toBe(false)
    expect(s.isDownloading).toBe(false)
    expect(s.updatedRecently).toBe(false)
  })

  it('init loads version and update state', async () => {
    vi.mocked(UpdaterAPI.getCurrentVersion).mockResolvedValue('b1000')
    vi.mocked(UpdaterAPI.getUpdateState).mockResolvedValue({ pending: false, pendingVersion: '', downloadedAt: '' })
    vi.mocked(UpdaterAPI.wasJustUpdated).mockResolvedValue(false)

    await useUpdaterStore.getState().init()
    const s = useUpdaterStore.getState()
    expect(s.currentVersion).toBe('b1000')
    expect(s.updatedRecently).toBe(false)
  })

  it('init sets updatedRecently when just updated', async () => {
    vi.mocked(UpdaterAPI.getCurrentVersion).mockResolvedValue('b1000')
    vi.mocked(UpdaterAPI.getUpdateState).mockResolvedValue({ pending: false, pendingVersion: '', downloadedAt: '' })
    vi.mocked(UpdaterAPI.wasJustUpdated).mockResolvedValue(true)

    await useUpdaterStore.getState().init()
    expect(useUpdaterStore.getState().updatedRecently).toBe(true)
  })

  it('checkForUpdate fetches update info', async () => {
    const mockInfo = { available: true, version: 'b1001', url: '', notes: '' }
    vi.mocked(UpdaterAPI.checkForUpdate).mockResolvedValue(mockInfo)
    vi.mocked(UpdaterAPI.getUpdateState).mockResolvedValue({ pending: false, pendingVersion: '', downloadedAt: '' })

    await useUpdaterStore.getState().checkForUpdate()
    const s = useUpdaterStore.getState()
    expect(s.isChecking).toBe(false)
    expect(s.lastCheckTime).not.toBeNull()
  })

  it('checkForUpdate does nothing if already checking', async () => {
    useUpdaterStore.setState({ isChecking: true })
    await useUpdaterStore.getState().checkForUpdate()
    expect(UpdaterAPI.checkForUpdate).not.toHaveBeenCalled()
  })

  it('downloadUpdate downloads and updates state', async () => {
    useUpdaterStore.setState({
      updateInfo: { available: true, version: 'b1001', url: '', notes: '' },
    })
    vi.mocked(UpdaterAPI.downloadUpdate).mockResolvedValue(undefined)
    vi.mocked(UpdaterAPI.getUpdateState).mockResolvedValue({
      pending: true, pendingVersion: 'b1001', downloadedAt: '2024-01-01',
    })

    await useUpdaterStore.getState().downloadUpdate()
    const s = useUpdaterStore.getState()
    expect(s.isDownloading).toBe(false)
    expect(s.updateInfo).toBeNull()
    expect(s.updateState.pending).toBe(true)
  })

  it('downloadUpdate does nothing if no update info', async () => {
    await useUpdaterStore.getState().downloadUpdate()
    expect(UpdaterAPI.downloadUpdate).not.toHaveBeenCalled()
  })

  it('downloadUpdate does nothing if already downloading', async () => {
    useUpdaterStore.setState({
      isDownloading: true,
      updateInfo: { available: true, version: 'b1001', url: '', notes: '' },
    })
    await useUpdaterStore.getState().downloadUpdate()
    expect(UpdaterAPI.downloadUpdate).not.toHaveBeenCalled()
  })

  it('dismissUpdated resets updatedRecently', () => {
    useUpdaterStore.setState({ updatedRecently: true })
    useUpdaterStore.getState().dismissUpdated()
    expect(useUpdaterStore.getState().updatedRecently).toBe(false)
  })
})
