import { useState, useCallback } from 'react';
import projectRequests from '../api/gridly-integration.js';

export const useProjectUpdates = (initialProjects = []) => {
  const [projects, setProjects] = useState(initialProjects);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Update a single project efficiently
  const updateProject = useCallback((projectId, updatedData) => {
    setProjects(prevProjects => {
      const projectIndex = prevProjects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        const updatedProjects = [...prevProjects];
        updatedProjects[projectIndex] = { ...updatedProjects[projectIndex], ...updatedData };
        return updatedProjects;
      }
      return prevProjects;
    });
  }, []);

  // Update multiple projects efficiently
  const updateProjects = useCallback((updatedProjectsList) => {
    setProjects(prevProjects => {
      const updatedProjects = [...prevProjects];
      
      updatedProjectsList.forEach(updatedProject => {
        const existingIndex = updatedProjects.findIndex(p => p.id === updatedProject.id);
        if (existingIndex !== -1) {
          // Only update if there are actual changes
          const existing = updatedProjects[existingIndex];
          const hasChanges = 
            existing['last-sync'] !== updatedProject['last-sync'] ||
            existing['records-sent'] !== updatedProject['records-sent'] ||
            existing['overall-progress'] !== updatedProject['overall-progress'] ||
            existing['total-records'] !== updatedProject['total-records'];
          
          if (hasChanges) {
            updatedProjects[existingIndex] = updatedProject;
          }
        } else {
          // New project
          updatedProjects.push(updatedProject);
        }
      });
      
      return updatedProjects;
    });
  }, []);

  // Fetch only changed projects
  const fetchUpdates = useCallback(async () => {
    try {
      const updatedProjects = await projectRequests.list();
      updateProjects(updatedProjects);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error fetching project updates:', error);
    }
  }, [updateProjects]);

  // Initialize projects
  const setInitialProjects = useCallback((newProjects) => {
    setProjects(newProjects);
  }, []);

  return {
    projects,
    lastUpdateTime,
    updateProject,
    updateProjects,
    fetchUpdates,
    setInitialProjects
  };
}; 