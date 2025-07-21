import { useState, useEffect } from 'react'
import { Calendar, Download, LogIn, LogOut, Loader2, Users } from 'lucide-react'
import teamsApi from '../utils/teamsApi'

function TeamsImport({ onImportEntries, showToast }) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    initializeTeamsApi()
  }, [])

  const initializeTeamsApi = async () => {
    try {
      setIsInitializing(true)
      await teamsApi.initialize()
      setIsSignedIn(teamsApi.isSignedIn())
      if (teamsApi.isSignedIn()) {
        setUserName(teamsApi.getUserName())
      }
    } catch (error) {
      console.error('Failed to initialize Teams API:', error)
      showToast('Failed to initialize Teams integration', 'error')
    } finally {
      setIsInitializing(false)
    }
  }

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      await teamsApi.signIn()
      setIsSignedIn(true)
      setUserName(teamsApi.getUserName())
      showToast(`Signed in as ${teamsApi.getUserName()}`, 'success')
    } catch (error) {
      showToast(`Sign-in failed: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await teamsApi.signOut()
      setIsSignedIn(false)
      setUserName('')
      showToast('Signed out successfully', 'info')
    } catch (error) {
      showToast(`Sign-out failed: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportWeekEvents = async () => {
    if (!isSignedIn) {
      showToast('Please sign in to Microsoft first', 'error')
      return
    }

    try {
      setIsLoading(true)
      showToast('Fetching calendar events for this week...', 'info')

      // Fetch calendar events for current week
      const events = await teamsApi.getCalendarEventsForWeek()
      
      if (events.length === 0) {
        showToast('No calendar events found for this week', 'info')
        return
      }

      // Convert calendar events to time entries
      const timeEntries = teamsApi.convertCalendarEventsToTimeEntries(events)
      
      if (timeEntries.length === 0) {
        showToast('No valid meetings found (filtered out all-day and tentative events)', 'info')
        return
      }

      // Pass the converted entries to the parent component
      onImportEntries(timeEntries)
      
      showToast(`Imported ${timeEntries.length} meetings from Teams calendar`, 'success')
    } catch (error) {
      showToast(`Import failed: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Initializing Teams integration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Teams Calendar Import</h2>
        </div>
        
        {isSignedIn && (
          <div className="text-sm text-gray-600">
            Signed in as: <span className="font-medium">{userName}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Authentication Section */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isSignedIn ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-700">
              {isSignedIn ? 'Connected to Microsoft' : 'Not connected'}
            </span>
          </div>
          
          <button
            onClick={isSignedIn ? handleSignOut : handleSignIn}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
              isSignedIn 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignedIn ? (
              <LogOut className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{isSignedIn ? 'Sign Out' : 'Sign In'}</span>
          </button>
        </div>

        {/* Import Section */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Import calendar events from this week as Clockify time entries. The system will automatically:
          </p>
          <ul className="text-xs text-gray-500 space-y-1 ml-4">
            <li>• Filter out all-day events and tentative meetings</li>
            <li>• Extract project names from meeting titles (CAPS, [brackets], -dashes-)</li>
            <li>• Convert meeting times to time entries</li>
            <li>• Smart task assignment based on meeting context</li>
          </ul>
        </div>

        <button
          onClick={handleImportWeekEvents}
          disabled={!isSignedIn || isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <Calendar className="w-4 h-4" />
          <span>
            {isLoading ? 'Importing...' : 'Import This Week\'s Meetings'}
          </span>
        </button>

        {!isSignedIn && (
          <div className="text-xs text-gray-400 text-center">
            Sign in with your Microsoft account to access Teams calendar
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamsImport 