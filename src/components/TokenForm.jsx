import { useState } from 'react'
import { X, Key, Trash2 } from 'lucide-react'

function TokenForm({ currentToken, onSave, onDelete, onClose }) {
  const [token, setToken] = useState(currentToken || '')
  const [showToken, setShowToken] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (token.trim()) {
      onSave(token.trim())
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete the API token?')) {
      onDelete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Clockify API Token</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              API Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your Clockify API token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Get your API token from Clockify settings → Profile settings → API
            </p>
          </div>

          <div className="flex justify-between space-x-3">
            {currentToken && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Token
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TokenForm 