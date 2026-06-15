import { useState, useEffect } from 'react';
import { X, User, Sliders, Check } from 'lucide-react';

interface UserProfile {
  username: string;
  display_name: string | null;
  settings: any;
}

export default function SettingsModal({ onClose, onProfileUpdate }: { onClose: () => void, onProfileUpdate: (p: UserProfile) => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Prefs form
  const [defaultModel, setDefaultModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [prefsSuccess, setPrefsSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setDisplayName(data.display_name || '');
      setDefaultModel(data.settings?.defaultModel || '');
      setSystemPrompt(data.settings?.systemPrompt || '');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/me/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ display_name: displayName, password: password || undefined })
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      onProfileUpdate(data);
      setProfileSuccess('Profile updated successfully!');
      setPassword('');
      setTimeout(() => setProfileSuccess(''), 3000);
    }
  };

  const handlePrefsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/me/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ settings: { defaultModel, systemPrompt } })
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      onProfileUpdate(data);
      setPrefsSuccess('Preferences saved successfully!');
      setTimeout(() => setPrefsSuccess(''), 3000);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="modal-content" style={{ background: 'var(--bg-panel)', width: '500px', maxWidth: '90vw', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setActiveTab('profile')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'profile' ? 'var(--text-color)' : 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <User size={16} /> Profile
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'preferences' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'preferences' ? 'var(--text-color)' : 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Sliders size={16} /> Preferences
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Display Name</label>
                <input 
                  className="auth-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New Password</label>
                <input 
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <button type="submit" className="auth-button" style={{ marginTop: '8px' }}>Save Profile</button>
              {profileSuccess && <div style={{ color: 'var(--accent)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={16} /> {profileSuccess}</div>}
            </form>
          ) : (
            <form onSubmit={handlePrefsSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Default Model ID</label>
                <input 
                  className="auth-input"
                  value={defaultModel}
                  onChange={e => setDefaultModel(e.target.value)}
                  placeholder="e.g. claude-3-5-sonnet-20241022"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>System Instructions</label>
                <textarea 
                  className="auth-input"
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="Custom instructions for all new chats..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="auth-button" style={{ marginTop: '8px' }}>Save Preferences</button>
              {prefsSuccess && <div style={{ color: 'var(--accent)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={16} /> {prefsSuccess}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
