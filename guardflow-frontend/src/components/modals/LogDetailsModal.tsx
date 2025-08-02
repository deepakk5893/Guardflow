import React from 'react';
import type { Log } from '../../types/api';

interface LogDetailsModalProps {
  log: Log | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({
  log,
  isOpen,
  onClose
}) => {
  if (!isOpen || !log) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div id="log-details-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div id="log-details-modal-content" className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div id="modal-header" className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Log Details</h2>
            <p className="text-sm text-gray-600">Request ID: {log.id}</p>
          </div>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div id="modal-content" className="p-6 space-y-6">
          {/* Overview */}
          <div id="log-overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Timestamp</h3>
              <p className="mt-1 text-sm text-gray-900">{formatDate(log.timestamp)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">User</h3>
              <p className="mt-1 text-sm text-gray-900">
                User #{log.user_id}
                {log.task_id && <span className="block text-gray-600">Task #{log.task_id}</span>}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Model</h3>
              <p className="mt-1 text-sm text-gray-900">{log.model}</p>
              {log.response_time_ms && (
                <p className="text-xs text-gray-600">{log.response_time_ms}ms response time</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Status</h3>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  log.status === 'success' ? 'bg-green-100 text-green-800' :
                  log.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {log.status}
                </span>
              </p>
            </div>
          </div>

          {/* Intent Classification */}
          {log.intent_classification && (
            <div id="intent-section" className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Intent Classification</h3>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  log.intent_classification === 'coding' ? 'bg-blue-100 text-blue-800' :
                  log.intent_classification === 'testing' ? 'bg-purple-100 text-purple-800' :
                  log.intent_classification === 'documentation' ? 'bg-indigo-100 text-indigo-800' :
                  log.intent_classification === 'research' ? 'bg-teal-100 text-teal-800' :
                  log.intent_classification === 'off_topic' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {log.intent_classification}
                </span>
                {log.confidence_score && (
                  <span className="text-sm text-gray-600">
                    {(Number(log.confidence_score) * 100).toFixed(1)}% confidence
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Scoring */}
          <div id="scoring-section" className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Deviation Scoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Score Before</p>
                <p className="text-lg font-medium">{log.user_score_before || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Score Change</p>
                <p className={`text-lg font-medium ${log.deviation_score_delta > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {log.deviation_score_delta > 0 ? '+' : ''}{log.deviation_score_delta}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Score After</p>
                <p className="text-lg font-medium">{log.user_score_after || 0}</p>
              </div>
            </div>
          </div>

          {/* Token Usage */}
          {log.openai_tokens_used && (
            <div id="tokens-section" className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Prompt Tokens</p>
                  <p className="text-lg font-medium">{log.prompt_tokens?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion Tokens</p>
                  <p className="text-lg font-medium">{log.completion_tokens?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                  <p className="text-lg font-medium">{log.openai_tokens_used.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div id="prompt-section">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-900">Prompt</h3>
              <button
                onClick={() => copyToClipboard(log.prompt)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{log.prompt}</pre>
            </div>
          </div>

          {/* Response */}
          {log.response && (
            <div id="response-section">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">Response</h3>
                <button
                  onClick={() => copyToClipboard(log.response!)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{log.response}</pre>
              </div>
            </div>
          )}

          {/* Error */}
          {log.error_message && (
            <div id="error-section">
              <h3 className="text-lg font-medium text-red-900 mb-2">Error Message</h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <pre className="text-sm text-red-700 whitespace-pre-wrap">{log.error_message}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div id="modal-footer" className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};