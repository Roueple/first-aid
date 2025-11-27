/**
 * ErrorHandler Usage Examples
 * 
 * This file demonstrates how to use the global error handling system
 * in various scenarios throughout the FIRST-AID application.
 */

import React, { useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { FindingsService } from '../services/FindingsService';

/**
 * Example 1: Basic Error Handling in a Component
 */
export const BasicErrorHandlingExample: React.FC = () => {
  const { handleError, showSuccess } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  const handleSaveData = async () => {
    setLoading(true);
    try {
      // Simulate an operation that might fail
      await someAsyncOperation();
      showSuccess('Data saved successfully!');
    } catch (error) {
      // Handle the error with context
      await handleError(error, {
        operation: 'saveData',
        metadata: { component: 'BasicErrorHandlingExample' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSaveData} disabled={loading}>
      {loading ? 'Saving...' : 'Save Data'}
    </button>
  );
};

/**
 * Example 2: Form Validation Errors
 */
export const FormValidationExample: React.FC = () => {
  const { handleError, showSuccess } = useErrorHandler();
  const [formData, setFormData] = useState({ title: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }

      // Submit form
      await submitForm(formData);
      showSuccess('Form submitted successfully!');
    } catch (error) {
      await handleError(error, {
        operation: 'submitForm',
        metadata: { formData }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Title"
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Description"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

/**
 * Example 3: Network Error Handling
 */
export const NetworkErrorExample: React.FC = () => {
  const { handleError, showSuccess } = useErrorHandler();
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const findingsService = new FindingsService();
      const result = await findingsService.getFindings({}, { page: 1, pageSize: 20 });
      setData(result.items);
      showSuccess('Data loaded successfully!');
    } catch (error) {
      // Network errors will be automatically categorized and handled
      await handleError(error, {
        operation: 'fetchFindings',
        metadata: { page: 1, pageSize: 20 }
      });
    }
  };

  return (
    <div>
      <button onClick={fetchData}>Load Data</button>
      <div>{data.length} items loaded</div>
    </div>
  );
};

/**
 * Example 4: AI Service Error Handling with Fallback
 */
export const AIServiceErrorExample: React.FC = () => {
  const { handleError, showInfo } = useErrorHandler();
  const [response, setResponse] = useState<string>('');

  const sendChatMessage = async (message: string) => {
    try {
      // Try to use AI service
      const aiResponse = await callAIService(message);
      setResponse(aiResponse);
    } catch (error) {
      // Error handler will show fallback message
      await handleError(error, {
        operation: 'chat',
        metadata: { message }
      });

      // Use fallback search instead
      showInfo('Using basic search instead of AI');
      const searchResults = await fallbackSearch(message);
      setResponse(searchResults);
    }
  };

  return (
    <div>
      <button onClick={() => sendChatMessage('Show me high-risk findings')}>
        Ask AI
      </button>
      <div>{response}</div>
    </div>
  );
};

/**
 * Example 5: Import Error Handling
 */
export const ImportErrorExample: React.FC = () => {
  const { handleError, showSuccess } = useErrorHandler();

  const handleFileUpload = async (file: File) => {
    try {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Invalid file format. Please upload an Excel file.');
      }

      // Parse and import file
      const result = await parseAndImportExcel(file);
      showSuccess(`Successfully imported ${result.successCount} findings!`);
    } catch (error) {
      await handleError(error, {
        operation: 'importFindings',
        metadata: { fileName: file.name, fileSize: file.size }
      });
    }
  };

  return (
    <input
      type="file"
      accept=".xlsx,.xls"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }}
    />
  );
};

/**
 * Example 6: Direct Notification Usage
 */
export const DirectNotificationExample: React.FC = () => {
  const { showSuccess, showInfo, showWarning, showError } = useErrorHandler();

  return (
    <div className="flex gap-2">
      <button onClick={() => showSuccess('Operation completed!')}>
        Show Success
      </button>
      <button onClick={() => showInfo('Here is some information')}>
        Show Info
      </button>
      <button onClick={() => showWarning('Please be careful!')}>
        Show Warning
      </button>
      <button onClick={() => showError('Something went wrong')}>
        Show Error
      </button>
    </div>
  );
};

/**
 * Example 7: Service-Level Error Handling
 */
class ExampleService {
  async performOperation(data: any) {
    try {
      // Perform operation
      const result = await this.doSomething(data);
      return result;
    } catch (error) {
      // Log error but don't show notification (let component handle it)
      console.error('Service error:', error);
      throw error; // Re-throw for component to handle
    }
  }

  private async doSomething(data: any): Promise<any> {
    // Implementation
    return data;
  }
}

/**
 * Example 8: Multiple Operations with Error Handling
 */
export const MultipleOperationsExample: React.FC = () => {
  const { handleError, showSuccess } = useErrorHandler();

  const performMultipleOperations = async () => {
    try {
      // Operation 1
      await operation1();

      // Operation 2
      await operation2();

      // Operation 3
      await operation3();

      showSuccess('All operations completed successfully!');
    } catch (error) {
      // Single error handler for all operations
      await handleError(error, {
        operation: 'multipleOperations',
        metadata: { step: 'unknown' }
      });
    }
  };

  return <button onClick={performMultipleOperations}>Run All</button>;
};

// Helper functions (mock implementations)
async function someAsyncOperation(): Promise<void> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function submitForm(data: any): Promise<void> {
  // Simulate form submission
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function callAIService(message: string): Promise<string> {
  // Simulate AI service call
  throw new Error('AI service unavailable');
}

async function fallbackSearch(query: string): Promise<string> {
  // Simulate fallback search
  return `Search results for: ${query}`;
}

async function parseAndImportExcel(file: File): Promise<{ successCount: number }> {
  // Simulate Excel parsing
  return { successCount: 10 };
}

async function operation1(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function operation2(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function operation3(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
