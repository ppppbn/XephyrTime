import { startOfWeek, endOfWeek, addDays, format, isMonday } from 'date-fns'
import { validateToken, getProjectsWithTasks, getUserWorkspaces } from './clockifyApi'

const OPENAI_API_BASE = 'https://api.openai.com/v1'

// Helper function to get current week boundaries using date-fns
function getCurrentWeekInfo() {
  const now = new Date()
  
  // Get Monday of current week (date-fns handles all edge cases)
  const monday = startOfWeek(now, { weekStartsOn: 1 }) // 1 = Monday
  const friday = addDays(monday, 4)
  const sunday = endOfWeek(now, { weekStartsOn: 1 })
  
  // Calculate all weekdays starting from Monday
  const weekdays = []
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i)
    weekdays.push({
      name: dayNames[i],
      date: format(day, 'yyyy-MM-dd')
    })
  }
  
  // Debug logging with verification
  console.log('Week calculation debug (date-fns):', {
    today: format(now, 'EEE MMM dd yyyy'),
    todayDayOfWeek: format(now, 'EEEE'),
    mondayCalculated: format(monday, 'EEE MMM dd yyyy'),
    mondayVerification: isMonday(monday) ? 'VERIFIED: Monday' : 'ERROR: Not Monday!',
    weekdays: weekdays.map(w => `${w.name}: ${w.date} (${format(new Date(w.date), 'EEEE')})`)
  })
  
  return {
    monday: format(monday, 'yyyy-MM-dd'),
    friday: format(friday, 'yyyy-MM-dd'),
    currentDay: now.getDay(),
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdays
  }
}

// Helper function to round current time to 15-minute intervals
function getCurrentRoundedTime() {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = Math.round(minutes / 15) * 15
  
  const rounded = new Date(now)
  rounded.setMinutes(roundedMinutes)
  rounded.setSeconds(0)
  rounded.setMilliseconds(0)
  
  // If rounded to 60, move to next hour
  if (rounded.getMinutes() === 60) {
    rounded.setHours(rounded.getHours() + 1)
    rounded.setMinutes(0)
  }
  
  return rounded.toISOString()
}

async function getProjectsWithTasksForPrompt(apiToken) {
  try {
    if (!apiToken) return []
    
    // Validate token first
    const isValid = await validateToken(apiToken)
    if (!isValid) return []
    
    // Get workspaces
    const workspaces = await getUserWorkspaces(apiToken)
    if (!workspaces || workspaces.length === 0) return []
    
    // Get projects with tasks
    const projects = await getProjectsWithTasks(apiToken, workspaces[0].id)
    return projects
  } catch (error) {
    console.warn('Failed to fetch projects for prompt:', error)
    return []
  }
}

function buildProjectsSection(projects) {
  if (!projects || projects.length === 0) {
    return "No projects available."
  }
  
  let section = "Available Projects and Tasks:\n"
  
  projects.forEach(project => {
    section += `- Project: "${project.name}"`
    if (project.tasks && project.tasks.length > 0) {
      section += `\n  Tasks: ${project.tasks.map(t => `"${t.name}"`).join(', ')}`
    } else {
      section += `\n  Tasks: No tasks available`
    }
    section += `\n`
  })
  
  return section
}

