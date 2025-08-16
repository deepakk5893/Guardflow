import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitationService } from '../../services/invitations';

interface InvitationDetails {
  id: string;
  email: string;
  company_name: string;
  inviter_name: string;
  role_name: string;
  expires_at: string;
  status: string;
}

export const InvitationAcceptance: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (token) {
      loadInvitationDetails();
    }
  }, [token]);

  const loadInvitationDetails = async () => {
    try {
      setLoading(true);
      const details = await InvitationService.getInvitationDetails(token!);
      setInvitation(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setAccepting(true);
      setError(null);
      
      await InvitationService.acceptInvitation(token!, {
        name: formData.name,
        password: formData.password
      });
      
      // Show success message and redirect to login
      alert('Account created successfully! You can now log in with your credentials.');
      navigate('/login');
      
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="invitation-acceptance-container">
        <div className="invitation-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading invitation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="invitation-acceptance-container">
        <div className="invitation-card">
          <div className="error-state">
            <h1>❌ Invalid Invitation</h1>
            <p>{error}</p>
            <p>The invitation link may have expired or is invalid.</p>
            <button onClick={() => navigate('/login')} className="btn btn-primary">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invitation-acceptance-container">
      <div className="invitation-card">
        <div className="invitation-header">
          <h1>🛡️ Welcome to Guardflow</h1>
          <h2>Complete Your Account Setup</h2>
        </div>

        <div className="invitation-details">
          <div className="company-info">
            <h3>You're joining {invitation?.company_name}</h3>
            <p>Invited by <strong>{invitation?.inviter_name}</strong> as a <strong>{invitation?.role_name}</strong></p>
            <p>Email: <strong>{invitation?.email}</strong></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="acceptance-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Create a secure password (min 6 characters)"
              className="form-control"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="Confirm your password"
              className="form-control"
              minLength={6}
            />
          </div>

          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-full-width"
            disabled={accepting}
          >
            {accepting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
          </button>
        </form>

        <div className="invitation-footer">
          <p>By accepting this invitation, you agree to Guardflow's Terms of Service.</p>
          <p>
            Didn't expect this invitation? 
            <button type="button" className="link-button" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .invitation-acceptance-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .invitation-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 40px;
          max-width: 500px;
          width: 100%;
        }

        .invitation-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .invitation-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          color: #333;
        }

        .invitation-header h2 {
          font-size: 24px;
          color: #666;
          font-weight: 400;
        }

        .invitation-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          border-left: 4px solid #007bff;
        }

        .company-info h3 {
          margin-bottom: 15px;
          color: #333;
          font-size: 18px;
        }

        .company-info p {
          margin-bottom: 8px;
          color: #666;
          line-height: 1.5;
        }

        .acceptance-form {
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .btn-full-width {
          width: 100%;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .invitation-footer {
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .invitation-footer p {
          margin-bottom: 10px;
          line-height: 1.4;
        }

        .link-button {
          background: none;
          border: none;
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
          font-size: inherit;
          margin-left: 5px;
        }

        .link-button:hover {
          color: #0056b3;
        }

        .loading-spinner, .error-state {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-state h1 {
          color: #dc3545;
          margin-bottom: 20px;
        }

        .error-state p {
          color: #666;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
};