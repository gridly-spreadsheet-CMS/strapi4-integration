import React, { useState, useEffect } from 'react';
import { LoadingIndicatorPage } from "@strapi/helper-plugin";
import { Layout, BaseHeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { EmptyStateLayout } from "@strapi/design-system/EmptyStateLayout";
import { Button } from "@strapi/design-system/Button";
import Plus from "@strapi/icons/Plus";
import { Illo } from "../../components/Illo";
import ConfigModal from "../../components/ConfigModal";
import ConfigTable from "../../components/ConfigTable";
import projectRequests from "../../api/gridly-integration";

const ConfigurationsPage = () => {
  const [configData, setConfigData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [configToEdit, setConfigToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (isLoading === false) setIsLoading(true);

    try {
      const configs = await projectRequests.getGridlyConfigs();
      setConfigData(configs);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initFetchData = async () => {
      await fetchData();
    };

    initFetchData();
  }, []);

  async function addConfig(data) {
    await projectRequests.createGridlyConfig(data);
    await fetchData();      
  }

  async function deleteConfig(data) {
    await projectRequests.deleteGridlyConfig(data.id);
    await fetchData();
  }

  async function editConfig(id, data) {
    await projectRequests.editGridlyConfig(id, data);
    await fetchData();
  }

  function handleEditConfig(config) {
    setConfigToEdit(config);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setConfigToEdit(null);
  }
  
  if (isLoading) return <LoadingIndicatorPage />;

  return (
    <Layout>
      <BaseHeaderLayout
        title="Gridly Configurations"
        subtitle="Manage your Gridly API configurations"
        as="h2"/>
      <ContentLayout>
        {configData.length === 0
        ? (
          <EmptyStateLayout
            icon={<Illo />}
            content="You don't have any Gridly configurations yet..."
            action={
              <Button
                onClick={() => setShowModal(true)}
                variant="secondary"
                startIcon={<Plus />}
              >
                Add your first configuration
              </Button>
            }
          />
        )
        : (
           <>           
             <ConfigTable
              configData={configData}
              setShowModal={setShowModal}
              deleteConfig={deleteConfig}
              editConfig={handleEditConfig}
            />
            </>
        )
  }
      </ContentLayout>
      {showModal && (
        <ConfigModal 
          setShowModal={handleCloseModal} 
          addConfig={addConfig} 
          editConfig={editConfig}
          configToEdit={configToEdit}
        />
      )}
    </Layout>
  );
};

export default ConfigurationsPage; 