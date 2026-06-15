import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, LogOut, User as UserIcon, Paperclip, X, Check, Copy, FileText, ChevronDown, ChevronRight, Settings, Plus, MessageSquare, Sun, Moon, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SettingsModal from './SettingsModal';

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

interface Attachment {
  file: File;
  base64: string;
  previewUrl: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
}

interface ChatSession {
  id: number;
  title: string;
  updated_at: string;
}

export default function Chat({ onLogout }: { onLogout: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem('username') || 'User');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchModels();
    fetchProfile();
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setDisplayName(data.display_name || data.username);
      if (data.is_admin) setIsAdmin(true);
      if (data.settings?.defaultModel) setSelectedModel(data.settings.defaultModel);
      if (data.settings?.systemPrompt) setSystemPrompt(data.settings.systemPrompt);
    }
  };

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/v1/models', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setModels(data.data || []);
        if (data.data?.length > 0 && !selectedModel) {
          setSelectedModel(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch models', e);
    }
  };

  const fetchSessions = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/chat/sessions', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      setSessions(await res.json());
    }
  };

  const loadSession = async (id: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/chat/sessions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      setActiveSessionId(id);
      setMessages(await res.json());
    }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  };

  const syncMessages = async (sessionId: number, currentMessages: Message[]) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ messages: currentMessages })
    });
    fetchSessions(); // Refresh updated_at
  };

  const createNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        const base64 = await toBase64(file);
        let previewUrl = null;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }
        newAttachments.push({ file, base64, previewUrl });
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index].previewUrl) URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return;

    let content: any = input;
    if (attachments.length > 0) {
      content = [];
      attachments.forEach(att => {
        if (att.file.type.startsWith('image/')) {
          content.push({ type: 'image', source: { type: 'base64', media_type: att.file.type, data: att.base64 }, _previewUrl: att.previewUrl });
        } else if (att.file.type === 'application/pdf') {
          content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.base64 }, title: att.file.name });
        } else {
          content.push({ type: 'text', text: `[Attached File: ${att.file.name}]` });
        }
      });
      if (input.trim()) {
        content.push({ type: 'text', text: input });
      }
    }

    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages as Message[]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      let currentSessionId = activeSessionId;
      // Auto-create session if it's the first message
      if (!currentSessionId) {
        const title = typeof content === 'string' ? content.substring(0, 30) : 'New Chat';
        const sessionRes = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title: title || 'New Chat' })
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          currentSessionId = sessionData.id;
          setActiveSessionId(currentSessionId);
          setSessions(prev => [sessionData, ...prev]);
        }
      }

      // Prepare API payload (remove UI-only properties)
      const apiMessages = newMessages.map(m => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map(block => {
              const cleaned = { ...block };
              delete cleaned._previewUrl;
              delete cleaned.title;
              return cleaned;
            })
          };
        }
        return m;
      });

      const payload: any = {
        model: selectedModel,
        messages: apiMessages,
        max_tokens: 4096,
        stream: true
      };
      if (systemPrompt) {
        payload.system = [{ type: "text", text: systemPrompt }];
      }

      const res = await fetch('/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        if (res.status === 401) { onLogout(); return; }
        throw new Error('API request failed: ' + res.status);
      }

      setLoading(false);
      
      const newResponseMsg: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, newResponseMsg]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let currentMessageText = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr.trim() === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  currentMessageText += data.delta.text;
                  setMessages(prev => {
                    const latest = [...prev];
                    latest[latest.length - 1].content = currentMessageText;
                    return latest;
                  });
                } else if (data.type === 'message_start' && data.message?.content?.[0]?.text) {
                  currentMessageText += data.message.content[0].text;
                  setMessages(prev => {
                    const latest = [...prev];
                    latest[latest.length - 1].content = currentMessageText;
                    return latest;
                  });
                }
              } catch(e) {}
            }
          }
        }
      }

      // Sync final state to DB
      if (currentSessionId) {
        await syncMessages(currentSessionId, [...newMessages, { role: 'assistant', content: currentMessageText }] as Message[]);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error connecting to server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    
    const handleCopy = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && match) {
      return (
        <div className="code-block-wrapper" style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d2d2d', padding: '6px 12px', fontSize: '0.75rem', color: '#a0a0a0' }}>
            <span>{match[1]}</span>
            <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <SyntaxHighlighter
            style={theme === 'dark' ? atomDark : prism}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '0.9rem' }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }
    return <code className={className} style={{ background: 'rgba(128,128,128,0.2)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.9em' }} {...props}>{children}</code>;
  };

  const ThinkBlock = ({ children }: { children: React.ReactNode }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="think-block" style={{ margin: '12px 0', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div 
          onClick={() => setExpanded(!expanded)}
          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-card)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Thinking Process
        </div>
        {expanded && (
          <div style={{ padding: '14px', borderTop: '1px solid var(--panel-border)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any }}>
              {String(children)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  const renderContent = (content: string | any[]) => {
    if (typeof content === 'string') {
      const processed = content.replace(/<think>([\s\S]*?)<\/think>/g, '<think>$1</think>');
      return (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code: CodeBlock as any,
            think: ({ children }: any) => <ThinkBlock>{children}</ThinkBlock>
          } as any}
        >
          {processed}
        </ReactMarkdown>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {content.map((block, i) => {
          if (block.type === 'text') {
            return <div key={i}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any }}>{block.text}</ReactMarkdown></div>;
          }
          if (block.type === 'image') {
            return <img key={i} src={block._previewUrl || `data:${block.source.media_type};base64,${block.source.data}`} alt="upload" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid var(--panel-border)' }} />;
          }
          if (block.type === 'document') {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <FileText size={28} color="var(--accent)" />
                <span style={{ fontWeight: 500 }}>{block.title || 'PDF Document'}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="chat-layout animate-fade-in">
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewSession}>
            <span>New chat</span>
            <Plus size={18} />
          </button>
          
          {isAdmin && (
            <button 
              className="new-chat-btn" 
              style={{ marginTop: '12px', borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)' }} 
              onClick={() => navigate('/admin')}
            >
              <span>Admin Dashboard</span>
              <Settings size={18} />
            </button>
          )}
        </div>
        
        <div className="sidebar-history">
          <div className="history-section">
            <div className="history-title">Chat History</div>
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`history-item ${activeSessionId === session.id ? 'active' : ''}`} 
                onClick={() => loadSession(session.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <MessageSquare size={14} color="var(--text-muted)" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(session.id, e)} 
                  className="delete-session-btn" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div style={{ padding: '0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No recent chats</div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="message-avatar" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <UserIcon size={18} color="white" />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={18} />
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn" onClick={onLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="main-chat">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--text-main) 0%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aura</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={14} color="var(--text-muted)" />
            <select 
              value={selectedModel} 
              onChange={e => setSelectedModel(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              {models.length === 0 && <option value="">Loading models...</option>}
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>What can I help you with?</h2>
              <p>Type a message or upload a file to get started.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <UserIcon size={20} /> : <img src="/favicon.svg" alt="AI" width={20} height={20} />}
                </div>
                <div className="message-content">
                  {renderContent(msg.content)}
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="message assistant animate-fade-in">
              <div className="message-avatar">
                <img src="/favicon.svg" alt="AI" width={20} height={20} />
              </div>
              <div className="message-content" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-container">
            {attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', padding: '8px 4px 16px 4px', flexWrap: 'wrap', borderBottom: '1px solid var(--panel-border)', marginBottom: '8px' }}>
                {attachments.map((att, i) => (
                  <div key={i} style={{ position: 'relative', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: att.previewUrl ? '6px' : '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {att.previewUrl ? (
                      <img src={att.previewUrl} alt="preview" style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <FileText size={24} color="var(--accent)" />
                    )}
                    {!att.previewUrl && <span style={{ fontSize: '0.85rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{att.file.name}</span>}
                    <button onClick={() => removeAttachment(i)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="input-wrapper">
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'transparent', border: 'none', padding: '10px 4px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                title="Attach Image or PDF"
              >
                <Paperclip size={22} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                multiple 
                accept="image/*,application/pdf" 
                onChange={handleFileSelect} 
              />
              
              <textarea 
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message Assistant..."
                rows={Math.min(5, input.split('\n').length || 1)}
              />
              
              <button 
                className="send-button"
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || loading}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI can make mistakes. Please verify important information.
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onProfileUpdate={(profile) => {
            setDisplayName(profile.display_name || profile.username);
            if (profile.settings?.defaultModel) setSelectedModel(profile.settings.defaultModel);
            if (profile.settings?.systemPrompt) setSystemPrompt(profile.settings.systemPrompt);
          }} 
        />
      )}
    </div>
  );
}
