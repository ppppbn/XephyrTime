import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, Keyboard } from 'lucide-react'
import { transcribeAudio } from '../utils/whisperApi'

function CommandInput({ command, setCommand, onSubmit, loading, onTranscript, showToast }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const textareaRef = useRef(null)
  const componentRef = useRef(null)

  // Space key recording functionality
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only activate Space shortcut when textarea is not focused and Space is pressed
      if (e.code === 'Space' && document.activeElement !== textareaRef.current && !loading && !isTranscribing) {
        e.preventDefault()
        if (!isSpacePressed && !isRecording) {
          setIsSpacePressed(true)
          startRecording(true) // Pass true to indicate space-triggered
        }
      }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && isSpacePressed) {
        e.preventDefault()
        setIsSpacePressed(false)
        if (isRecording) {
          stopRecording()
        }
      }
    }

    // Add event listeners to document
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed, isRecording, loading, isTranscribing])

  const startRecording = async (spaceTriggered = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeRecording(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      if (spaceTriggered) {
        showToast('🎤 Recording with Space key - release to stop', 'info')
      } else {
        showToast('Recording started - click mic again to stop', 'info')
      }
    } catch (error) {
      showToast('Failed to access microphone', 'error')
      console.error('Error starting recording:', error)
      setIsSpacePressed(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsTranscribing(true)
      showToast('Processing audio...', 'info')
    }
  }

  const transcribeRecording = async (audioBlob) => {
    try {
      const transcript = await transcribeAudio(audioBlob)
      onTranscript(transcript)
      showToast('Voice command transcribed successfully', 'success')
    } catch (error) {
      showToast('Whisper transcription failed: ' + error.message, 'error')
    } finally {
      setIsTranscribing(false)
      setIsSpacePressed(false)
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div ref={componentRef} className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Enter Command</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Keyboard className="w-4 h-4" />
          <span>Hold Space to record</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type your command here... (e.g., 'Log 2 hours analyzing bug X to project XMAP, starting from Monday 8 am')"
            className="w-full px-4 py-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            disabled={loading || isTranscribing}
          />
          
          <button
            type="button"
            onClick={handleMicClick}
            disabled={loading || isTranscribing}
            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-200 ${
              isRecording 
                ? (isSpacePressed ? 'bg-purple-500 text-white recording-pulse' : 'bg-red-500 text-white recording-pulse')
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${(loading || isTranscribing) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop recording' : 'Start voice recording (or hold Space)'}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>

        {isRecording && (
          <div className="text-sm flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {isSpacePressed ? (
              <span className="text-purple-600 font-medium">🎤 Recording with Space key - release to stop</span>
            ) : (
              <span className="text-red-600">Listening... Click mic to stop</span>
            )}
          </div>
        )}

        {isTranscribing && (
          <div className="text-sm text-blue-600 flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transcribing audio...</span>
          </div>
        )}

        {/* Space key hint */}
        {!isRecording && !isTranscribing && (
          <div className="text-xs text-gray-400 flex items-center space-x-1">
            <Keyboard className="w-3 h-3" />
            <span>Tip: Hold Space anywhere (outside text box) to quickly record voice commands</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Tip: "Log 2 hours working" starts now. "Log meeting Monday this week" uses current week dates.
          </div>
          
          <button
            type="submit"
            disabled={loading || isTranscribing || !command.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{loading ? 'Parsing...' : 'Parse Command'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default CommandInput