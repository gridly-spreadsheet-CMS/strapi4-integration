import React, { useState, useEffect } from "react";
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
import { ProgressBar } from "@strapi/design-system/ProgressBar";
import Pencil from "@strapi/icons/Pencil";
import Trash from "@strapi/icons/Trash";
import Plus from "@strapi/icons/Plus";
import Refresh from "@strapi/icons/Refresh";
import ChevronDown from "@strapi/icons/ChevronDown";
import ChevronRight from "@strapi/icons/ChevronRight";
import Download from "@strapi/icons/Download";
import projectRequests from "../../api/gridly-integration";

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "Not set";
  
  try {
    let date;
    
    // Handle different date formats
    if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
      // If it's a string of digits, treat it as Unix timestamp
      date = new Date(parseInt(dateString));
    } else {
      // Otherwise, try to parse as regular date
      date = new Date(dateString);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return "Invalid date";
  }
};

// Helper function to check if a project was recently synced (within last 2 minutes)
const isRecentlySynced = (dateString) => {
  if (!dateString) return false;
  
  try {
    const syncDate = new Date(dateString);
    const now = new Date();
    const timeDiff = now.getTime() - syncDate.getTime();
    const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
    
    return timeDiff < twoMinutes;
  } catch (error) {
    return false;
  }
};

// Helper function to get progress color
const getProgressColor = (progress) => {
  if (progress >= 80) return "success";
  if (progress >= 50) return "warning";
  return "danger";
};

