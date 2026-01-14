import React, { useState } from "react";

import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Typography,
  Button,
  Box,
  Stack,
  TextInput,
  Textarea,
  Checkbox,
} from "@strapi/design-system";
import ConfigTable from "../ConfigTable";

export default function ConfigurationsModal({ setShowModal, configData, deleteConfig, editConfig, addConfig }) {
  const [showForm, setShowForm] = useState(false);
  const [configToEdit, setConfigToEdit] = useState(null);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [viewId, setViewId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  function handleEditConfig(config) {
    setConfigToEdit(config);
    setName(config.name || "");
    setApiKey(config["gridly-api-key"] || "");
    setViewId(config["gridly-view-id"] || "");
    setDescription(config.description || "");
    setIsActive(config["is-active"] !== false);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setConfigToEdit(null);
    setName("");
    setApiKey("");
    setViewId("");
    setDescription("");
    setIsActive(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    const configData = {
      name: name,
      "gridly-api-key": apiKey,
      "gridly-view-id": viewId,
      description: description,
      "is-active": isActive,
    };

    if (configToEdit) {
      editConfig(configToEdit.id, configData);
    } else {
      addConfig(configData);
    }
    
    handleCloseForm();
  }

  function handleAddNew() {
    setConfigToEdit(null);
    setName("");
    setApiKey("");
    setViewId("");
    setDescription("");
    setIsActive(true);
    setShowForm(true);
  }

  return (
    <>
      <ModalLayout
        onClose={() => setShowModal(false)}
        labelledBy="title"
      >
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            Gridly Configurations
          </Typography>
        </ModalHeader>

        <ModalBody>
          <Box padding={4}>
            {showForm ? (
              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  <TextInput
                    placeholder="Enter configuration name"
                    label="Configuration Name *"
                    name="name"
                    hint="Max 50 characters"
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                    required
                  />

                  <TextInput
                    placeholder="Enter Gridly API Key"
                    label="Gridly API Key *"
                    name="apiKey"
                    type="password"
                    hint="Your Gridly API key (will be stored securely)"
                    onChange={(e) => setApiKey(e.target.value)}
                    value={apiKey}
                    required
                  />

                  <TextInput
                    placeholder="Enter Gridly View ID"
                    label="Gridly View ID *"
                    name="viewId"
                    hint="The View ID from your Gridly project"
                    onChange={(e) => setViewId(e.target.value)}
                    value={viewId}
                    required
                  />

                  <Textarea
                    placeholder="Enter description (optional)"
                    label="Description"
                    name="description"
                    hint="Max 200 characters"
                    onChange={(e) => setDescription(e.target.value)}
                    value={description}
                  />

                  <Checkbox
                    name="isActive"
                    hint="Whether this configuration is active and available for use"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  >
                    Active
                  </Checkbox>
                </Stack>
              </form>
            ) : (
              <>
                {configData.length === 0 ? (
                  <Typography textColor="neutral600" textAlign="center">
                    No configurations found. Click "Add Configuration" to create your first one.
                  </Typography>
                ) : (
                  <ConfigTable
                    configData={configData}
                    setShowModal={setShowForm}
                    deleteConfig={deleteConfig}
                    editConfig={handleEditConfig}
                  />
                )}
              </>
            )}
          </Box>
        </ModalBody>

        <ModalFooter
          startActions={
            showForm ? (
              <Button onClick={handleCloseForm} variant="tertiary">
                Cancel
              </Button>
            ) : (
              <Button onClick={() => setShowModal(false)} variant="tertiary">
                Close
              </Button>
            )
          }
          endActions={
            showForm ? (
              <Button onClick={handleSubmit}>
                {configToEdit ? "Update Configuration" : "Create Configuration"}
              </Button>
            ) : (
              <Button onClick={handleAddNew}>
                Add Configuration
              </Button>
            )
          }
        />
      </ModalLayout>

    </>
  );
} 