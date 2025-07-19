import { Clock, Calendar, FolderOpen, Send, Loader2, CheckSquare } from 'lucide-react'

function EntryPreview({ entries, onSubmit, loading }) {
  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (start, end) => {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const durationMs = endTime - startTime
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  const totalDuration = entries.reduce((total, entry) => {
    const start = new Date(entry.start)
    const end = new Date(entry.end)
    return total + (end - start)
  }, 0)

  const formatTotalDuration = (durationMs) => {
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) {
      return `${minutes} minutes`
    } else if (minutes === 0) {
      return `${hours} hours`
    } else {
      return `${hours} hours ${minutes} minutes`
    }
  }

  const hasOverlappingEntries = () => {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i]
        const entry2 = entries[j]
        const start1 = new Date(entry1.start)
        const end1 = new Date(entry1.end)
        const start2 = new Date(entry2.start)
        const end2 = new Date(entry2.end)
        
        if ((start1 < end2 && end1 > start2)) {
          return true
        }
      }
    }
    return false
  }

  const overlapping = hasOverlappingEntries()

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Parsed Time Entries ({entries.length})
        </h2>
        <div className="text-sm text-gray-600">
          Total: {formatTotalDuration(totalDuration)}
        </div>
      </div>

      {overlapping && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Overlapping entries detected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Some entries have overlapping time ranges. This may cause issues in Clockify.
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {entries.map((entry, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">
                    {entry.project || 'No Project'}
                  </span>
                  {!entry.project && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Missing project
                    </span>
                  )}
                </div>

                {/* Task display */}
                {entry.task && (
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Task: <span className="font-medium">{entry.task}</span>
                    </span>
                  </div>
                )}
                
                <p className="text-gray-700 mb-2">{entry.description}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateTime(entry.start)}</span>
                  </div>
                  <span>→</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateTime(entry.end)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {formatDuration(entry.start, entry.end)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={loading || entries.length === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{loading ? 'Submitting...' : 'Submit to Clockify'}</span>
        </button>
      </div>
    </div>
  )
}

export default EntryPreview 