export default function ProjectTable({
  projectData,
  deleteProject,
  editProject,
  setShowModal,
  syncProject,
  importFromGridly,
}) {
  const [languages, setLanguages] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Fetch languages when component mounts
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languagesData = await projectRequests.getLanguages();
        setLanguages(languagesData);
      } catch (error) {
        console.error("Error fetching languages:", error);
        setLanguages([]);
      }
    };

    fetchLanguages();
  }, []);

  // Helper function to get language display name
  const getLanguageDisplayName = (languageCode) => {
    const language = languages.find(lang => lang.value === languageCode);
    return language ? language.label : languageCode;
  };

  // Helper function to toggle project expansion
  const toggleProjectExpansion = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Helper function to get target languages for a project
  const getTargetLanguages = (project) => {
    if (!project.subprojects || project.subprojects.length === 0) {
      return [];
    }
    return project.subprojects.map(sub => sub["target-language"]);
  };

  // Helper function to calculate overall progress for a project
  const getOverallProgress = (project) => {
    if (!project.subprojects || project.subprojects.length === 0) {
      return 0;
    }
    const totalProgress = project.subprojects.reduce((sum, sub) => sum + (sub.progress || 0), 0);
    return Math.round(totalProgress / project.subprojects.length);
  };

  // Helper function to get total records for a project (sum of all languages)
  const getTotalRecords = (project) => {
    console.log('🔍 Getting total records for project:', project.id, project);
    console.log('📋 Project total-records field:', project['total-records']);
    console.log('📋 Project subprojects:', project.subprojects);
    
    // First check if the project has a total-records field (from sync)
    if (project['total-records'] !== undefined && project['total-records'] !== null) {
      console.log('✅ Using total-records field:', project['total-records']);
      return project['total-records'];
    }
    
    // Fallback to calculating from subprojects (legacy)
    if (!project.subprojects || project.subprojects.length === 0) {
      console.log('⚠️ No subprojects, returning 0');
      return 0;
    }
    const calculatedTotal = project.subprojects.reduce((sum, sub) => sum + (sub["number-of-records"] || 0), 0);
    console.log('📊 Calculated total from subprojects:', calculatedTotal);
    return calculatedTotal;
  };

  // Helper function to get records for a specific subproject (target language)
  const getSubprojectRecords = (subproject) => {
    console.log('🔍 Getting records for subproject:', subproject.id, subproject);
    console.log('📋 Subproject number-of-records field:', subproject["number-of-records"]);
    
    // Check if subproject has a specific record count
    if (subproject["number-of-records"] !== undefined && subproject["number-of-records"] !== null) {
      console.log('✅ Using subproject number-of-records field:', subproject["number-of-records"]);
      return subproject["number-of-records"];
    }
    
    // If no specific count, try to calculate from the main project's total
    console.log('⚠️ No subproject record count, returning 0');
    return 0;
  };
  return (
    <Box
      background="neutral0"
      hasRadius={true}
      shadow="filterShadow"
      padding={8}
      style={{ marginTop: "10px" }}
    >
      <Table
        colCount={10}
        rowCount={projectData.length + 1}
        footer={
          <TFooter onClick={() => setShowModal(true)} icon={<Plus />}>
            Add a project
          </TFooter>
        }
      >
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">ID</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Project Name</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Source Language</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Target Languages</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Created</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Last Sync</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Overall Progress</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Total Records</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Actions</Typography>
            </Th>
          </Tr>
        </Thead>

                <Tbody>
          {projectData.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const targetLanguages = getTargetLanguages(project);
            const overallProgress = getOverallProgress(project);
            const totalRecords = getTotalRecords(project);

            return (
              <React.Fragment key={project.id}>
                {/* Main Project Row */}
                <Tr>
                  <Td>
                    <Flex alignItems="center" gap={2}>
                      <IconButton
                        onClick={() => toggleProjectExpansion(project.id)}
                        label={isExpanded ? "Collapse" : "Expand"}
                        noBorder
                        icon={isExpanded ? <ChevronDown /> : <ChevronRight />}
                        disabled={!project.subprojects || project.subprojects.length === 0}
                      />
                      <Typography textColor="neutral800" fontWeight="bold">
                        #{project.id}
                      </Typography>
                    </Flex>
                  </Td>

                  <Td>
                    <Typography textColor="neutral800" fontWeight="bold">
                      {project.name}
                    </Typography>
                  </Td>

                  <Td>
                    <Badge size="S" textColor="neutral600" backgroundColor="neutral100">
                      {getLanguageDisplayName(project["source-language"])}
                    </Badge>
                  </Td>

                  <Td>
                    <Flex gap={1} wrap="wrap">
                      {targetLanguages.length > 0 ? (
                        targetLanguages.map((lang) => (
                          <Badge key={lang} size="S" textColor="neutral600" backgroundColor="neutral100">
                            {getLanguageDisplayName(lang)}
                          </Badge>
                        ))
                      ) : (
                        <Typography variant="pi" textColor="neutral500">
                          No target languages
                        </Typography>
                      )}
                    </Flex>
                  </Td>

                  <Td>
                    <Typography textColor="neutral800">
                      {formatDate(project["creation-date"])}
                    </Typography>
                  </Td>

                  <Td>
                    <Typography textColor="neutral800">
                      {project["last-sync"] ? formatDate(project["last-sync"]) : "Never"}
                    </Typography>
                    {project["last-sync"] && (
                      <Typography variant="pi" textColor="neutral500">
                        {isRecentlySynced(project["last-sync"]) ? "🔄 Recently synced" : ""}
                      </Typography>
                    )}
                  </Td>

                  <Td>
                    <Box paddingTop={2} paddingBottom={2}>
                      <ProgressBar 
                        value={overallProgress} 
                        color={getProgressColor(overallProgress)}
                        size="S"
                      />
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      {overallProgress}%
                    </Typography>
                  </Td>

                  <Td>
                    <Typography textColor="neutral800" fontWeight="bold">
                      {totalRecords}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      &nbsp;translation tasks
                    </Typography>
                  </Td>

                  <Td>
                    <Flex style={{ justifyContent: "end" }} gap={1}>
                      <IconButton
                        onClick={() => editProject(project)}
                        label="Edit"
                        noBorder
                        icon={<Pencil />}
                      />
                      <IconButton
                        onClick={() => syncProject(project.id)}
                        label="Sync to Gridly"
                        noBorder
                        icon={<Refresh />}
                      />
                      <IconButton
                        onClick={() => deleteProject(project)}
                        label="Delete"
                        noBorder
                        icon={<Trash />}
                      />
                </Flex>
                  </Td>
                </Tr>

                {/* Subprojects Rows (when expanded) */}
                {isExpanded && project.subprojects && project.subprojects.map((subproject) => (
                  <Tr key={`${project.id}-${subproject.id}`}>
                    <Td>
                      <Box paddingLeft={6}>
                        <Typography textColor="neutral600" variant="pi">
                          Subproject #{subproject.id}
                        </Typography>
                      </Box>
                    </Td>

                    <Td>
                      <Box paddingLeft={2}>
                        <Typography textColor="neutral600" variant="pi">
                          {project.name} → {getLanguageDisplayName(subproject["target-language"])}
                        </Typography>
                      </Box>
                    </Td>

                    <Td>
                      <Badge size="S" textColor="neutral600" backgroundColor="neutral100">
                        {getLanguageDisplayName(project["source-language"])}
                      </Badge>
                    </Td>

                    <Td>
                      <Badge size="S" textColor="neutral600" backgroundColor="neutral100">
                        {getLanguageDisplayName(subproject["target-language"])}
                      </Badge>
                    </Td>

                    <Td>
                      <Typography textColor="neutral600" variant="pi">
                        -
                      </Typography>
                    </Td>

                    <Td>
                      <Box paddingTop={2} paddingBottom={2}>
                        <ProgressBar 
                          value={subproject.progress || 0} 
                          color={getProgressColor(subproject.progress || 0)}
                          size="S"
                        />
                      </Box>
                      <Typography variant="pi" textColor="neutral600">
                        {subproject.progress || 0}%
                      </Typography>
                    </Td>

                    <Td>
                      <Typography textColor="neutral800" fontWeight="bold">
                        {getSubprojectRecords(subproject)}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600">
                        &nbsp;translation tasks
                      </Typography>
                    </Td>

                    <Td>
                      <Flex style={{ justifyContent: "end" }} gap={1}>
                        <IconButton
                          onClick={() => importFromGridly(project.id, subproject["target-language"])}
                          label={`Import ${getLanguageDisplayName(subproject["target-language"])} translations`}
                          noBorder
                          icon={<Download />}
                        />
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}