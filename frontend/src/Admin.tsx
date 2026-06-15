import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Settings, ArrowLeft, ShieldCheck, Database } from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  display_name: string | null;
  created_at: string;
  is_admin: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch('/api/auth/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          navigate('/chat');
        } else {
          setError('Failed to load users');
        }
        return;
      }
      
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;

  return (
    <div className="chat-layout animate-fade-in">
      {/* Reusing Chat Sidebar Styles for Consistency */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button 
            className="new-chat-btn" 
            onClick={() => navigate('/chat')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            <span>Back to Chat</span>
          </button>
        </div>
        
        <div className="sidebar-history">
          <div className="history-section">
            <div className="history-title">Administration</div>
            <div className="history-item active" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={16} />
              <span style={{ fontWeight: 500 }}>User Management</span>
            </div>
            <div className="history-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
              <Activity size={16} />
              <span>System Activity</span>
            </div>
            <div className="history-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
              <Settings size={16} />
              <span>Global Settings</span>
            </div>
          </div>
        </div>
      </div>
      
      <main className="admin-main" style={{ flex: 1, backgroundColor: 'var(--bg-color)', overflowY: 'auto', padding: '40px 60px' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your Aura instance, users, and global configurations.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>System Online</span>
          </div>
        </header>

        {error && <div className="auth-error" style={{ marginBottom: '24px' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--panel-border)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--accent)' }}>
                <Users size={20} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Users</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>{users.length}</div>
          </div>
          
          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--panel-border)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px', color: '#10b981' }}>
                <ShieldCheck size={20} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admins</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>{users.filter(u => u.is_admin).length}</div>
          </div>

          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--panel-border)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '10px', borderRadius: '10px', color: '#ec4899' }}>
                <Database size={20} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Database Size</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>1.2 <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>MB</span></div>
          </div>
        </div>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Registered Users</h2>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--panel-border)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)', background: 'var(--input-bg)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined Date</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--panel-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--accent)' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.display_name || u.username}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.username} • ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {u.is_admin ? (
                        <span style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>Admin</span>
                      ) : (
                        <span style={{ padding: '4px 12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>User</span>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button style={{ background: 'transparent', border: '1px solid var(--panel-border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
