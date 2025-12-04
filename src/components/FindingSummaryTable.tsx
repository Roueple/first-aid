import React, { useState, useEffect } from 'react';
import { Project } from '../types/project.types';
import ProjectService from '../services/ProjectService';

export const ProjectsTable: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectService = new ProjectService();
      const data = await projectService.getAllProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    try {
      setLoading(true);
      const projectService = new ProjectService();
      await projectService.recalculateAllProjectStats();
      await loadProjects();
    } catch (err) {
      console.error('Error refreshing stats:', err);
      setError('Failed to refresh statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button
          onClick={handleRefreshStats}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Statistics
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 border bg-gray-200 sticky left-0 z-10" style={{ width: '50px' }}>
                No
              </th>
              <th className="px-4 py-2 border">Project ID</th>
              <th className="px-4 py-2 border">SH</th>
              <th className="px-4 py-2 border">Project</th>
              <th className="px-4 py-2 border">Total</th>
              <th className="px-4 py-2 border">Finding</th>
              <th className="px-4 py-2 border">Non-Finding</th>
              <th className="px-4 py-2 border">Type</th>
              <th className="px-4 py-2 border">Subtype</th>
              <th className="px-4 py-2 border">Description</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-2 py-2 border text-center bg-gray-50 sticky left-0 z-10 font-medium">
                  {index + 1}
                </td>
                <td className="px-4 py-2 border text-center font-mono text-sm">
                  {project.projectId}
                </td>
                <td className="px-4 py-2 border">{project.sh}</td>
                <td className="px-4 py-2 border">{project.projectName}</td>
                <td className="px-4 py-2 border text-center">{project.total}</td>
                <td className="px-4 py-2 border text-center">{project.finding}</td>
                <td className="px-4 py-2 border text-center">{project.nonFinding}</td>
                <td className="px-4 py-2 border">{project.projectType}</td>
                <td className="px-4 py-2 border">{project.subtype}</td>
                <td className="px-4 py-2 border">{project.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
