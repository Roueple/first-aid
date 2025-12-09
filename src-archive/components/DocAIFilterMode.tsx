import { useState } from 'react';
import docAIFilterService, { FilterIntent, FilterResult } from '../services/DocAIFilterService';

interface DocAIFilterModeProps {
  userId: string;
  onClose: () => void;
}

type FilterStep = 'input' | 'confirm' | 'results';

export function DocAIFilterMode({ userId, onClose }: DocAIFilterModeProps) {
  const [step, setStep] = useState<FilterStep>('input');
  const [userInput, setUserInput] = useState('');
  const [intent, setIntent] = useState<FilterIntent | null>(null);
  const [filterResult, setFilterResult] = useState<FilterResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const analyzedIntent = await docAIFilterService.analyzeUserInput(userInput);
      setIntent(analyzedIntent);
      
      if (analyzedIntent.clarificationNeeded) {
        setError(analyzedIntent.clarificationNeeded);
        setIsLoading(false);
        return;
      }
      
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!intent) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await docAIFilterService.executeQuery(intent);
      setFilterResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!filterResult) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      await docAIFilterService.exportToXLSX(
        filterResult.results,
        `audit-results-${timestamp}.xlsx`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const handleReset = () => {
    setStep('input');
    setUserInput('');
    setIntent(null);
    setFilterResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">DocAI:2 Filter Mode</h2>
              <p className="text-sm text-white/80">Smart query builder with confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What do you want to find?
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Example: Show all IT related findings in 2024"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">💡 Examples:</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• "Show all IT related findings in 2024"</li>
                  <li>• "Find critical findings with risk score above 15"</li>
                  <li>• "Get all Finance department findings from last year"</li>
                  <li>• "Show me findings for Grand Hotel Jakarta"</li>
                </ul>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!userInput.trim() || isLoading}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Analyze Query
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 'confirm' && intent && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-900 mb-2">🤖 AI Interpretation:</h3>
                <p className="text-indigo-700">{intent.interpretation}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-indigo-600">Confidence:</span>
                  <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${intent.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-900">{Math.round(intent.confidence * 100)}%</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">📋 Query Filters:</h3>
                <div className="space-y-2">
                  {intent.filters.year && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Year:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{intent.filters.year}</span>
                    </div>
                  )}
                  {intent.filters.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Department:</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{intent.filters.department}</span>
                    </div>
                  )}
                  {intent.filters.projectName && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Project:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{intent.filters.projectName}</span>
                    </div>
                  )}
                  {intent.filters.minNilai !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Min Risk Score:</span>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded">{intent.filters.minNilai}</span>
                    </div>
                  )}
                  {intent.filters.onlyFindings && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Only Findings (exclude non-findings)</span>
                    </div>
                  )}
                  {intent.filters.keywords && intent.filters.keywords.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Keywords:</span>
                      <div className="flex gap-1 flex-wrap">
                        {intent.filters.keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Executing...
                    </>
                  ) : (
                    <>
                      ✓ Confirm & Execute
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && filterResult && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900">✅ Query Executed Successfully</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Found {filterResult.totalCount} result{filterResult.totalCount !== 1 ? 's' : ''} in {filterResult.executionTime}ms
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export XLSX
                  </button>
                </div>
              </div>

              {filterResult.totalCount === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No results found matching your criteria.</p>
                </div>
              ) : (
                <>
                  {filterResult.totalCount > 10 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                      📊 Showing first 10 of {filterResult.totalCount} results. Export to XLSX for complete data.
                    </div>
                  )}

                  <div className="space-y-3">
                    {filterResult.results.slice(0, 10).map((result, idx) => {
                      const riskLevel = result.nilai >= 16 ? { label: 'CRITICAL', color: 'red' } : 
                                       result.nilai >= 11 ? { label: 'HIGH', color: 'orange' } :
                                       result.nilai >= 6 ? { label: 'MEDIUM', color: 'yellow' } : 
                                       { label: 'LOW', color: 'green' };
                      
                      return (
                        <div key={result.id || idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-slate-900">{result.auditResultId}</span>
                              <span className={`px-2 py-0.5 bg-${riskLevel.color}-100 text-${riskLevel.color}-700 text-xs font-semibold rounded`}>
                                {riskLevel.label}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-slate-900">{result.nilai}/25</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-slate-500">Project:</span>
                              <span className="ml-2 font-medium text-slate-900">{result.projectName}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Department:</span>
                              <span className="ml-2 font-medium text-slate-900">{result.department}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Year:</span>
                              <span className="ml-2 font-medium text-slate-900">{result.year}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Type:</span>
                              <span className="ml-2 font-medium text-slate-900">{result.code ? 'Finding' : 'Non-Finding'}</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{result.descriptions}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
              >
                ← New Query
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
