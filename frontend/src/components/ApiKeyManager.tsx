import { useState, useEffect } from 'react';
import { Key, Trash2, Copy, Check } from 'lucide-react';

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        setError('Failed to fetch API keys.');
      }
    } catch (e) {
      setError('Network error loading API keys.');
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setNewKeyName('');
        fetchKeys(); // Refresh list to show the new key (with just prefix)
      } else {
        setError('Failed to create API key.');
      }
    } catch (e) {
      setError('Error creating API key.');
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Any applications using it will stop working immediately.")) {
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchKeys();
      } else {
        setError('Failed to revoke API key.');
      }
    } catch (e) {
      setError('Error revoking API key.');
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Generated Key Modal / Banner */}
      {generatedKey && (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>Key Created Successfully!</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Please copy this secret key and store it somewhere safe. For security reasons, <strong>you will not be able to view it again.</strong>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              readOnly 
              value={generatedKey} 
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace' }}
            />
            <button 
              onClick={copyToClipboard}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
            </button>
          </div>
          <button 
            onClick={() => setGeneratedKey(null)}
            style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
          >
            I have saved this key safely
          </button>
        </div>
      )}

      {/* Create New Key */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New API Key Name</label>
          <input 
            className="auth-input"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="e.g. My CLI Agent"
            maxLength={50}
          />
        </div>
        <button 
          type="submit" 
          className="auth-button" 
          style={{ padding: '0 20px', height: '42px', whiteSpace: 'nowrap', opacity: !newKeyName.trim() ? 0.5 : 1, cursor: !newKeyName.trim() ? 'not-allowed' : 'pointer' }}
          disabled={!newKeyName.trim()}
        >
          Create Key
        </button>
      </form>

      {/* Key List */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500 }}>Active Keys</h4>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading keys...</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--panel-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
            No API keys found. Create one above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {keys.map(key => (
              <div key={key.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={14} color="var(--accent)" />
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{key.name}</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {key.prefix}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Created: {new Date(key.created_at).toLocaleDateString()}
                    {' • '}
                    Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <button 
                  onClick={() => handleRevoke(key.id)}
                  title="Revoke Key"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
