import React from "react";
import {
  Table,
  Thead,
  TFooter,
  Tbody,
  Tr,
  Td,
  Th,
} from "@strapi/design-system/Table";
import { Box } from "@strapi/design-system/Box";
import { Flex } from "@strapi/design-system/Flex";
import { Button } from "@strapi/design-system/Button";
import { Typography } from "@strapi/design-system/Typography";
import { IconButton } from "@strapi/design-system/IconButton";
import { VisuallyHidden } from "@strapi/design-system/VisuallyHidden";
import { Badge } from "@strapi/design-system/Badge";
import Pencil from "@strapi/icons/Pencil";
import Trash from "@strapi/icons/Trash";
import Plus from "@strapi/icons/Plus";

// Helper function to format dates
const formatDate = (dateString) => {
  console.log('formatDate called with:', dateString);
  if (!dateString) return "Not set";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', dateString);
      return "Invalid date";
    }
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    console.log('Formatted date:', formatted);
    return formatted;
  } catch (error) {
    console.log('Error formatting date:', error);
    return "Invalid date";
  }
};

export default function ConfigTable({
  configData,
  deleteConfig,
  editConfig,
  setShowModal,
}) {
  return (
    <Box
      background="neutral0"
      hasRadius={true}
      shadow="filterShadow"
      padding={8}
      style={{ marginTop: "10px" }}
    >
      <Table
        colCount={8}
        rowCount={configData.length + 1}
        footer={
          <TFooter onClick={() => setShowModal(true)} icon={<Plus />}>
            Add a configuration
          </TFooter>
        }
      >
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">ID</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Name</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">View ID</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Description</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Created</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Created By</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Status</Typography>
            </Th>
            <Th>
              <VisuallyHidden>Actions</VisuallyHidden>
            </Th>
          </Tr>
        </Thead>

        <Tbody>
          {configData.map((config) => {
            console.log('Config object:', config);
            return (
            <Tr key={config.id}>
              <Td>
                <Typography textColor="neutral800" fontWeight="bold">
                  #{config.id}
                </Typography>
              </Td>

              <Td>
                <Typography textColor="neutral800" fontWeight="bold">
                  {config.name}
                </Typography>
              </Td>

              <Td>
                <Typography textColor="neutral800" fontFamily="monospace">
                  {config["gridly-view-id"]}
                </Typography>
              </Td>

              <Td>
                <Typography textColor="neutral800">
                  {config.description || "No description"}
                </Typography>
              </Td>

              <Td>
                <Typography textColor="neutral800" variant="pi">
                  {formatDate(config.created_at || config.createdAt || config['created_at'] || config['createdAt'])}
                </Typography>
                <Typography variant="pi" textColor="neutral600" style={{ fontSize: '10px' }}>
                  
                </Typography>
              </Td>

              <Td>
                <Typography textColor="neutral800" variant="pi">
                  {config.created_by?.firstname && config.created_by?.lastname 
                    ? `${config.created_by.firstname} ${config.created_by.lastname}`
                    : config.created_by?.username || config.created_by?.email || 'Unknown'
                  }
                </Typography>
              </Td>

              <Td>
                <Badge 
                  size="S" 
                  textColor={config["is-active"] ? "success600" : "neutral600"}
                  backgroundColor={config["is-active"] ? "success100" : "neutral100"}
                >
                  {config["is-active"] ? "Active" : "Inactive"}
                </Badge>
              </Td>

              <Td>
                <Flex style={{ justifyContent: "end" }} gap={1}>
                  <IconButton
                    onClick={() => editConfig(config)}
                    label="Edit"
                    noBorder
                    icon={<Pencil />}
                  />
                  <IconButton
                    onClick={() => deleteConfig(config)}
                    label="Delete"
                    noBorder
                    icon={<Trash />}
                  />
                </Flex>
              </Td>
            </Tr>
          );
          })}
        </Tbody>
      </Table>
    </Box>
  );
} 