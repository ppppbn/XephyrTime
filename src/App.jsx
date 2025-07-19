import { useState, useEffect, useCallback } from 'react'
import { Settings, AlertCircle, CheckCircle } from 'lucide-react'
import TokenForm from './components/TokenForm'
import CommandInput from './components/CommandInput'
import EntryPreview from './components/EntryPreview'
import Toast from './components/Toast'
import { validateToken, submitTimeEntries } from './utils/clockifyApi'
import { parseCommand } from './utils/nlpParser'

function App() {
  const [apiToken, setApiToken] = useState('')
  const [tokenValid, setTokenValid] = useState(null)
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [command, setCommand] = useState('')
  const [parsedEntries, setParsedEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('clockifyToken')
    if (savedToken) {
      setApiToken(savedToken)
      validateTokenAsync(savedToken)
    }
  }, [])

  const validateTokenAsync = async (token) => {
    try {
      const isValid = await validateToken(token)
      setTokenValid(isValid)
      if (!isValid) {
        showToast('Invalid API token', 'error')
      }
    } catch (error) {
      setTokenValid(false)
      showToast('Failed to validate token', 'error')
    }
  }

  const handleTokenSave = (token) => {
    localStorage.setItem('clockifyToken', token)
    setApiToken(token)
    setShowTokenForm(false)
    validateTokenAsync(token)
    showToast('Token saved successfully', 'success')
  }

  const handleTokenDelete = () => {
    localStorage.removeItem('clockifyToken')
    setApiToken('')
    setTokenValid(null)
    setShowTokenForm(false)
    showToast('Token deleted', 'info')
  }

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  const hideToast = () => {
    setToast(null)
  }

  const handleCommandSubmit = async () => {
    if (!command.trim()) {
      showToast('Please enter a command', 'error')
      return
    }

    if (!apiToken) {
      showToast('Please set your API token first', 'error')
      setShowTokenForm(true)
      return
    }

    setLoading(true)
    try {
      const entries = await parseCommand(command)
      setParsedEntries(entries)
      showToast(`Parsed ${entries.length} time entries`, 'success')
    } catch (error) {
      showToast(error.message || 'Failed to parse command', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEntriesSubmit = async () => {
    if (parsedEntries.length === 0) {
      showToast('No entries to submit', 'error')
      return
    }

    setLoading(true)
    try {
      await submitTimeEntries(apiToken, parsedEntries)
      
      // Enhanced success message with details
      const totalHours = parsedEntries.reduce((total, entry) => {
        const start = new Date(entry.start)
        const end = new Date(entry.end)
        return total + (end - start) / (1000 * 60 * 60)
      }, 0)
      
      const projectsCount = new Set(parsedEntries.map(e => e.project).filter(Boolean)).size
      
      let successMessage = `✅ Successfully logged ${parsedEntries.length} ${parsedEntries.length === 1 ? 'entry' : 'entries'}`
      successMessage += ` (${totalHours.toFixed(1)}h total)`
      if (projectsCount > 0) {
        successMessage += ` across ${projectsCount} ${projectsCount === 1 ? 'project' : 'projects'}`
      }
      
      showToast(successMessage, 'success')
      setParsedEntries([])
      setCommand('')
    } catch (error) {
      if (error.message.includes('401')) {
        showToast('Invalid token - please update your API token', 'error')
        setTokenValid(false)
        setShowTokenForm(true)
      } else {
        showToast(error.message || 'Failed to submit entries ❌', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const tokenBannerColor = tokenValid === null ? 'bg-gray-100' : 
                          tokenValid ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
  const tokenBannerText = tokenValid === null ? 'No API token set' :
                         tokenValid ? 'API token is valid' : 'Invalid API token'
  const TokenIcon = tokenValid === null ? Settings : tokenValid ? CheckCircle : AlertCircle

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Token Status Banner */}
      <div className={`${tokenBannerColor} border-b-2 px-4 py-3`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TokenIcon className="w-5 h-5" />
            <span className="font-medium">{tokenBannerText}</span>
          </div>
          <button
            onClick={() => setShowTokenForm(true)}
            className="bg-white px-3 py-1 rounded border hover:bg-gray-50 transition-colors"
          >
            {apiToken ? 'Update Token' : 'Set Token'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            XephyrTime
          </h1>
          <p className="text-gray-600">
            Log time entries to Clockify using natural language commands
          </p>
        </div>

        <div className="space-y-6">
          <CommandInput
            command={command}
            setCommand={setCommand}
            onSubmit={handleCommandSubmit}
            loading={loading}
            onTranscript={setCommand}
            showToast={showToast}
          />

          {parsedEntries.length > 0 && (
            <EntryPreview
              entries={parsedEntries}
              onSubmit={handleEntriesSubmit}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Modals and Toast */}
      {showTokenForm && (
        <TokenForm
          currentToken={apiToken}
          onSave={handleTokenSave}
          onDelete={handleTokenDelete}
          onClose={() => setShowTokenForm(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}

export default App 