import React from 'react';
import ProjectsTable from '../../components/ProjectsTable';
import { Project } from '../../types/project.types';

/**
 * Projects Page - Display all projects with filtering and sorting
 */
export const ProjectsPage: React.FC = () => {
  // const navigate = useNavigate(); // Uncomment when you need navigation

  const handleProjectSelect = (project: Project) => {
    console.log('Selected project:', project);
    
    // Example: Navigate to project details
    // navigate(`/projects/${project.id}`);
    
    // Example: Show findings for this project
    // navigate(`/findings?project=${project.projectName}`);
    
    // For now, just log
    alert(`Selected: ${project.projectName}\nID: ${project.projectId}\nFindings: ${project.finding}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Projects Management
          </h1>
          <p className="text-gray-600">
            View and manage all projects. Click on a project to see details.
          </p>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow">
          <ProjectsTable onProjectSelect={handleProjectSelect} />
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 Quick Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click column headers to sort</li>
            <li>• Use the search box to filter projects</li>
            <li>• Click on a row to view project details</li>
            <li>• Finding counts are automatically calculated from the Findings table</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
