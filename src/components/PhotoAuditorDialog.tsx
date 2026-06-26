import { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, AlertCircle, MapPin, Camera, FileText, Download } from 'lucide-react';
import { photoAuditorService, PhotoAuditResult } from '../services/PhotoAuditorService';

interface PhotoAuditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoAuditorDialog({ isOpen, onClose }: PhotoAuditorDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<PhotoAuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setAuditResult(null);
    setAiSummary(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const result = await photoAuditorService.analyzePhoto(selectedFile);
      setAuditResult(result);

      // Generate AI summary
      const summary = await photoAuditorService.generateAISummary(result);
      setAiSummary(summary);
    } catch (error) {
      console.error('Photo analysis error:', error);
      alert(`Failed to analyze photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setAuditResult(null);
    setAiSummary(null);
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const event = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getSeverityIcon = (severity: 'ok' | 'warn' | 'flag') => {
    switch (severity) {
      case 'ok':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'warn':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'flag':
        return <AlertTriangle size={16} className="text-red-500" />;
    }
  };

  const getAuthenticityColor = (verdict: string) => {
    switch (verdict) {
      case 'authentic':
        return 'text-green-600 dark:text-green-400';
      case 'suspicious':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'likely-fake':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleExportReport = () => {
    if (!auditResult) return;

    const report = `
PHOTO METADATA AUDIT REPORT
Generated: ${new Date().toLocaleString('id-ID')}
File: ${auditResult.metadata.filename}
SHA-256: ${auditResult.metadata.sha256 || 'N/A'}
================================================================================

FILE INFO:
- Filename: ${auditResult.metadata.filename}
- Format: ${auditResult.metadata.format}
- Dimensions: ${auditResult.metadata.dimensions.width} x ${auditResult.metadata.dimensions.height} px
- File Size: ${(auditResult.metadata.fileSize / 1024).toFixed(1)} KB
- EXIF Tags: ${auditResult.metadata.exifTagCount || 0}

DEVICE INFO:
- Platform: ${auditResult.deviceInfo?.platform || 'Unknown'}
- Device: ${auditResult.deviceInfo?.device || 'Unknown'}
- OS Version: ${auditResult.deviceInfo?.osVersion || 'N/A'}
- Firmware: ${auditResult.deviceInfo?.firmware || 'N/A'}

CAMERA INFO:
- Make: ${auditResult.metadata.make || 'N/A'}
- Model: ${auditResult.metadata.model || 'N/A'}
- Software: ${auditResult.metadata.software || 'N/A'}
- Date/Time: ${auditResult.metadata.dateTimeOriginal || 'N/A'}

GPS DATA:
- Coordinates: ${auditResult.metadata.gpsCoordinates || 'No GPS data'}

AUTHENTICITY ASSESSMENT:
- Score: ${auditResult.authenticity.score}/100
- Verdict: ${auditResult.authenticity.verdict.toUpperCase()}
- Summary: ${auditResult.authenticity.summary}

AUDIT FINDINGS:
${auditResult.findings.map(f => `[${f.severity.toUpperCase()}] ${f.category}: ${f.message}${f.details ? '\n  Details: ' + f.details : ''}`).join('\n\n')}

AI ANALYSIS:
${aiSummary || 'N/A'}

================================================================================
End of report - FIRST-AID Photo Auditor
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${auditResult.metadata.filename}_audit_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInMaps = () => {
    if (auditResult?.metadata.gpsCoordinates) {
      window.open(`https://maps.google.com/?q=${auditResult.metadata.gpsCoordinates}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Camera size={24} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Photo Metadata Auditor
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                🔒 Privacy: Photos analyzed locally - only metadata sent to AI
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFile ? (
            /* Upload Area */
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Photo untuk Audit
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Drag & drop atau klik untuk memilih file
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Supported: JPG, PNG, WEBP, HEIC (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            /* Analysis View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Image Preview */}
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Photo'}
                  </button>
                </div>

                {auditResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText size={18} />
                      File Information
                    </h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Filename:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs">
                          {auditResult.metadata.filename}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Format:</span>
                        <span className="text-gray-900 dark:text-white">
                          {auditResult.metadata.format}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
                        <span className="text-gray-900 dark:text-white">
                          {auditResult.metadata.dimensions.width} x {auditResult.metadata.dimensions.height} px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">File Size:</span>
                        <span className="text-gray-900 dark:text-white">
                          {(auditResult.metadata.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">EXIF Tags:</span>
                        <span className="text-gray-900 dark:text-white">
                          {auditResult.metadata.exifTagCount || 0}
                        </span>
                      </div>
                    </div>

                    {auditResult.deviceInfo && (
                      <>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-4">
                          <Camera size={18} />
                          Device Information
                        </h3>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                            <span className="text-gray-900 dark:text-white">
                              {auditResult.deviceInfo.platform}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Device:</span>
                            <span className="text-gray-900 dark:text-white">
                              {auditResult.deviceInfo.device}
                            </span>
                          </div>
                          {auditResult.deviceInfo.firmware && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Firmware:</span>
                              <span className="text-gray-900 dark:text-white text-xs">
                                {auditResult.deviceInfo.firmware}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {auditResult.metadata.gpsCoordinates && (
                      <>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-4">
                          <MapPin size={18} />
                          GPS Location
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-green-600 dark:text-green-400">
                            {auditResult.metadata.gpsCoordinates}
                          </span>
                          <button
                            onClick={handleOpenInMaps}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Open in Maps
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Audit Results */}
              <div className="space-y-4">
                {auditResult && (
                  <>
                    {/* Authenticity Score */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 border border-blue-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Authenticity Assessment
                      </h3>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className={`text-3xl font-bold ${getAuthenticityColor(auditResult.authenticity.verdict)}`}>
                            {auditResult.authenticity.score}/100
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {auditResult.authenticity.verdict.replace('-', ' ')}
                          </div>
                        </div>
                        <div className="w-24 h-24">
                          <svg viewBox="0 0 100 100" className="transform -rotate-90">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              className="text-gray-200 dark:text-gray-700"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              strokeDasharray={`${auditResult.authenticity.score * 2.51} 251`}
                              className={getAuthenticityColor(auditResult.authenticity.verdict)}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {auditResult.authenticity.summary}
                      </p>
                    </div>

                    {/* AI Summary */}
                    {aiSummary && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
                          🤖 AI Analysis
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {aiSummary}
                        </p>
                      </div>
                    )}

                    {/* Audit Findings */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Audit Findings ({auditResult.findings.length})
                        </h3>
                        <button
                          onClick={handleExportReport}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <Download size={14} />
                          Export Report
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {auditResult.findings.map((finding, index) => (
                          <div
                            key={index}
                            className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getSeverityIcon(finding.severity)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                    {finding.category}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    finding.severity === 'ok' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    finding.severity === 'warn' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {finding.severity.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                                  {finding.message}
                                </p>
                                {finding.details && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {finding.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
