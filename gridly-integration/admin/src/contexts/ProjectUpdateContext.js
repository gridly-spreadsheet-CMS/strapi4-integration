import React, { createContext, useContext } from 'react';

const ProjectUpdateContext = createContext();

export const useProjectUpdate = () => {
  const context = useContext(ProjectUpdateContext);
  if (!context) {
    throw new Error('useProjectUpdate must be used within a ProjectUpdateProvider');
  }
  return context;
};

export const ProjectUpdateProvider = ({ children, updateProject, fetchUpdates }) => {
  return (
    <ProjectUpdateContext.Provider value={{ updateProject, fetchUpdates }}>
      {children}
    </ProjectUpdateContext.Provider>
  );
}; 