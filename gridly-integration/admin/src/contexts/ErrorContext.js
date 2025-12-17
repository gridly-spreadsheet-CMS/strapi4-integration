import React, { createContext, useContext, useState } from 'react';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);

  const showError = (message, details = null) => {
    console.log('🔍 ErrorContext: showError called with:', { message, details });
    setError({ message, details, timestamp: new Date() });
  };

  const clearError = () => {
    setError(null);
  };

  const handleApiError = (error) => {
    console.error('🔍 ErrorContext - API Error:', error);
    console.error('🔍 ErrorContext - Error response data:', error.response?.data);
    console.error('🔍 ErrorContext - Error response status:', error.response?.status);
    
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = null;

    // Handle different error response formats
    if (error.response?.data) {
      // Direct error field (our new format)
      if (error.response.data.error) {
        errorMessage = error.response.data.error;
        errorDetails = error.response.data.details;
      }
      // Strapi error format: { message: "...", details: {...} }
      else if (error.response.data.message) {
      errorMessage = error.response.data.message;
      errorDetails = error.response.data.details;
      } 
      // Alternative format: { details: { message: "..." } }
      else if (error.response.data.details?.message) {
      errorMessage = error.response.data.details.message;
      errorDetails = error.response.data.details;
      }
      // Direct error object
      else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      }
      // Complex error object - stringify for display
      else {
        errorMessage = `API Error (${error.response.status || 'unknown'}): ${JSON.stringify(error.response.data)}`;
        errorDetails = error.response.data;
      }
    } else if (error.response?.payload) {
      // Error might be in payload
      if (error.response.payload.error) {
        errorMessage = error.response.payload.error;
        errorDetails = error.response.payload.details;
      } else if (error.response.payload.message) {
        errorMessage = error.response.payload.message;
        errorDetails = error.response.payload.details;
      }
    } else if (error.response?.body) {
      // Error might be in body
      if (error.response.body.error) {
        errorMessage = error.response.body.error;
        errorDetails = error.response.body.details;
      } else if (error.response.body.message) {
        errorMessage = error.response.body.message;
        errorDetails = error.response.body.details;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.log('📝 Final error message:', errorMessage);
    console.log('📝 Final error details:', errorDetails);
    console.log('📝 Calling showError with:', { errorMessage, errorDetails });

    showError(errorMessage, errorDetails);
  };

  return (
    <ErrorContext.Provider value={{ error, showError, clearError, handleApiError }}>
      {children}
    </ErrorContext.Provider>
  );
}; 