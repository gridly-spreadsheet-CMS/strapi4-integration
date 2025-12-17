import React, { useState, useEffect } from "react";

import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Typography,
  Button,
  TextInput,
  Textarea,
  Stack,
  Checkbox,
} from "@strapi/design-system";

export default function ConfigModal({ setShowModal, addConfig, editConfig, configToEdit }) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [viewId, setViewId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleSubmit = async (e) => {
    // Prevent submitting parent form
    e.preventDefault();
    e.stopPropagation();

    try {
      const configData = {
        name: name,
        "gridly-api-key": apiKey,
        "gridly-view-id": viewId,
        description: description,
        "is-active": isActive,
      };

      if (isEditMode) {
        await editConfig(configToEdit.id, configData);
      } else {
        await addConfig(configData);
      }
      
      setShowModal(false);
    } catch (e) {
      console.log("error", e);
    }
  };

  const getError = () => {
    // Form validation error
    if (name.length > 50) {
      return "Name is too long (max 50 characters)";
    }
    if (name.length === 0) {
      return "Name is required";
    }
    if (apiKey.length === 0) {
      return "API Key is required";
    }
    if (viewId.length === 0) {
      return "View ID is required";
    }
    if (description.length > 200) {
      return "Description is too long (max 200 characters)";
    }

    return null;
  };

  const isFormValid = () => {
    return name.length > 0 && 
           name.length <= 50 && 
           apiKey.length > 0 && 
           viewId.length > 0 && 
           description.length <= 200;
  };

  // Handle edit mode - populate form with existing data
  useEffect(() => {
    if (configToEdit) {
      setIsEditMode(true);
      setName(configToEdit.name || "");
      setApiKey(configToEdit["gridly-api-key"] || "");
      setViewId(configToEdit["gridly-view-id"] || "");
      setDescription(configToEdit.description || "");
      setIsActive(configToEdit["is-active"] !== false);
    } else {
      setIsEditMode(false);
      setName("");
      setApiKey("");
      setViewId("");
      setDescription("");
      setIsActive(true);
    }
  }, [configToEdit]);

  return (
    <ModalLayout
      onClose={() => setShowModal(false)}
      labelledBy="title"
      as="form"
      onSubmit={handleSubmit}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {isEditMode ? "Edit Configuration" : "Add New Configuration"}
        </Typography>
      </ModalHeader>

      <ModalBody onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <Stack spacing={4}>
          <TextInput
            placeholder="Enter configuration name"
            label="Configuration Name *"
            name="name"
            hint="Max 50 characters"
            error={getError()}
            onChange={(e) => setName(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            value={apiKey}
            required
          />

          <TextInput
            placeholder="Enter Gridly View ID"
            label="Gridly View ID *"
            name="viewId"
            hint="The View ID from your Gridly project"
            onChange={(e) => setViewId(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            value={viewId}
            required
          />

          <Textarea
            placeholder="Enter description (optional)"
            label="Description"
            name="description"
            hint="Max 200 characters"
            onChange={(e) => setDescription(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            value={description}
          />

          <Checkbox
            name="isActive"
            hint="Whether this configuration is active and available for use"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            Active
          </Checkbox>
        </Stack>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={() => setShowModal(false)} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <Button type="submit" disabled={!isFormValid()}>
            {isEditMode ? "Update Configuration" : "Create Configuration"}
          </Button>
        }
      />
    </ModalLayout>
  );
} 