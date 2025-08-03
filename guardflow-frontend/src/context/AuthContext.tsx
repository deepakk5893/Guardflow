import React, { createContext, useContext, useReducer, useEffect } from 'react';
// import { User, AuthState, LoginRequest, LoginResponse } from '../types/auth';
import type { User, AuthState, LoginRequest, LoginResponse } from '../types/auth';
import { apiService } from '../services/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        token: action.payload.token,
        user: action.payload.user,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Validate token and get user info
      validateTokenAndGetUser(token);
    }
  }, []);

  const validateTokenAndGetUser = async (token: string) => {
    try {
      const user = await apiService.get<User>('/auth/me');
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
    } catch (error) {
      // Token is invalid, remove it
      localStorage.removeItem('auth_token');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const formData = new FormData();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await apiService.postForm<LoginResponse>('/auth/login', formData);
      
      localStorage.setItem('auth_token', response.access_token);
      
      // Use user data from login response
      const user = response.user as User;
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token: response.access_token, user } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
    // Clear any navigation state and redirect to login
    window.location.href = '/login';
  };

  return (
    <div id="auth-provider">
      <AuthContext.Provider
        value={{
          ...state,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </div>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};