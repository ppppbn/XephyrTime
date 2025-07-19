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
          tasks: tasks || []
        })
      } catch (error) {
        console.warn(`Failed to fetch tasks for project ${project.name}:`, error)
        projectsWithTasks.push({
          ...project,
          tasks: []
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
    
    // Get projects with their tasks
    const projects = await getProjectsWithTasks(token, workspaceId)
    const projectMap = new Map(projects.map(p => [p.name.toLowerCase(), p]))
    
    // Submit each entry
    const results = []
    for (const entry of entries) {
      try {
        // Find project ID and task ID if project name is provided
        let projectId = null
        let taskId = null
        
        if (entry.project) {
          const project = projectMap.get(entry.project.toLowerCase())
          if (project) {
            projectId = project.id
            
            // Look for task if specified
            if (entry.task && project.tasks && project.tasks.length > 0) {
              const task = project.tasks.find(t => 
                t.name.toLowerCase() === entry.task.toLowerCase()
              )
              if (task) {
                taskId = task.id
                console.log(`Found task "${entry.task}" for project "${entry.project}"`)
              } else {
                console.warn(`Task "${entry.task}" not found in project "${entry.project}"`)
              }
            }
          } else {
            console.warn(`Project "${entry.project}" not found, submitting without project`)
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