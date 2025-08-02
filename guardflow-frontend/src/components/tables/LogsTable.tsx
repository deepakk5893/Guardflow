import React, { useState } from 'react';
import type { Log } from '../../types/api';

interface LogsTableProps {
  logs: Log[];
  isLoading?: boolean;
  onViewDetails: (log: Log) => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  isLoading = false,
  onViewDetails
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (logId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentColor = (intent?: string) => {
    if (!intent) return 'bg-gray-100 text-gray-800';
    
    switch (intent.toLowerCase()) {
      case 'coding': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-purple-100 text-purple-800';
      case 'documentation': return 'bg-indigo-100 text-indigo-800';
      case 'research': return 'bg-teal-100 text-teal-800';
      case 'off_topic': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div id="logs-table-loading" className="flex justify-center items-center py-12">
        <div className="animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div id="logs-table-container">
      <div id="logs-table-wrapper" className="overflow-x-auto">
        <table id="logs-table" className="w-full border-collapse bg-white shadow-sm rounded-lg">
          <thead id="logs-table-header">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody id="logs-table-body" className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              const { date, time } = formatDate(log.timestamp);
              
              return (
                <React.Fragment key={log.id}>
                  <tr id={`log-row-${log.id}`} className="hover:bg-gray-50">
                    <td id={`log-timestamp-${log.id}`} className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{date}</div>
                        <div className="text-gray-500">{time}</div>
                      </div>
                    </td>
                    
                    <td id={`log-user-${log.id}`} className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">User #{log.user_id}</div>
                        {log.task_id && (
                          <div className="text-gray-500">Task #{log.task_id}</div>
                        )}
                      </div>
                    </td>
                    
                    <td id={`log-request-${log.id}`} className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <div className="font-medium mb-1">
                          {log.model}
                          {log.response_time_ms && (
                            <span className="text-gray-500 ml-2">({log.response_time_ms}ms)</span>
                          )}
                        </div>
                        <div className="text-gray-600">
                          {truncateText(log.prompt)}
                        </div>
                      </div>
                    </td>
                    
                    <td id={`log-intent-${log.id}`} className="px-6 py-4">
                      {log.intent_classification ? (
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIntentColor(log.intent_classification)}`}>
                            {log.intent_classification}
                          </span>
                          {log.confidence_score && (
                            <div className="text-xs text-gray-500 mt-1">
                              {(Number(log.confidence_score) * 100).toFixed(0)}% confidence
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    
                    <td id={`log-tokens-${log.id}`} className="px-6 py-4">
                      <div className="text-sm">
                        {log.openai_tokens_used ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {log.openai_tokens_used.toLocaleString()}
                            </div>
                            {log.prompt_tokens && log.completion_tokens && (
                              <div className="text-xs text-gray-500">
                                {log.prompt_tokens}→{log.completion_tokens}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    
                    <td id={`log-status-${log.id}`} className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      {log.deviation_score_delta > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          Score: +{log.deviation_score_delta}
                        </div>
                      )}
                    </td>
                    
                    <td id={`log-actions-${log.id}`} className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          id={`expand-log-${log.id}`}
                          onClick={() => toggleRow(log.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                        <button
                          id={`view-log-${log.id}`}
                          onClick={() => onViewDetails(log)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded row */}
                  {isExpanded && (
                    <tr id={`log-expanded-${log.id}`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div id={`log-details-${log.id}`} className="space-y-4">
                          {/* Full prompt */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Full Prompt:</h4>
                            <div className="bg-white p-3 rounded border text-sm text-gray-700 max-h-32 overflow-y-auto">
                              {log.prompt}
                            </div>
                          </div>
                          
                          {/* Response */}
                          {log.response && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Response:</h4>
                              <div className="bg-white p-3 rounded border text-sm text-gray-700 max-h-32 overflow-y-auto">
                                {log.response}
                              </div>
                            </div>
                          )}
                          
                          {/* Error message */}
                          {log.error_message && (
                            <div>
                              <h4 className="text-sm font-medium text-red-900 mb-2">Error:</h4>
                              <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-700">
                                {log.error_message}
                              </div>
                            </div>
                          )}
                          
                          {/* Metadata */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-900">Request ID:</span>
                              <div className="text-gray-600 font-mono">{log.id}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">Model:</span>
                              <div className="text-gray-600">{log.model}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">Response Time:</span>
                              <div className="text-gray-600">{log.response_time_ms}ms</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">Score Change:</span>
                              <div className="text-gray-600">
                                {log.user_score_before} → {log.user_score_after}
                                {log.deviation_score_delta > 0 && (
                                  <span className="text-orange-600"> (+{log.deviation_score_delta})</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};