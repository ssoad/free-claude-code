import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Settings, ArrowLeft } from 'lucide-react';

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
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
          <ArrowLeft size={18} style={{ marginRight: '8px' }} />
          Back to Chat
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item active"><Users size={18} /> Users</button>
          <button className="admin-nav-item"><Activity size={18} /> Activity</button>
          <button className="admin-nav-item"><Settings size={18} /> Settings</button>
        </nav>
      </aside>
      
      <main className="admin-main">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
        </header>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Today</div>
            <div className="stat-value">{users.length > 0 ? 1 : 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">System Status</div>
            <div className="stat-value text-accent">Healthy</div>
          </div>
        </div>

        <section className="admin-content-section">
          <h2>Registered Users</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Display Name</th>
                  <th>Joined</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.display_name || '-'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`role-badge ${u.is_admin ? 'admin' : 'user'}`}>
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No users found</td>
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
