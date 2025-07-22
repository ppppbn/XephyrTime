import { PublicClientApplication } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { startOfWeek, endOfWeek, format } from 'date-fns'

// MSAL configuration - you'll need to register an app in Azure AD
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'your-azure-app-client-id',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
}

const loginRequest = {
  scopes: ['User.Read', 'Calendars.Read']
}

class MicrosoftCalendarApiService {
  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig)
    this.graphClient = null
    this.account = null
  }

  async initialize() {
    await this.msalInstance.initialize()
    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      this.account = accounts[0]
      await this.initializeGraphClient()
    }
  }

  async signIn() {
    try {
      const loginResponse = await this.msalInstance.loginPopup(loginRequest)
      this.account = loginResponse.account
      await this.initializeGraphClient()
      return true
    } catch (error) {
      console.error('Sign in failed:', error)
      throw new Error('Microsoft sign-in failed: ' + error.message)
    }
  }

  async signOut() {
    await this.msalInstance.logout()
    this.account = null
    this.graphClient = null
  }

  isSignedIn() {
    return this.account !== null
  }

  getUserName() {
    return this.account?.name || this.account?.username || 'Unknown User'
  }

  async initializeGraphClient() {
    if (!this.account) return

    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const tokenRequest = {
            scopes: loginRequest.scopes,
            account: this.account
          }
          const response = await this.msalInstance.acquireTokenSilent(tokenRequest)
          done(null, response.accessToken)
        } catch (error) {
          console.error('Token acquisition failed:', error)
          done(error, null)
        }
      }
    })
  }

  async getCalendarEventsForWeek(date = new Date()) {
    if (!this.graphClient) {
      throw new Error('Not authenticated. Please sign in first.')
    }

    try {
      // Calculate week boundaries (Monday to Sunday)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      
      // Format dates for Microsoft Graph API
      const startTime = format(weekStart, "yyyy-MM-dd'T'00:00:00.000'Z'")
      const endTime = format(weekEnd, "yyyy-MM-dd'T'23:59:59.999'Z'")

      console.log(`Fetching calendar events from ${startTime} to ${endTime}`)

      // Fetch calendar events with response status for better filtering
      const events = await this.graphClient
        .api('/me/events')
        .filter(`start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'`)
        .select('subject,start,end,location,attendees,organizer,isAllDay,showAs,responseStatus')
        .orderby('start/dateTime')
        .get()

      console.log('Fetched calendar events:', events.value)
      return events.value || []
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      throw new Error('Failed to fetch Teams calendar events: ' + error.message)
    }
  }

  convertCalendarEventsToTimeEntries(events, defaultProject = null) {
    return events
      .filter(event => {
        // Filter out all-day events and only truly irrelevant meetings
        if (event.isAllDay) return false
        
        // Filter out free time (blocked time that isn't a real meeting)
        if (event.showAs === 'free') return false
        
        // Filter out declined meetings (but keep tentative, busy, etc.)
        if (event.responseStatus && event.responseStatus.response === 'declined') return false
        
        return true
      })
      .map(event => {
        // Extract meeting info
        const subject = event.subject || 'Meeting'
        const startTime = new Date(event.start.dateTime)
        const endTime = new Date(event.end.dateTime)
        
        // Try to extract client/project info from meeting title
        let projectName = defaultProject
        let description = subject

        // Look for common patterns in meeting titles that might indicate project/client
        const projectPatterns = [
          /\b([A-Z]{3,})\b/g, // Capital letter acronyms (like XMAP, ACME)
          /\[(.*?)\]/g,       // Text in brackets [ProjectName]
          /\-(.*?)\-/g        // Text between dashes -ProjectName-
        ]

        for (const pattern of projectPatterns) {
          const matches = subject.match(pattern)
          if (matches && matches.length > 0) {
            const potentialProject = matches[0].replace(/[\[\]\-]/g, '').trim()
            if (potentialProject.length >= 3) {
              projectName = potentialProject
              break
            }
          }
        }

        // Clean up description
        if (projectName && subject.includes(projectName)) {
          description = subject.replace(projectName, '').replace(/[\[\]\-]/g, '').trim()
          if (description.length === 0) {
            description = 'Meeting'
          }
        }

        // Add location context if available
        if (event.location && event.location.displayName) {
          description += ` (${event.location.displayName})`
        }

        return {
          project: projectName,
          task: null, // Will be assigned by AI
          description: description,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          source: 'teams-calendar'
        }
      })
  }
}

// Export singleton instance
export const microsoftCalendarApi = new MicrosoftCalendarApiService()
export default microsoftCalendarApi 