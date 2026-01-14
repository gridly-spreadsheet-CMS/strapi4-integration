import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack } from '@strapi/design-system';
import { Cross, Check } from '@strapi/icons';
import { useProjectUpdate } from '../../contexts/ProjectUpdateContext.js';

const SyncNotification = () => {
  const [notification, setNotification] = useState(null);
  const { fetchUpdates } = useProjectUpdate();

  useEffect(() => {
    // Listen for background sync completion events
    const handleSyncComplete = (event) => {
      if (event.detail && event.detail.type === 'gridly:background-sync-completed') {
        setNotification({
          type: 'success',
          message: `Background sync completed for project ${event.detail.projectId}`,
          timestamp: new Date().toISOString()
        });

        // Trigger immediate update of the UI
        fetchUpdates();

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    };

    // Listen for custom events
    window.addEventListener('gridly:background-sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('gridly:background-sync-completed', handleSyncComplete);
    };
  }, [fetchUpdates]);

  if (!notification) return null;

  return (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex={9999}
      maxWidth="400px"
      padding={4}
      background={notification.type === 'success' ? 'success100' : 'danger100'}
      hasRadius={true}
      shadow="filterShadow"
      border="1px solid"
      borderColor={notification.type === 'success' ? 'success200' : 'danger200'}
    >
      <Stack spacing={3}>
        <Stack horizontal spacing={2} justifyContent="space-between" alignItems="flex-start">
          <Stack horizontal spacing={2} alignItems="center">
            {notification.type === 'success' ? (
              <Check color="success600" />
            ) : (
              <Cross color="danger600" />
            )}
            <Typography 
              textColor={notification.type === 'success' ? 'success700' : 'danger700'} 
              fontWeight="bold"
            >
              {notification.type === 'success' ? '✅ Sync Complete' : '❌ Sync Failed'}
            </Typography>
          </Stack>
          <Button
            variant="tertiary"
            size="S"
            onClick={() => setNotification(null)}
            startIcon={<Cross />}
          />
        </Stack>
        
        <Typography textColor={notification.type === 'success' ? 'success700' : 'danger700'}>
          {notification.message}
        </Typography>
      </Stack>
    </Box>
  );
};

export default SyncNotification; 