import React, { useState, useEffect } from "react";

import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Typography,
  Button,
  TextInput,
  Select,
  Option,
  Stack,
  Badge,
  Box,
} from "@strapi/design-system";
import projectRequests from "../../api/gridly-integration.js";
import ContentSelector from "../ContentSelector";
import { useError } from "../../contexts/ErrorContext.js";

export default function ProjectModal({ setShowModal, addProject, editProject, projectToEdit }) {
  const [name, setName] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [gridlyConfigId, setGridlyConfigId] = useState("");
  const [selectedContent, setSelectedContent] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [gridlyConfigs, setGridlyConfigs] = useState([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // Error handling
  const { handleApiError } = useError();

  const handleSubmit = async (e) => {
    // Prevent submitting parent form
    e.preventDefault();
    e.stopPropagation();

    // Clear any previous modal errors
    setModalError(null);
    setIsSubmitting(true);

    try {
      const projectData = {
        name: name,
        "source-language": sourceLanguage,
        targetLanguages: targetLanguages,
        gridlyConfigId: gridlyConfigId || null,
        "selected-content": selectedContent,
      };

      if (isEditMode) {
        await editProject(projectToEdit.id, projectData);
      } else {
        await addProject(projectData);
      }
      
      // Only close modal on success
      setShowModal(false);
    } catch (e) {
      console.log('🔍 ProjectModal: Caught error in handleSubmit');
      // Extract error message for modal display
      let errorMessage = "Failed to create project";
      let errorDetails = null;
      
      console.log('🔍 Error object:', e);
      console.log('🔍 Error response:', e.response);
      console.log('🔍 Error response data:', e.response?.data);
      console.log('🔍 Error response status:', e.response?.status);
      console.log('🔍 Error response headers:', e.response?.headers);
      console.log('🔍 Error response data type:', typeof e.response?.data);
      console.log('🔍 Error response data keys:', e.response?.data ? Object.keys(e.response.data) : 'no data');
      console.log('🔍 Error response payload:', e.response?.payload);
      console.log('🔍 Error response body:', e.response?.body);
      console.log('🔍 Error response text:', e.response?.text);
      console.log('🔍 Error response json:', e.response?.json);
      
      // Try to extract error message from different possible locations
      if (e.response?.data?.error) {
        // Our new direct error format
        errorMessage = e.response.data.error;
        errorDetails = e.response.data.details;
      } else if (e.response?.payload?.error) {
        // Error might be in payload
        errorMessage = e.response.payload.error;
        errorDetails = e.response.payload.details;
      } else if (e.response?.body?.error) {
        // Error might be in body
        errorMessage = e.response.body.error;
        errorDetails = e.response.body.details;
      } else if (e.response?.data?.details?.message) {
        // Backend returns error in details.message format
        errorMessage = e.response.data.details.message;
        errorDetails = e.response.data.details;
      } else if (e.response?.data?.message) {
        errorMessage = e.response.data.message;
        errorDetails = e.response.data.details;
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      console.log('📝 Extracted error message:', errorMessage);
      console.log('📝 Extracted error details:', errorDetails);
      console.log('📝 Setting modal error to:', modalError);
      
      // Show detailed error message
      if (errorDetails) {
        setModalError(`${errorMessage}\n\nDetails: ${JSON.stringify(errorDetails, null, 2)}`);
      } else {
        setModalError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getError = () => {
    // Form validation error
    if (name.length > 40) {
      return "Name is too long (max 40 characters)";
    }
    if (name.length === 0) {
      return "Name is required";
    }
    if (sourceLanguage.length === 0) {
      return "Source language is required";
    }
    if (targetLanguages.length === 0) {
      return "At least one target language is required";
    }
    if (targetLanguages.includes(sourceLanguage)) {
      return "Source and target languages must be different";
    }

    return null;
  };

  const isFormValid = () => {
    return name.length > 0 && 
           name.length <= 40 && 
           sourceLanguage.length > 0 && 
           targetLanguages.length > 0 && 
           !targetLanguages.includes(sourceLanguage);
  };

  // Fetch languages when component mounts
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languagesData = await projectRequests.getLanguages();
        setLanguages(languagesData);
      } catch (error) {
        console.error("Error fetching languages:", error);
        // Fallback to empty array if API fails
        setLanguages([]);
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    const fetchGridlyConfigs = async () => {
      try {
        const configsData = await projectRequests.getGridlyConfigs();
        setGridlyConfigs(configsData);
      } catch (error) {
        console.error("Error fetching Gridly configs:", error);
        // Fallback to empty array if API fails
        setGridlyConfigs([]);
      } finally {
        setIsLoadingConfigs(false);
      }
    };

    fetchLanguages();
    fetchGridlyConfigs();
  }, []);

  // Handle edit mode - populate form with existing data
  useEffect(() => {
    if (projectToEdit) {
      setIsEditMode(true);
      setName(projectToEdit.name || "");
      setSourceLanguage(projectToEdit["source-language"] || "");
      // Extract target languages from subprojects
      const existingTargetLanguages = projectToEdit.subprojects?.map(sub => sub["target-language"]) || [];
      setTargetLanguages(existingTargetLanguages);
      // Load selected content
      setSelectedContent(projectToEdit["selected-content"] || []);
      // Load Gridly configuration if it exists
      console.log('🔍 Project to edit:', projectToEdit);
      console.log('🔍 Gridly config ID:', projectToEdit["gridly-config-id"]);
      
      let configId = "";
      if (projectToEdit["gridly-config-id"]) {
        // Handle both relation object and direct ID
        if (typeof projectToEdit["gridly-config-id"] === 'object' && projectToEdit["gridly-config-id"].id) {
          configId = projectToEdit["gridly-config-id"].id.toString();
        } else {
          configId = projectToEdit["gridly-config-id"].toString();
        }
      }
      setGridlyConfigId(configId);
    } else {
      setIsEditMode(false);
      setName("");
      setSourceLanguage("");
      setTargetLanguages([]);
      setSelectedContent([]);
      setGridlyConfigId("");
    }
  }, [projectToEdit]);



  return (
    <ModalLayout
      onClose={() => {
        setShowModal(false);
        setModalError(null);
      }}
      labelledBy="title"
      as="form"
      onSubmit={handleSubmit}
    >
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {isEditMode ? "Edit Project" : "Add New Project"}
        </Typography>
      </ModalHeader>

      <ModalBody>
        {modalError && (
          <Box padding={3} background="danger100" hasRadius={true} marginBottom={4}>
            <Typography textColor="danger700" fontWeight="bold" marginBottom={2}>
              ❌ Error
            </Typography>
            <Typography textColor="danger700" style={{ whiteSpace: 'pre-wrap' }}>
              {modalError}
            </Typography>
          </Box>
        )}
        <Stack spacing={4}>
          <TextInput
            placeholder="Enter project name"
            label="Project Name *"
            name="name"
            hint="Max 40 characters"
            error={getError()}
            onChange={(e) => {
              setName(e.target.value);
              setModalError(null);
            }}
            value={name}
            required
          />

          <Select
            label="Source Language *"
            placeholder={isLoadingLanguages ? "Loading languages..." : "Select source language"}
            value={sourceLanguage}
            onChange={(value) => {
              setSourceLanguage(value);
              setModalError(null);
            }}
            required
            disabled={isLoadingLanguages}
          >
            {languages.map((lang) => (
              <Option key={lang.value} value={lang.value}>
                <Stack horizontal spacing={2} alignItems="center">
                  <Typography>{lang.label}</Typography>
                  {lang.isDefault && (
                    <Badge size="S" textColor="primary600" backgroundColor="primary100">
                      Default
                    </Badge>
                  )}
                </Stack>
              </Option>
            ))}
          </Select>

          <Box>
            <Typography variant="pi" fontWeight="bold" textColor="neutral800" marginBottom={2}>
              Target Languages *
            </Typography>
            
            {/* Select All Button */}
            <Box marginBottom={2}>
              <Button
                variant="secondary"
                size="S"
                onClick={() => {
                  const availableTargetLanguages = languages
                    .filter(lang => lang.value !== sourceLanguage)
                    .map(lang => lang.value);
                  
                  // If all languages are selected, deselect all. Otherwise, select all.
                  if (targetLanguages.length === availableTargetLanguages.length) {
                    setTargetLanguages([]);
                  } else {
                    setTargetLanguages(availableTargetLanguages);
                  }
                  setModalError(null);
                }}
                disabled={isLoadingLanguages || !sourceLanguage}
              >
                {targetLanguages.length === languages.filter(lang => lang.value !== sourceLanguage).length 
                  ? "Deselect All" 
                  : "Select All"}
              </Button>
            </Box>
            
            <Select
              placeholder={isLoadingLanguages ? "Loading languages..." : "Select target languages"}
              value={targetLanguages}
              onChange={(value) => {
                setTargetLanguages(value);
                setModalError(null);
              }}
              required
              disabled={isLoadingLanguages}
              multi
            >
              {languages
                .filter(lang => lang.value !== sourceLanguage) // Exclude source language
                .map((lang) => (
                  <Option key={lang.value} value={lang.value}>
                    <Stack horizontal spacing={2} alignItems="center">
                      <Typography>{lang.label}</Typography>
                      {lang.isDefault && (
                        <Badge size="S" textColor="primary600" backgroundColor="primary100">
                          Default
                        </Badge>
                      )}
                    </Stack>
                  </Option>
                ))}
            </Select>
          </Box>

          <Select
            label="Gridly Configuration"
            placeholder={isLoadingConfigs ? "Loading configurations..." : "Select Gridly configuration (optional)"}
            value={gridlyConfigId}
            onChange={(value) => {
              setGridlyConfigId(value);
              setModalError(null);
            }}
            disabled={isLoadingConfigs}
            hint="Choose a saved Gridly configuration to automatically set API key and View ID"
          >
            <Option value="">No configuration selected</Option>
            {gridlyConfigs.map((config) => (
              <Option key={config.id} value={config.id.toString()}>
                <Stack horizontal spacing={2} alignItems="center">
                  <Typography>{config.name}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    ({config["gridly-view-id"]})
                  </Typography>
                </Stack>
              </Option>
            ))}
          </Select>

          <ContentSelector 
            selectedContent={selectedContent}
            onContentChange={(content) => {
              setSelectedContent(content);
              setModalError(null);
            }}
          />

        </Stack>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={() => setShowModal(false)} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <Button 
            type="submit" 
            disabled={!isFormValid() || isSubmitting}
            loading={isSubmitting}
          >
            {isEditMode ? "Update Project" : "Create Project"}
          </Button>
        }
      />
    </ModalLayout>
  );
}