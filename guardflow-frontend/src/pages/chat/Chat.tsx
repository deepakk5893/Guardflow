import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatService } from '../../services/chat';
import type { Chat as ChatData, ChatMessage, ChatWithMessages, TaskContext } from '../../services/chat';
import '../../styles/chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens_used?: number;
  intent?: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: Date;
  taskId?: number;
  totalTokensUsed?: number;
}

export const Chat: React.FC = () => {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Load user chats and handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const taskParam = searchParams.get('task');
    const newParam = searchParams.get('new');
    
    if (taskParam) {
      const taskId = parseInt(taskParam, 10);
      setCurrentTaskId(taskId);
      
      // Load task context first, then chat
      loadTaskContextAndChat(taskId, newParam === 'true');
    } else {
      // No task specified - redirect to dashboard or show all chats
      setError('No task specified. Please select a task to start chatting.');
      loadUserChats();
    }
  }, [location]);

  const loadTaskContextAndChat = async (taskId: number, forceNew: boolean = false) => {
    try {
      // First load task context
      const context = await loadTaskContext(taskId);
      
      // Then load the chat with the context
      await loadOrCreateChatForTask(taskId, forceNew, context);
    } catch (err) {
      setError('Failed to load task and chat');
      console.error('Error loading task and chat:', err);
    }
  };

  const loadOrCreateChatForTask = async (taskId: number, forceNew: boolean = false, context?: TaskContext) => {
    setIsLoadingChats(true);
    setError(null);
    
    try {
      console.log('Loading/creating chat for task:', taskId, 'forceNew:', forceNew);
      
      // First, load all chats for this user to populate sidebar
      const allChats = await chatService.getUserChats();
      const allChatSessions: ChatSession[] = allChats.map((chat: ChatData) => ({
        id: chat.id,
        title: chat.title,
        lastMessage: new Date(chat.updated_at),
        taskId: chat.task_id,
        totalTokensUsed: chat.total_tokens_used
      }));
      setChatSessions(allChatSessions);
      
      // Get or create the chat for this task (enforces one chat per task)
      const taskChat: ChatData = await chatService.getOrCreateChatForTask(taskId);
      
      // Set current chat and load messages
      setCurrentChatId(taskChat.id);
      await loadChatMessages(taskChat.id, context);
      
      // Clean up URL if it had 'new' parameter
      if (forceNew) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('new');
        window.history.replaceState({}, '', newUrl.toString());
      }
    } catch (err) {
      setError('Failed to load or create chat');
      console.error('Error loading/creating chat:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // API integration methods
  const loadTaskContext = async (taskId: number) => {
    try {
      const context = await chatService.getTaskContext(taskId);
      setTaskContext(context);
      setRemainingTokens(context.token_limit);
      return context;
    } catch (err) {
      setError('Failed to load task context');
      console.error('Error loading task context:', err);
      throw err;
    }
  };

  const updateRemainingTokens = (tokensUsed: number, context?: TaskContext) => {
    const contextToUse = context || taskContext;
    if (contextToUse) {
      const remaining = Math.max(0, contextToUse.token_limit - tokensUsed);
      console.log('Updating remaining tokens:', {
        tokenLimit: contextToUse.token_limit,
        tokensUsed,
        remaining
      });
      setRemainingTokens(remaining);
    } else {
      console.log('Cannot update remaining tokens - no context available');
    }
  };

  const loadUserChats = async (taskId?: number) => {
    setIsLoadingChats(true);
    try {
      const chats = await chatService.getUserChats(taskId);
      const chatSessions: ChatSession[] = chats.map((chat: ChatData) => ({
        id: chat.id,
        title: chat.title,
        lastMessage: new Date(chat.updated_at),
        taskId: chat.task_id,
        totalTokensUsed: chat.total_tokens_used
      }));
      setChatSessions(chatSessions);
    } catch (err) {
      setError('Failed to load chats');
      console.error('Error loading chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleNewChat = () => {
    if (currentTaskId) {
      // For one-chat-per-task, "new chat" just means go to the task's chat
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('task', currentTaskId.toString());
      window.location.href = currentUrl.toString();
    } else {
      setError('No task selected');
    }
  };

  const loadChatMessages = async (chatId: string, context?: TaskContext) => {
    setIsLoading(true);
    try {
      const chatWithMessages = await chatService.getChatWithMessages(chatId);
      const formattedMessages: Message[] = chatWithMessages.messages.map(msg => ({
        id: msg.id,
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        tokens_used: msg.tokens_used,
        intent: msg.intent
      }));
      setMessages(formattedMessages);
      
      // Update remaining tokens based on chat's total usage
      updateRemainingTokens(chatWithMessages.total_tokens_used, context);
    } catch (err) {
      setError('Failed to load chat messages');
      console.error('Error loading chat messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    await loadChatMessages(chatId);
    
    // Update URL to reflect the selected chat's task ID
    const selectedChat = chatSessions.find(chat => chat.id === chatId);
    if (selectedChat && selectedChat.taskId) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('task', selectedChat.taskId.toString());
      window.history.replaceState({}, '', currentUrl.toString());
      setCurrentTaskId(selectedChat.taskId);
      loadTaskContext(selectedChat.taskId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentChatId) return;

    const messageContent = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatService.sendMessage({
        chat_id: currentChatId,
        content: messageContent
      });

      // Add both user message and AI response to the UI
      const userMessage: Message = {
        id: response.message.id,
        role: 'user',
        content: response.message.content,
        timestamp: new Date(response.message.created_at),
        tokens_used: response.message.tokens_used
      };

      const assistantMessage: Message = {
        id: response.response.id,
        role: 'assistant',
        content: response.response.content,
        timestamp: new Date(response.response.created_at),
        tokens_used: response.response.tokens_used,
        intent: response.response.intent
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setRemainingTokens(response.remaining_tokens);

      // Update chat session in the sidebar
      setChatSessions(prev => 
        prev.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                title: response.chat_updated.title,
                lastMessage: new Date(response.chat_updated.updated_at),
                totalTokensUsed: response.chat_updated.total_tokens_used
              }
            : chat
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      // Re-add the message to input if it failed
      setInputMessage(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleArchiveChat = async (chatId: string) => {
    try {
      await chatService.archiveChat(chatId);
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to archive chat');
      console.error('Error archiving chat:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Handle multiple file uploads
      Array.from(files).forEach(file => {
        const fileMessage: Message = {
          id: Date.now().toString() + Math.random(),
          role: 'user',
          content: `📎 Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fileMessage]);
      });
      
      // Clear the file input
      e.target.value = '';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / (24 * 60))}d ago`;
    }
  };

  const filteredChatSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="chat-page" className="chat-container">
      {/* Left Sidebar */}
      <div id="chat-sidebar" className="chat-sidebar">
        <div id="chat-sidebar-header" className="sidebar-header">
          <button 
            id="new-chat-btn" 
            className="new-chat-btn"
            onClick={handleNewChat}
          >
            <span className="plus-icon">+</span>
            New chat
          </button>
        </div>

        <div id="chat-search" className="search-container">
          <input
            type="text"
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div id="chat-history" className="chat-history">
          {isLoadingChats ? (
            <div className="loading-chats">Loading chats...</div>
          ) : (
            <div className="chat-sessions">
              {filteredChatSessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`chat-session-item ${currentChatId === session.id ? 'active' : ''}`}
                  onClick={() => handleSelectChat(session.id)}
                >
                  <div className="session-title">{session.title}</div>
                  <div className="session-meta">
                    <div className="session-time">{formatRelativeTime(session.lastMessage)}</div>
                    {session.totalTokensUsed !== undefined && (
                      <div className="session-tokens">{session.totalTokensUsed} tokens</div>
                    )}
                  </div>
                  <button 
                    className="archive-chat-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveChat(session.id);
                    }}
                    title="Archive chat"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div id="chat-sidebar-footer" className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">D</span>
            <span className="user-name">Deepak Khandelwal</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div id="chat-main" className="chat-main">
        <div id="chat-header" className="chat-header">
          <h1 className="chat-title">
            {taskContext ? taskContext.title : (currentTaskId ? `Task ${currentTaskId} Chat` : 'What are you working on?')}
          </h1>
          {taskContext && (
            <div className="task-info">
              <p className="task-subtitle">
                {taskContext.description}
              </p>
              <div className="token-info">
                <span className="token-usage">
                  {remainingTokens !== null ? `${remainingTokens} tokens remaining` : 'Loading...'}
                </span>
                <span className="task-category">{taskContext.category}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="close-error">×</button>
            </div>
          )}
        </div>

        <div id="chat-messages" className="chat-messages">
          {messages.length === 0 ? (
            <div id="chat-welcome" className="welcome-message">
              <h2>What are you working on?</h2>
              <p>Start a conversation with your AI assistant</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-meta">
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    {message.tokens_used && (
                      <div className="message-tokens">
                        {message.tokens_used} tokens
                      </div>
                    )}
                    {message.intent && (
                      <div className="message-intent">
                        Intent: {message.intent}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div id="chat-input-container" className="chat-input-container">
          <div className="input-wrapper">
            <textarea
              id="chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              className="chat-input"
              rows={1}
              disabled={isLoading}
            />
            
            <div className="input-actions">
              <label htmlFor="file-upload" className="file-upload-btn">
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden-file-input"
                  multiple
                />
                <span className="upload-icon">📎</span>
              </label>
              
              <button
                id="send-btn"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || !currentChatId || remainingTokens === 0}
                className="send-btn"
                title={remainingTokens === 0 ? 'No tokens remaining' : 'Send message'}
              >
                <span className="send-icon">{isLoading ? '...' : '↑'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};