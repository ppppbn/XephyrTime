const OPENAI_API_BASE = 'https://api.openai.com/v1'

export async function transcribeAudio(audioBlob) {
  const openaiApiKey = getOpenAIApiKey()
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment or set it in the app.')
  }

  try {
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    formData.append('response_format', 'text')

    const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const transcript = await response.text()
    
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript received from Whisper')
    }

    return transcript.trim()
  } catch (error) {
    console.error('Transcribe audio error:', error)
    throw error
  }
}

function getOpenAIApiKey() {
  // Try environment variable first (for development)
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY
  }
  
  // Check localStorage for saved key
  const savedKey = localStorage.getItem('openaiApiKey')
  if (savedKey) {
    return savedKey
  }
  
  return null
} 