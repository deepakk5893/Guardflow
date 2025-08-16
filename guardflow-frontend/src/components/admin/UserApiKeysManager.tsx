import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface ApiKeyStatus {
  id: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_expired?: boolean;
}

interface UserApiKeyInfo {
  user_id: number;
  user_name: string;
  user_email: string;
  has_api_key: boolean;
  api_key_status: ApiKeyStatus | null;
}

interface UserApiKeysManagerProps {
  userId: number;
  userName: string;
}

export const UserApiKeysManager: React.FC<UserApiKeysManagerProps> = ({ userId, userName }) => {
  const [userApiKeyInfo, setUserApiKeyInfo] = useState<UserApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  useEffect(() => {
    if (showModal) {
      loadUserApiKeyStatus();
    }
  }, [showModal, userId]);

  const loadUserApiKeyStatus = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<UserApiKeyInfo>(`/admin/users/${userId}/api-key`);
      setUserApiKeyInfo(data);
    } catch (error) {
      console.error('Failed to load user API key status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!confirm(`Create an API key for ${userName}?`)) {
      return;
    }

    try {
      setCreating(true);
      const data = await apiService.post<any>(`/admin/users/${userId}/api-key`);
      setNewApiKey(data.api_key);
      setShowNewKeyModal(true);
      loadUserApiKeyStatus(); // Refresh
    } catch (error: any) {
      alert(error.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!confirm(`Regenerate API key for ${userName}? This will revoke the current key and create a new one.`)) {
      return;
    }

    try {
      setRegenerating(true);
      const data = await apiService.put<any>(`/admin/users/${userId}/api-key/regenerate`, {});
      setNewApiKey(data.api_key);
      setShowNewKeyModal(true);
      loadUserApiKeyStatus(); // Refresh
    } catch (error: any) {
      alert(error.message || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!confirm(`Revoke API key for ${userName}? This cannot be undone.`)) {
      return;
    }

    try {
      await apiService.delete<any>(`/admin/users/${userId}/api-key`);
      loadUserApiKeyStatus(); // Refresh
    } catch (error: any) {
      alert(error.message || 'Failed to revoke API key');
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

  return (
    <>
      <button 
        style={{
          background: '#17a2b8',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '8px',
          display: 'inline-block',
          textDecoration: 'none',
          minHeight: '32px',
          lineHeight: '20px'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#138496'}
        onMouseOut={(e) => e.currentTarget.style.background = '#17a2b8'}
        onClick={() => setShowModal(true)}
      >
        🔑 API Key {userApiKeyInfo?.has_api_key ? '(Active)' : '(None)'}
      </button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>API Key for {userName}</h3>
              <button 
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading API key status...</div>
              ) : !userApiKeyInfo?.has_api_key ? (
                <div className="empty-state">
                  <p>This user does not have an API key.</p>
                  <button 
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginTop: '15px',
                      opacity: creating ? '0.5' : '1'
                    }}
                    onClick={handleCreateApiKey}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create API Key'}
                  </button>
                </div>
              ) : (
                <div className="api-key-details">
                  <div className={`api-key-item ${!userApiKeyInfo.api_key_status?.is_active ? 'inactive' : ''}`}>
                    <div className="key-header">
                      <h4>{userApiKeyInfo.api_key_status?.name}</h4>
                      <div className="key-status">
                        {!userApiKeyInfo.api_key_status?.is_active && <span className="status-badge inactive">Revoked</span>}
                        {userApiKeyInfo.api_key_status?.is_expired && <span className="status-badge expired">Expired</span>}
                        {userApiKeyInfo.api_key_status?.is_active && !userApiKeyInfo.api_key_status?.is_expired && <span className="status-badge active">Active</span>}
                      </div>
                    </div>
                    
                    <div className="key-details">
                      <div className="detail-row">
                        <span className="label">Scopes:</span>
                        <div className="scopes">
                          {userApiKeyInfo.api_key_status?.scopes.map(scope => (
                            <span key={scope} className="scope-tag">{scope}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Created:</span>
                        <span>{formatDate(userApiKeyInfo.api_key_status?.created_at || '')}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Last Used:</span>
                        <span>{formatRelativeDate(userApiKeyInfo.api_key_status?.last_used_at)}</span>
                      </div>
                      
                      {userApiKeyInfo.api_key_status?.expires_at && (
                        <div className="detail-row">
                          <span className="label">Expires:</span>
                          <span>{formatDate(userApiKeyInfo.api_key_status.expires_at)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="key-actions">
                      <button 
                        style={{
                          background: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          margin: '0 4px',
                          opacity: regenerating ? '0.5' : '1'
                        }}
                        onClick={handleRegenerateApiKey}
                        disabled={regenerating}
                      >
                        {regenerating ? 'Regenerating...' : 'Regenerate'}
                      </button>
                      <button 
                        style={{
                          background: !userApiKeyInfo.api_key_status?.is_active ? '#6c757d' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: !userApiKeyInfo.api_key_status?.is_active ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          margin: '0 4px',
                          opacity: !userApiKeyInfo.api_key_status?.is_active ? '0.5' : '1'
                        }}
                        onClick={handleRevokeApiKey}
                        disabled={!userApiKeyInfo.api_key_status?.is_active}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New API Key Display Modal */}
      {showNewKeyModal && newApiKey && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🎉 API Key Created for {userName}!</h3>
            </div>
            
            <div className="new-key-content">
              <div className="warning-box">
                <strong>⚠️ Important:</strong> Copy this API key now. You won't be able to see it again.
              </div>
              
              <div className="key-display">
                <label>API Key:</label>
                <div className="key-value">
                  <code>{newApiKey}</code>
                  <button 
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(newApiKey);
                      alert('API key copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  onClick={() => {
                    setShowNewKeyModal(false);
                    setNewApiKey(null);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .view-api-keys-btn {
          background: #17a2b8 !important;
          color: white !important;
          border: none !important;
          padding: 6px 12px !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          font-size: 12px !important;
          margin-left: 8px !important;
          display: inline-block !important;
          text-decoration: none !important;
          min-height: 32px !important;
          line-height: 20px !important;
        }

        .view-api-keys-btn:hover {
          background: #138496;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e1e5e9;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .api-key-details {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .api-key-item {
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 15px;
          background: white;
        }

        .api-key-item.inactive {
          opacity: 0.6;
          background: #f8f9fa;
        }

        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .key-header h4 {
          margin: 0;
          color: #333;
          font-size: 16px;
        }

        .key-status {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
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

        .key-details {
          margin-bottom: 15px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
        }

        .detail-row .label {
          font-weight: 500;
          min-width: 80px;
          color: #555;
          font-size: 14px;
        }

        .scopes {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .scope-tag {
          background: #e9ecef;
          color: #495057;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }

        .key-actions {
          display: flex;
          gap: 8px;
        }

        .create-key-btn, .regenerate-btn, .revoke-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin: 0 4px;
        }

        .create-key-btn {
          background: #28a745;
          color: white;
          margin-top: 15px;
        }

        .regenerate-btn {
          background: #ffc107;
          color: #212529;
        }

        .revoke-btn {
          background: #dc3545;
          color: white;
        }

        .create-key-btn:hover, .regenerate-btn:hover, .revoke-btn:hover {
          opacity: 0.9;
        }

        .create-key-btn:disabled, .regenerate-btn:disabled, .revoke-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .new-key-content {
          padding: 20px;
        }

        .warning-box {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .key-display {
          margin-bottom: 20px;
        }

        .key-display label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .key-value {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .key-value code {
          flex: 1;
          font-family: monospace;
          word-break: break-all;
          font-size: 12px;
        }

        .copy-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .form-actions {
          text-align: center;
        }

        .close-new-key-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
};