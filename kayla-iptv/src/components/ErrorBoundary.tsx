import { Component, type ReactNode } from 'react'
import { clearPlaylist } from '../lib/playlistStore'

type Props = { children: ReactNode }
type State = { error: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return { error: message }
  }

  async resetApp() {
    try {
      await clearPlaylist()
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="settings-screen">
        <h1>تعذّر فتح التطبيق</h1>
        <p className="settings-err">{this.state.error}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void this.resetApp()}
        >
          مسح البيانات المحفوظة وإعادة التحميل
        </button>
      </div>
    )
  }
}
