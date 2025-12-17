import { request } from "@strapi/helper-plugin";

// Helper function to handle API errors globally
const handleApiCall = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    // Re-throw the error so components can handle it if needed
    throw error;
  }
};

const projectRequests = {
  list: async (query) => {
    return handleApiCall(async () => {
      const response = await request("/gridly-integration/projects", {
        method: "GET",
        query,
      });
      return response;
    });
  },
  findOne: async (id) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${id}`, {
        method: "GET",
      });
      return response;
    });
  },
  createProject: async (data) => { 
    return handleApiCall(async () => {
      console.log('🚀 API: Creating project with data:', data);
      try {
      const response = await request("/gridly-integration/projects", {
        method: "POST",
        body: data,
      });
        console.log('✅ API: Project created successfully:', response);
      return response;
      } catch (error) {
        console.error('❌ API: Error creating project:', error);
        console.error('❌ API: Error response:', error.response);
        console.error('❌ API: Error response data:', error.response?.data);
        console.error('❌ API: Error response payload:', error.response?.payload);
        console.error('❌ API: Error response body:', error.response?.body);
        console.error('❌ API: Error response status:', error.response?.status);
        console.error('❌ API: Error response statusText:', error.response?.statusText);
        throw error;
      }
    });
  },
  deleteProject: async (id) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${id}`, {
        method: "DELETE",
      });
      return response;
    });
  },
  editProject: async (id, data) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${id}`, {
        method: "PUT",
        body: data,
      });
      return response;
    });
  },
  getLanguages: async () => {
    return handleApiCall(async () => {
      const response = await request("/gridly-integration/languages", {
        method: "GET",
      });
      return response;
    });
  },
  getGridlyConfigs: async () => {
    return handleApiCall(async () => {
      const response = await request("/gridly-integration/gridly-configs", {
        method: "GET",
      });
      return response;
    });
  },
  createGridlyConfig: async (data) => {
    return handleApiCall(async () => {
      const response = await request("/gridly-integration/gridly-configs", {
        method: "POST",
        body: data,
      });
      return response;
    });
  },
  editGridlyConfig: async (id, data) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/gridly-configs/${id}`, {
        method: "PUT",
        body: data,
      });
      return response;
    });
  },
  deleteGridlyConfig: async (id) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/gridly-configs/${id}`, {
        method: "DELETE",
      });
      return response;
    });
  },
  getContentTypes: async () => {
    return handleApiCall(async () => {
      const response = await request("/gridly-integration/content-types", {
        method: "GET",
      });
      return response;
    });
  },
  getContentTypeEntries: async (contentTypeUid) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/content-types/${contentTypeUid}/entries`, {
        method: "GET",
      });
      return response;
    });
  },
  sendContentToGridly: async (projectId, selectedContent, sourceLanguage) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${projectId}/send-to-gridly`, {
        method: "POST",
        body: {
          selectedContent,
          sourceLanguage
        },
      });
      return response;
    });
  },
  syncToGridly: async (projectId) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${projectId}/sync-to-gridly`, {
        method: "POST",
      });
      return response;
    });
  },
  importFromGridly: async (projectId, targetLanguages) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${projectId}/import-from-gridly`, {
        method: "POST",
        body: {
          targetLanguages
        },
      });
      return response;
    });
  },
  updateProgressFromGridly: async (projectId) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/projects/${projectId}/update-progress`, {
        method: "POST",
      });
      return response;
    });
  },
  testGridlyConnection: async (configId) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/gridly-configs/${configId}/test-connection`, {
        method: "GET",
      });
      return response;
    });
  },
  validateGridlyColumns: async (configId, sourceLanguage, targetLanguages) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/gridly-configs/${configId}/validate-columns`, {
        method: "POST",
        body: {
          sourceLanguage,
          targetLanguages
        },
      });
      return response;
    });
  },
  validateGridlyDependencies: async (configId, sourceLanguage, targetLanguages) => {
    return handleApiCall(async () => {
      const response = await request(`/gridly-integration/gridly-configs/${configId}/validate-dependencies`, {
        method: "POST",
        body: {
          sourceLanguage,
          targetLanguages
        },
      });
      return response;
    });
  },
};

export default projectRequests;