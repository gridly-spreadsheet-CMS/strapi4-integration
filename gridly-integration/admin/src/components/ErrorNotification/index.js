import React from 'react';
import { Box, Typography, Button, Stack } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useError } from '../../contexts/ErrorContext';

const ErrorNotification = () => {
  const { error, clearError } = useError();

  console.log('🔍 ErrorNotification: Current error state:', error);

  if (!error) return null;

  return (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex={9999}
      maxWidth="400px"
      padding={4}
      background="danger100"
      hasRadius={true}
      shadow="filterShadow"
      border="1px solid"
      borderColor="danger200"
    >
      <Stack spacing={3}>
        <Stack horizontal spacing={2} justifyContent="space-between" alignItems="flex-start">
          <Typography textColor="danger700" fontWeight="bold">
            ❌ Error
          </Typography>
          <Button
            variant="tertiary"
            size="S"
            onClick={clearError}
            startIcon={<Cross />}
          />
        </Stack>
        
        <Typography textColor="danger700">
          {error.message}
        </Typography>
        
        {error.details && (
          <Box
            padding={2}
            background="danger50"
            hasRadius={true}
            border="1px solid"
            borderColor="danger100"
          >
            <Typography variant="pi" textColor="danger600">
              <strong>Details:</strong> {JSON.stringify(error.details, null, 2)}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default ErrorNotification; 