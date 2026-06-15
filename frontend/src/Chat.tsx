import { useState, useRef, useEffect } from 'react';
import { Send, LogOut, User as UserIcon, Paperclip, X, Check, Copy, FileText, ChevronDown, ChevronRight, Settings, Plus, MessageSquare, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

export default function Chat({ onLogout }: { onLogout: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const username = localStorage.getItem('username');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/v1/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data.data || []);
        if (data.data?.length > 0) {
          setSelectedModel(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch models', e);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
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
        console.error('File read error:', err);
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAtt = [...prev];
      if (newAtt[index].previewUrl) URL.revokeObjectURL(newAtt[index].previewUrl!);
      newAtt.splice(index, 1);
      return newAtt;
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return;
    if (!selectedModel) {
      alert("Please select a model first");
      return;
    }
    
    let content: any = input.trim();
    const currentAtt = [...attachments];
    
    if (currentAtt.length > 0) {
      content = [];
      for (const att of currentAtt) {
        if (att.file.type.startsWith('image/')) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: att.file.type, data: att.base64 },
            _previewUrl: att.previewUrl
          });
        } else if (att.file.type === 'application/pdf') {
          content.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: att.base64 },
            title: att.file.name
          });
        }
      }
      if (input.trim()) {
        content.push({ type: 'text', text: input.trim() });
      }
    }

    setMessages(prev => [...prev, { role: 'user', content }]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiMessages = [...messages, { role: 'user', content }].map(m => {
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

      const res = await fetch('/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          onLogout(); return;
        }
        throw new Error('API request failed: ' + res.status);
      }

      setLoading(false);
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let currentMessage = '';
      
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
                  currentMessage += data.delta.text;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = currentMessage;
                    return newMessages;
                  });
                }
              } catch(e) {}
            }
          }
        }
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
          <span>Thinking Process</span>
        </div>
        {expanded && (
          <div style={{ padding: '14px', fontSize: '0.9rem', color: 'var(--text-muted)', borderTop: '1px solid var(--panel-border)', background: 'var(--input-bg)' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const renderContent = (content: string | any[]) => {
    if (typeof content === 'string') {
      let processed = content.replace(/<think>([\s\S]*?)<\/think>/g, (_, p1) => {
        return `<think>${p1}</think>`;
      });
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
          <button className="new-chat-btn" onClick={() => setMessages([])}>
            <span>New chat</span>
            <Plus size={18} />
          </button>
        </div>
        
        <div className="sidebar-history">
          <div className="history-section">
            <div className="history-title">Today</div>
            {messages.length > 0 ? (
               <div className="history-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <MessageSquare size={14} color="var(--text-muted)" />
                 {typeof messages[0].content === 'string' 
                    ? messages[0].content.substring(0, 25) + '...' 
                    : 'Chat with attachments'}
               </div>
            ) : (
               <div style={{ padding: '0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No recent chats</div>
            )}
          </div>
          <div className="history-section">
            <div className="history-title">Previous 7 Days</div>
            <div className="history-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={14} color="var(--text-muted)" />
              Setup documentation...
            </div>
            <div className="history-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={14} color="var(--text-muted)" />
              React components build...
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="message-avatar" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <UserIcon size={18} color="white" />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{username}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleTheme} style={{ background: 'transparent', padding: '8px', color: 'var(--text-muted)', borderRadius: '8px' }} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onLogout} style={{ background: 'transparent', padding: '8px', color: 'var(--text-muted)', borderRadius: '8px' }} title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="main-chat">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h1 style={{ marginBottom: '12px', color: 'var(--text-main)', fontSize: '2rem', fontWeight: 700 }}>How can I help you today?</h1>
              <p style={{ fontSize: '1.1rem' }}>Type a message or upload a document to begin.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <UserIcon size={18} color={theme === 'light' ? 'white' : 'white'} /> : '🤖'}
                </div>
                <div className="message-content">
                  <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem', color: msg.role === 'user' ? 'inherit' : 'var(--text-muted)', opacity: msg.role === 'user' ? 0.9 : 1 }}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content" style={{ color: 'var(--text-muted)' }}>Thinking...</div>
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
                accept="image/png, image/jpeg, image/webp, application/pdf" 
                onChange={handleFileSelect} 
              />
              
              <textarea 
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message Assistant..."
                rows={Math.min(5, input.split('\n').length)}
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
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', padding: '6px 16px', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Settings size={14} color="var(--text-muted)" />
              <select 
                value={selectedModel} 
                onChange={e => setSelectedModel(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: '12px' }}
              >
                {models.length === 0 && <option value="">Loading models...</option>}
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
