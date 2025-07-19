import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, duration])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`flex items-center space-x-3 p-4 rounded-lg border shadow-lg ${getColors()}`}>
        {getIcon()}
        <span className="text-sm font-medium text-gray-900">{message}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Toast 