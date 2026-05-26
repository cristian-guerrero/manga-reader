import { useGlobalNavigationStore } from '../globalNavigationStore'
import { useTabStore } from '../tabStore'

describe('globalNavigationStore', () => {
  beforeEach(() => {
    useGlobalNavigationStore.setState({
      isPanicMode: false,
      isProcessing: false,
      folders: [],
    })
  })

  it('starts with default values', () => {
    const state = useGlobalNavigationStore.getState()
    expect(state.isPanicMode).toBe(false)
    expect(state.isProcessing).toBe(false)
    expect(state.folders).toEqual([])
  })

  it('triggerPanic sets isPanicMode to true', () => {
    useGlobalNavigationStore.getState().triggerPanic()
    expect(useGlobalNavigationStore.getState().isPanicMode).toBe(true)
  })

  it('exitPanic sets isPanicMode to false', () => {
    useGlobalNavigationStore.setState({ isPanicMode: true })
    useGlobalNavigationStore.getState().exitPanic()
    expect(useGlobalNavigationStore.getState().isPanicMode).toBe(false)
  })

  it('setIsProcessing updates processing state', () => {
    useGlobalNavigationStore.getState().setIsProcessing(true)
    expect(useGlobalNavigationStore.getState().isProcessing).toBe(true)

    useGlobalNavigationStore.getState().setIsProcessing(false)
    expect(useGlobalNavigationStore.getState().isProcessing).toBe(false)
  })

  it('setFolders replaces folders array', () => {
    const folders = [{ path: '/test', name: 'Test', isSeries: false, coverImage: '' }]
    useGlobalNavigationStore.getState().setFolders(folders)
    expect(useGlobalNavigationStore.getState().folders).toEqual(folders)
  })

  it('setFolders accepts updater function', () => {
    useGlobalNavigationStore.setState({
      folders: [{ path: '/a', name: 'A', isSeries: false, coverImage: '' }],
    })
    useGlobalNavigationStore.getState().setFolders((prev) => [
      ...prev,
      { path: '/b', name: 'B', isSeries: false, coverImage: '' },
    ])
    expect(useGlobalNavigationStore.getState().folders).toHaveLength(2)
  })
})
