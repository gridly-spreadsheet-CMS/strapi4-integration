import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Checkbox,
  Button,
  Flex,
  Badge,
} from "@strapi/design-system";
import projectRequests from "../../api/gridly-integration.js";

export default function ContentSelector({ selectedContent, onContentChange }) {
  const [contentTypes, setContentTypes] = useState([]);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch content types and their entries from Strapi
  useEffect(() => {
    const fetchContentTypesAndEntries = async () => {
      try {
        console.log('🔄 STARTING: Fetching content types and entries...');
        // Fetch actual content types from Strapi
        const contentTypesData = await projectRequests.getContentTypes();
        console.log('✅ Received content types:', contentTypesData);
        
        // Transform the data and fetch entries for each content type
        console.log('🔄 STARTING: Fetching entries for all content types...');
        const transformedContentTypes = await Promise.all(
          contentTypesData.map(async (contentType) => {
            try {
              console.log(`🔄 Fetching entries for ${contentType.displayName} (${contentType.uid})...`);
              const entries = await projectRequests.getContentTypeEntries(contentType.uid);
              console.log(`✅ Received ${entries.length} entries for ${contentType.displayName}:`, entries);
              
              return {
                uid: contentType.uid,
                displayName: contentType.displayName,
                items: entries
              };
            } catch (error) {
              console.error(`❌ Error fetching entries for ${contentType.displayName}:`, error);
              return {
                uid: contentType.uid,
                displayName: contentType.displayName,
                items: [] // Empty array if there's an error
              };
            }
          })
        );
        
        console.log('✅ FINISHED: All content types with entries:', transformedContentTypes);
        setContentTypes(transformedContentTypes);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error fetching content types:', error);
        setIsLoading(false);
      }
    };

    console.log('🚀 ContentSelector useEffect triggered - starting fetch...');
    fetchContentTypesAndEntries();
  }, []);

  const toggleContentType = (contentTypeUid) => {
    console.log('🔘 Toggle clicked for content type:', contentTypeUid);
    setExpandedTypes(prev => ({
      ...prev,
      [contentTypeUid]: !prev[contentTypeUid]
    }));
  };

  const handleContentTypeSelect = (contentTypeUid, checked) => {
    const contentType = contentTypes.find(ct => ct.uid === contentTypeUid);
    if (!contentType) return;

    if (checked) {
      // Select all items in this content type
      const allItems = contentType.items.map(item => ({
        contentTypeUid,
        itemId: item.id,
        title: item.title
      }));
      onContentChange([...selectedContent, ...allItems]);
    } else {
      // Deselect all items in this content type
      onContentChange(selectedContent.filter(item => item.contentTypeUid !== contentTypeUid));
    }
  };

  const handleItemSelect = (contentTypeUid, itemId, title, checked) => {
    if (checked) {
      onContentChange([...selectedContent, { contentTypeUid, itemId, title }]);
    } else {
      onContentChange(selectedContent.filter(item => 
        !(item.contentTypeUid === contentTypeUid && item.itemId === itemId)
      ));
    }
  };

  const isContentTypeSelected = (contentTypeUid) => {
    const contentTypeItems = contentTypes.find(ct => ct.uid === contentTypeUid)?.items || [];
    const selectedItems = selectedContent.filter(item => item.contentTypeUid === contentTypeUid);
    return contentTypeItems.length > 0 && selectedItems.length === contentTypeItems.length;
  };

  const isContentTypePartiallySelected = (contentTypeUid) => {
    const contentTypeItems = contentTypes.find(ct => ct.uid === contentTypeUid)?.items || [];
    const selectedItems = selectedContent.filter(item => item.contentTypeUid === contentTypeUid);
    return selectedItems.length > 0 && selectedItems.length < contentTypeItems.length;
  };

  const isItemSelected = (contentTypeUid, itemId) => {
    return selectedContent.some(item => 
      item.contentTypeUid === contentTypeUid && item.itemId === itemId
    );
  };

  if (isLoading) {
    return (
      <Box padding={4}>
        <Typography>Loading content types...</Typography>
      </Box>
    );
  }

    return (
    <Box padding={4} background="neutral0" hasRadius={true} shadow="filterShadow">
      <Box style={{ marginBottom: '16px' }}>
        <Typography variant="beta" fontWeight="bold" style={{ marginBottom: '8px', display: 'block' }}>
          Select Content to Include
        </Typography>
        
        <Typography variant="pi" textColor="neutral600" style={{ display: 'block' }}>
          Choose which content types and items you want to synchronize to Gridly
        </Typography>
      </Box>

      <Box>
        {contentTypes.map((contentType, index) => (
          <Box key={contentType.uid} style={{ marginBottom: index < contentTypes.length - 1 ? '8px' : '0' }}>
            {/* Content Type Header */}
            <Flex alignItems="center" gap={2} padding={2} background="neutral50" hasRadius={true}>
              <Checkbox
                checked={isContentTypeSelected(contentType.uid)}
                indeterminate={isContentTypePartiallySelected(contentType.uid)}
                onChange={(e) => handleContentTypeSelect(contentType.uid, e.target.checked)}
              />
              
              <Button
                variant="tertiary"
                onClick={() => toggleContentType(contentType.uid)}
              >
                {contentType.displayName} {expandedTypes[contentType.uid] ? '▼' : '▶'}
              </Button>
              
              <Badge size="S" textColor="neutral600" backgroundColor="neutral100">
                {contentType.items.length} items
              </Badge>
            </Flex>

            {/* Content Items */}
            {expandedTypes[contentType.uid] && (
              <Box paddingLeft={4} paddingTop={1}>
                {contentType.items.length > 0 ? (
                  contentType.items.map((item) => (
                    <Flex 
                      key={item.id} 
                      alignItems="center" 
                      gap={2} 
                      padding={2}
                      background="neutral0"
                      hasRadius={true}
                      style={{ 
                        borderLeft: '2px solid #e9ecef',
                        marginLeft: '8px',
                        marginBottom: '4px'
                      }}
                    >
                      <Checkbox
                        checked={isItemSelected(contentType.uid, item.id)}
                        onChange={(e) => handleItemSelect(contentType.uid, item.id, item.title, e.target.checked)}
                      />
                      <Typography variant="pi" textColor="neutral800">
                        {item.title}
                      </Typography>
                    </Flex>
                  ))
                ) : (
                  <Box padding={2}>
                    <Typography variant="pi" textColor="neutral600">
                      No entries found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {selectedContent.length > 0 && (
        <Box padding={2} background="success50" hasRadius={true} style={{ marginTop: '16px' }}>
          <Typography variant="pi" textColor="success700">
            {selectedContent.length} item(s) selected for this project
          </Typography>
        </Box>
      )}
    </Box>
  );
} 