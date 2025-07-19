const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1'

export async function validateToken(token) {
  try {
    const response = await fetch(`${CLOCKIFY_API_BASE}/user`, {
      headers: {
        'X-Api-Key': token,
        'Content-Type': 'application/json'
      }
    })
    
    return response.ok
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

export async function getUserWorkspaces(token) {
  try {
    const response = await fetch(`${CLOCKIFY_API_BASE}/workspaces`, {
      headers: {
        'X-Api-Key': token,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch workspaces: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Get workspaces error:', error)
    throw error
  }
}

export async function getWorkspaceProjects(token, workspaceId) {
  try {
    const response = await fetch(`${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/projects`, {
      headers: {
        'X-Api-Key': token,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Get projects error:', error)
    throw error
  }
}

export async function getProjectTasks(token, workspaceId, projectId) {
  try {
    const response = await fetch(`${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
      headers: {
        'X-Api-Key': token,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Get tasks error:', error)
    throw error
  }
}

export async function getProjectsWithTasks(token, workspaceId) {
  try {
    const projects = await getWorkspaceProjects(token, workspaceId)
    const projectsWithTasks = []
    
    for (const project of projects) {
      try {
        const tasks = await getProjectTasks(token, workspaceId, project.id)
        projectsWithTasks.push({
          ...project,
          tasks: tasks || [],
          clientName: project.clientName || null
        })
      } catch (error) {
        console.warn(`Failed to fetch tasks for project ${project.name}:`, error)
        projectsWithTasks.push({
          ...project,
          tasks: [],
          clientName: project.clientName || null
        })
      }
    }
    
    return projectsWithTasks
  } catch (error) {
    console.error('Get projects with tasks error:', error)
    throw error
  }
}

export async function submitTimeEntries(token, entries) {
  try {
    // First get the user's default workspace
    const workspaces = await getUserWorkspaces(token)
    if (!workspaces || workspaces.length === 0) {
      throw new Error('No workspaces found')
    }
    
    const defaultWorkspace = workspaces[0]
    const workspaceId = defaultWorkspace.id
    
    // Get projects with their tasks and client info
    const projects = await getProjectsWithTasks(token, workspaceId)
    const projectMap = new Map(projects.map(p => [p.name.toLowerCase(), p]))
    
    // Create client-to-project mapping for client-based project lookup
    const clientProjectMap = new Map()
    projects.forEach(project => {
      if (project.clientName) {
        const clientKey = project.clientName.toLowerCase()
        if (!clientProjectMap.has(clientKey)) {
          clientProjectMap.set(clientKey, [])
        }
        clientProjectMap.get(clientKey).push(project)
      }
    })
    
    // Submit each entry
    const results = []
    for (const entry of entries) {
      try {
        // Find project ID and task ID if project name is provided
        let projectId = null
        let taskId = null
        let resolvedProject = null
        
        if (entry.project) {
          // First try direct project name match
          resolvedProject = projectMap.get(entry.project.toLowerCase())
          
          // If no direct match, try client name match
          if (!resolvedProject) {
            const clientProjects = clientProjectMap.get(entry.project.toLowerCase())
            if (clientProjects && clientProjects.length > 0) {
              // If multiple projects for same client, take the first one
              // Could be enhanced to be smarter about selection
              resolvedProject = clientProjects[0]
              console.log(`Found project "${resolvedProject.name}" via client "${entry.project}"`)
            }
          }
          
          if (resolvedProject) {
            projectId = resolvedProject.id
            
            // Look for task if specified
            if (entry.task && resolvedProject.tasks && resolvedProject.tasks.length > 0) {
              const task = resolvedProject.tasks.find(t => 
                t.name.toLowerCase() === entry.task.toLowerCase()
              )
              if (task) {
                taskId = task.id
                console.log(`Found task "${entry.task}" for project "${resolvedProject.name}"`)
              } else {
                console.warn(`Task "${entry.task}" not found in project "${resolvedProject.name}"`)
              }
            }
          } else {
            console.warn(`Project or client "${entry.project}" not found, submitting without project`)
          }
        }
        
        const timeEntryData = {
          start: entry.start,
          end: entry.end,
          description: entry.description,
          projectId: projectId || null,
          taskId: taskId || null,
          tagIds: []
        }
        
        console.log('Submitting time entry:', timeEntryData)
        
        const response = await fetch(`${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/time-entries`, {
          method: 'POST',
          headers: {
            'X-Api-Key': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(timeEntryData)
        })
        
        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`Failed to submit entry: ${response.status} - ${errorData}`)
        }
        
        const result = await response.json()
        results.push(result)
      } catch (entryError) {
        console.error('Error submitting individual entry:', entryError)
        throw new Error(`Failed to submit entry "${entry.description}": ${entryError.message}`)
      }
    }
    
    return results
  } catch (error) {
    console.error('Submit time entries error:', error)
    throw error
  }
} 