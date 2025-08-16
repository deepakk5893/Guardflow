import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_expired?: boolean;
  days_since_last_used?: number;
}

export const ApiKeys: React.FC = () => {
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<{api_keys: ApiKey[]}>('/auth/api-keys');
      // For MVP: Users have max 1 API key
      setApiKey(data.api_keys?.[0] || null);
    } catch (error) {
      console.error('Failed to load API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const maskApiKey = (keyId: string) => {
    // Show first 8 chars and last 4 chars, mask the middle
    if (keyId.length <= 12) return '••••••••••••';
    return keyId.substring(0, 8) + '•'.repeat(keyId.length - 12) + keyId.substring(keyId.length - 4);
  };

  if (loading) {
    return (
      <div className="api-keys-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading API key...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-keys-container">
      <div className="api-keys-header">
        <h1>API Key</h1>
        <p>View your API key for programmatic access to Guardflow. Contact your administrator to request or regenerate your API key.</p>
      </div>

      <div className="api-keys-content">
        {!apiKey ? (
          <div className="empty-state">
            <div className="empty-icon">🔑</div>
            <h3>No API Key</h3>
            <p>You don't have an API key yet. Contact your administrator to request one.</p>
            <div className="contact-info">
              <p><strong>To request an API key:</strong></p>
              <ol>
                <li>Contact your system administrator</li>
                <li>Request API access for your account</li>
                <li>Your key will appear here once created</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="api-key-display">
            <div className={`api-key-card ${!apiKey.is_active ? 'inactive' : ''}`}>
              <div className="key-header">
                <h3>{apiKey.name}</h3>
                <div className="key-status">
                  {!apiKey.is_active && <span className="status-badge inactive">Revoked</span>}
                  {apiKey.is_expired && <span className="status-badge expired">Expired</span>}
                  {apiKey.is_active && !apiKey.is_expired && <span className="status-badge active">Active</span>}
                </div>
              </div>
              
              <div className="key-value-section">
                <label>API Key ID (for reference):</label>
                <div className="key-value">
                  <code>{maskApiKey(apiKey.id)}</code>
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(apiKey.id)}
                  >
                    Copy ID
                  </button>
                </div>
                <p className="key-note">
                  ⚠️ This is your masked API key ID. The actual API key was shown only when it was created.
                  If you've lost your API key, contact your administrator to regenerate it.
                </p>
              </div>
              
              <div className="key-details">
                <div className="detail-row">
                  <span className="label">Scopes:</span>
                  <div className="scopes-list">
                    {apiKey.scopes.map(scope => (
                      <span key={scope} className="scope-tag">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span>{formatDate(apiKey.created_at)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Last Used:</span>
                  <span>{formatRelativeDate(apiKey.last_used_at)}</span>
                </div>
                
                {apiKey.expires_at && (
                  <div className="detail-row">
                    <span className="label">Expires:</span>
                    <span>{formatDate(apiKey.expires_at)}</span>
                  </div>
                )}
              </div>
              
              <div className="usage-instructions">
                <h4>Usage Instructions</h4>
                <p>Include your API key in requests using the <code>Authorization</code> header:</p>
                <div className="code-example">
                  <pre>{`curl -X POST "https://your-domain.com/api/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "task_id": 1
  }'`}</pre>
                </div>
              </div>
              
              {!apiKey.is_active && (
                <div className="revoked-notice">
                  <h4>⚠️ API Key Revoked</h4>
                  <p>This API key has been revoked and can no longer be used. Contact your administrator if you need a new one.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .api-keys-container {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .api-keys-header {
          margin-bottom: 30px;
        }

        .api-keys-header h1 {
          margin-bottom: 10px;
          color: #333;
          font-size: 28px;
        }

        .api-keys-header p {
          color: #666;
          font-size: 16px;
          line-height: 1.5;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f9f9f9;
          border-radius: 12px;
          border: 2px dashed #ddd;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 24px;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 25px;
          font-size: 16px;
        }

        .contact-info {
          background: #e3f2fd;
          border: 1px solid #bbdefb;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
          text-align: left;
          max-width: 400px;
          margin: 20px auto 0;
        }

        .contact-info p {
          margin-bottom: 10px;
          color: #1565c0;
          font-weight: 500;
        }

        .contact-info ol {
          color: #333;
          text-align: left;
          padding-left: 20px;
        }

        .contact-info li {
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .api-key-display {
          max-width: 800px;
        }

        .api-key-card {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .api-key-card.inactive {
          opacity: 0.7;
          background: #f8f9fa;
          border-color: #dc3545;
        }

        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e9ecef;
        }

        .key-header h3 {
          margin: 0;
          color: #333;
          font-size: 20px;
        }

        .key-status {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.expired {
          background: #fff3cd;
          color: #856404;
        }

        .key-value-section {
          margin-bottom: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .key-value-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .key-value {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          margin-bottom: 10px;
        }

        .key-value code {
          flex: 1;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          color: #495057;
          letter-spacing: 1px;
        }

        .copy-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .copy-button:hover {
          background: #0056b3;
        }

        .key-note {
          font-size: 13px;
          color: #856404;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 10px;
          margin: 0;
        }

        .key-details {
          margin-bottom: 25px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
        }

        .detail-row .label {
          font-weight: 600;
          min-width: 120px;
          color: #555;
          font-size: 14px;
        }

        .scopes-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .scope-tag {
          background: #e9ecef;
          color: #495057;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .usage-instructions {
          margin-bottom: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .usage-instructions h4 {
          margin-bottom: 10px;
          color: #333;
          font-size: 16px;
        }

        .usage-instructions p {
          margin-bottom: 15px;
          color: #666;
          line-height: 1.5;
        }

        .code-example {
          background: #2d3748;
          border-radius: 6px;
          padding: 15px;
          overflow-x: auto;
        }

        .code-example pre {
          margin: 0;
          color: #e2e8f0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .revoked-notice {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 15px;
          color: #721c24;
        }

        .revoked-notice h4 {
          margin-bottom: 8px;
          font-size: 16px;
        }

        .revoked-notice p {
          margin: 0;
          line-height: 1.4;
        }

        .loading-spinner {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        .loading-spinner p {
          color: #666;
          font-size: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .api-keys-container {
            padding: 15px;
          }
          
          .key-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
          }
          
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          
          .detail-row .label {
            min-width: auto;
          }
          
          .code-example pre {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};