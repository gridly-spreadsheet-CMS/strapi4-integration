/*
 *
 * HomePage
 *
 */

import React, { useState, useEffect } from 'react';
import { LoadingIndicatorPage } from "@strapi/helper-plugin";
import { Layout, BaseHeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { EmptyStateLayout } from "@strapi/design-system/EmptyStateLayout";
import { Button } from "@strapi/design-system/Button";
import { Flex } from "@strapi/design-system/Flex";
import { Box } from "@strapi/design-system/Box";
import Plus from "@strapi/icons/Plus";
import { Illo } from "../../components/Illo";
import ProjectModal from "../../components/ProjectModal";
import ProjectCount from '../../components/ProjectCount';
import ProjectTable from '../../components/ProjectTable';
import ConfigurationsModal from "../../components/ConfigurationsModal";
import SyncNotification from "../../components/SyncNotification";
import projectRequests from "../../api/gridly-integration.js";
import { useError } from "../../contexts/ErrorContext.js";
import { useProjectUpdates } from "../../hooks/useProjectUpdates.js";
import { ProjectUpdateProvider } from "../../contexts/ProjectUpdateContext.js";

const HomePage = () => {
  const [showModal, setShowModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the custom hook for efficient project updates
  const { projects: projectData, updateProject, fetchUpdates, setInitialProjects } = useProjectUpdates();
  
  // Configuration states
  const [configData, setConfigData] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Error handling
  const { handleApiError } = useError();

    const fetchData = async () => {
    if (isLoading === false) setIsLoading(true);

    try {
      const project = await projectRequests.list();
      setInitialProjects(project);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

    useEffect(() => {
    const initFetchData = async () => {
      await fetchData();
    };

    initFetchData();

    // Set up polling to refresh data every 30 seconds to show background sync updates
    const pollInterval = setInterval(() => {
      // Only fetch updated projects instead of all data
      fetchUpdates();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  async function addProject(data) {
    try {
      await projectRequests.createProject(data);
      await fetchData();
    } catch (error) {
      // Re-throw the error so the ProjectModal can catch it
      throw error;
    }
  }


  async function deleteProject(data) {
    try {
      await projectRequests.deleteProject(data.id);
      await fetchData();
    } catch (error) {
      throw error;
    }
  }

  async function editProject(id, data) {
    try {
      await projectRequests.editProject(id, data);
      await fetchData();
    } catch (error) {
      throw error;
    }
  }

  async function syncProject(projectId) {
    try {
      await projectRequests.syncToGridly(projectId);
      // Update the specific project that was synced
      await fetchUpdates();
    } catch (error) {
      handleApiError(error);
    }
  }

  async function importFromGridly(projectId, targetLanguage) {
    try {
      console.log('🔄 Importing translations for project:', projectId, 'language:', targetLanguage);
      await projectRequests.importFromGridly(projectId, [targetLanguage]);
      await fetchData();
    } catch (error) {
      handleApiError(error);
    }
  }

  function handleEditProject(project) {
    setProjectToEdit(project);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setProjectToEdit(null);
  }

  // Configuration functions
  const fetchConfigData = async () => {
    try {
      const configs = await projectRequests.getGridlyConfigs();
      setConfigData(configs);
    } catch (error) {
      handleApiError(error);
    }
  };

  async function addConfig(data) {
    try {
      await projectRequests.createGridlyConfig(data);
      await fetchConfigData();
    } catch (error) {
      handleApiError(error);
    }
  }

  async function deleteConfig(data) {
    try {
      await projectRequests.deleteGridlyConfig(data.id);
      await fetchConfigData();
    } catch (error) {
      handleApiError(error);
    }
  }

  async function editConfig(id, data) {
    try {
      await projectRequests.editGridlyConfig(id, data);
      await fetchConfigData();
    } catch (error) {
      handleApiError(error);
    }
  }

  function handleCloseConfigModal() {
    setShowConfigModal(false);
  }

  function openConfigModal() {
    fetchConfigData();
    setShowConfigModal(true);
  }
  
  if (isLoading) return <LoadingIndicatorPage />;

  return (
    <ProjectUpdateProvider updateProject={updateProject} fetchUpdates={fetchUpdates}>
      <Layout>
        <SyncNotification />
        <BaseHeaderLayout
        title="Gridly Integration"
        subtitle="Manage your Gridly integration settings"
        as="h2"

      />
      <ContentLayout>
        <Box padding={4} background="neutral0" hasRadius={true} shadow="filterShadow" style={{ marginBottom: "20px" }}>
          <Flex gap={2} justifyContent="space-between" alignItems="center">
            <Box>
              <Button
                onClick={fetchUpdates}
                variant="tertiary"
                size="S"
              >
                🔄 Refresh
              </Button>
            </Box>
            <Button
              onClick={openConfigModal}
              variant="secondary"
            >
              Gridly Configurations
            </Button>
          </Flex>
        </Box>
        
        {projectData.length === 0 ? (
          <EmptyStateLayout
            icon={<Illo />}
            content="You don't have any projects yet..."
            action={
              <Button
                onClick={() => setShowModal(true)}
                variant="secondary"
                startIcon={<Plus />}
              >
                Add your first project
              </Button>
            }
          />
        ) : (
          <>
            <ProjectCount count={projectData.length} />
            <ProjectTable
              projectData={projectData}
              setShowModal={setShowModal}
              deleteProject={deleteProject}
              editProject={handleEditProject}
              syncProject={syncProject}
              importFromGridly={importFromGridly}
            />
          </>
        )}
      </ContentLayout>
      {showModal && (
        <ProjectModal 
          setShowModal={handleCloseModal} 
          addProject={addProject} 
          editProject={editProject}
          projectToEdit={projectToEdit}
        />
      )}
      {showConfigModal && (
        <ConfigurationsModal 
          setShowModal={handleCloseConfigModal} 
          configData={configData}
          addConfig={addConfig} 
          deleteConfig={deleteConfig}
          editConfig={editConfig}
        />
      )}
      </Layout>
    </ProjectUpdateProvider>
  );
};

export default HomePage;