export async function parseCommand(command) {
  const openaiApiKey = getOpenAIApiKey()
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment or set it in the app.')
  }

  // Get stored Clockify token to fetch projects
  const clockifyToken = localStorage.getItem('clockifyToken')
  const projects = await getProjectsWithTasksForPrompt(clockifyToken)
  
  const weekInfo = getCurrentWeekInfo()
  const currentRoundedTime = getCurrentRoundedTime()
  const projectsSection = buildProjectsSection(projects)

  const SYSTEM_PROMPT = `You are a time entry parser for Clockify. Convert natural language instructions into JSON arrays of time entries.

Current date/time context:
- Today is ${new Date().toLocaleDateString()} (${weekInfo.dayNames[weekInfo.currentDay]})
- Current time is ${new Date().toLocaleTimeString()}
- Current time rounded to 15min: ${new Date(currentRoundedTime).toLocaleTimeString()}
- Default timezone is ${Intl.DateTimeFormat().resolvedOptions().timeZone}

CRITICAL: THIS WEEK's dates (Monday to Sunday):
- Monday this week = ${weekInfo.weekdays[0].date}
- Tuesday this week = ${weekInfo.weekdays[1].date}
- Wednesday this week = ${weekInfo.weekdays[2].date}
- Thursday this week = ${weekInfo.weekdays[3].date}
- Friday this week = ${weekInfo.weekdays[4].date}
- Saturday this week = ${weekInfo.weekdays[5].date}
- Sunday this week = ${weekInfo.weekdays[6].date}

${projectsSection}

Task Assignment Rules:
1. If the user explicitly mentions a task name that matches exactly, use it
2. If no task is explicitly mentioned, try to guess the most appropriate task based on:
   - The activity description (e.g., "meeting" might match "Daily Standup")
   - The context (e.g., "bug fix" might match "Development" or "Bug Fixes")
3. If you cannot confidently match a task, leave the task field as null
4. Task matching should be case-insensitive
5. Prefer exact matches over partial matches

Week interpretation rules:
- "This week" = the 7-day period containing today (Monday to Sunday)
- "Next week" = the 7-day period after this week
- "Last week" = the 7-day period before this week
- ALWAYS use the exact dates provided above for "this week" references

Default time behaviors:
1. If NO time period mentioned (e.g., "Log 2 hours working with marketer"):
   - Start time: current time rounded to 15-minute intervals (${new Date(currentRoundedTime).toLocaleTimeString()})
   - Duration: as specified in command
2. If NO time specified but period mentioned (e.g., "Log meeting this week"):
   - Default to "this week" (Monday ${weekInfo.monday} to Friday ${weekInfo.friday})
   - Default time: 9:00 AM if no specific time given
3. Always round start/end times to 15-minute intervals: :00, :15, :30, :45

Rules:
1. Output ONLY a JSON array, no other text
2. Each entry must have: project, task, description, start, end (ISO 8601 format with timezone)
3. If project is missing, set to null
4. If task cannot be identified/guessed, set to null
5. For recurring entries (e.g., "every workday this week"), expand to separate entries
6. Default to current year dates only
7. Handle relative dates carefully - "this week" means the week containing TODAY
8. Round all times to 15-minute intervals (:00, :15, :30, :45)
9. For "workdays", use Monday-Friday only
10. If no time specified, start from current rounded time: ${currentRoundedTime}
11. NEVER confuse Sunday with Monday - double-check day calculations

Output schema:
[{"project":"ProjectName","task":"TaskName","description":"Task description","start":"2025-01-13T09:00:00-08:00","end":"2025-01-13T10:00:00-08:00"}]

Examples with current context (today is ${weekInfo.dayNames[weekInfo.currentDay]}):
- "Log 2 hours coding to Project Alpha starting now" → start from ${currentRoundedTime}, duration 2h, try to guess development-related task
- "Log 30 minutes standup every workday this week 9-9:30am" → Mon-Fri of current week, try to match "standup" to appropriate task
- "Log 2 hours working with marketer" → start from ${currentRoundedTime}, duration 2h, no project, task=null
- "Monday this week meeting" → Monday ${weekInfo.weekdays[0].date} at 9:00 AM, try to guess meeting-related task
- "Lock 2 hours researching Monday 10am this week" → Monday ${weekInfo.weekdays[0].date} 10:00-12:00 AM, try to guess research-related task
- "Yesterday 3pm to 5pm working on bug fixes for BETA project" → yesterday with specified times, try to match bug-related task`

  // Log the full system prompt for debugging
  console.log('System prompt being sent:', SYSTEM_PROMPT)
  console.log('User command:', command)
  console.log('Available projects:', projects.map(p => ({ name: p.name, tasks: p.tasks?.map(t => t.name) || [] })))

  try {
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: command
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    console.log('AI response:', content)

    // Parse the JSON response
    let entries
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : content
      entries = JSON.parse(jsonString)
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON: ${content}`)
    }

    console.log('Parsed entries:', entries)

    // Validate entries
    if (!Array.isArray(entries)) {
      throw new Error('Response is not an array')
    }

    for (const entry of entries) {
      if (!entry.description) {
        throw new Error('Entry missing description')
      }
      if (!entry.start || !entry.end) {
        throw new Error('Entry missing start or end time')
      }
      
      // Capitalize first letter of description
      entry.description = entry.description.charAt(0).toUpperCase() + entry.description.slice(1)
      
      // Validate dates
      const startDate = new Date(entry.start)
      const endDate = new Date(entry.end)
      const currentYear = new Date().getFullYear()
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format in entry')
      }
      
      if (startDate.getFullYear() !== currentYear || endDate.getFullYear() !== currentYear) {
        throw new Error('Dates must be in current year')
      }
      
      if (startDate >= endDate) {
        throw new Error('Start time must be before end time')
      }
    }

    return entries
  } catch (error) {
    console.error('Parse command error:', error)
    throw error
  }
}

function getOpenAIApiKey() {
  // Try environment variable first (for development)
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY
  }
  
  // For production, you could prompt user for API key or use a different method
  const savedKey = localStorage.getItem('openaiApiKey')
  if (savedKey) {
    return savedKey
  }
  
  // Prompt user for API key if not found
  const userKey = prompt('Please enter your OpenAI API key (this will be saved locally):')
  if (userKey) {
    localStorage.setItem('openaiApiKey', userKey)
    return userKey
  }
  
  return null
} 