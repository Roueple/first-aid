import React, { useState, useEffect } from 'react';
import { Project } from '../types/project.types';
import ProjectService from '../services/ProjectService';

interface ProjectsTableProps {
  onProjectSelect?: (project: Project) => void;
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Project>('projectName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  const projectService = new ProjectService();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects;

    // Apply filter
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = projects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(searchLower) ||
          p.sh.toLowerCase().includes(searchLower) ||
          p.type.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [projects, filterText, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={loadProjects}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <button
          onClick={loadProjects}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search projects..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedProjects.length} of {projects.length} projects
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Row number column - not sortable, not filterable */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                No.
              </th>
              <th
                onClick={() => handleSort('projectId')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                ID {sortField === 'projectId' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('sh')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                SH {sortField === 'sh' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('projectName')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Project {sortField === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('initials')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Initials {sortField === 'initials' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('finding')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Total Finding {sortField === 'finding' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('nonFinding')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Non-Finding {sortField === 'nonFinding' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('type')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('subtype')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Subtype {sortField === 'subtype' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedProjects.map((project, index) => (
              <tr
                key={project.id}
                onClick={() => onProjectSelect?.(project)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Row number - always sequential regardless of filter/sort */}
                <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                  {project.projectId}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {project.sh}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {project.projectName}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                    {project.initials || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {project.finding}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {project.nonFinding}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {project.type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.subtype}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {project.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedProjects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No projects found matching your search.
        </div>
      )}
    </div>
  );
};

export default ProjectsTable;
