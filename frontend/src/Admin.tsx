import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  AppBar, 
  Toolbar,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { 
  Dashboard, 
  People, 
  Settings, 
  ArrowBack 
} from '@mui/icons-material';

import UserManager from './components/admin/UserManager';
import SystemSettings, { type ConfigField } from './components/admin/SystemSettings';
import { useEffect } from 'react';

const drawerWidth = 260;

// Create a sleek dark/light theme to match Aura's aesthetic
const adminTheme = createTheme({
  palette: {
    mode: localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
    primary: { main: '#d97757' }, // Matched to --accent
    background: {
      default: localStorage.getItem('theme') === 'light' ? '#ffffff' : '#1a1a1a', // Matched to --bg-color
      paper: localStorage.getItem('theme') === 'light' ? '#f4f4f5' : '#2d2d2d', // Matched to --bg-card/--input-bg
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
});

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/admin/api/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  };

  const sections = Array.from(new Set(fields.map(f => f.section))).sort();
  
  const formatSectionName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleConfigChange = (key: string, value: any) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, value } : f));
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    const token = localStorage.getItem('token');
    
    // Prepare payload {"values": {"KEY": "value"}}
    const payloadValues: Record<string, any> = {};
    fields.forEach(f => {
      payloadValues[f.key] = f.value;
    });

    try {
      const res = await fetch('/admin/api/config/apply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ values: payloadValues })
      });
      const data = await res.json();
      if (data.applied) {
        setSaveMessage('Settings saved successfully! Refreshing models...');
        try {
          await fetch('/admin/api/models/refresh', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setSaveMessage('Settings saved and models refreshed!' + (data.restart?.required ? ' Server restart pending.' : ''));
        } catch (e) {
          setSaveMessage('Settings saved but failed to refresh models.');
        }
        fetchConfig(); // Reload from server
      } else {
        setSaveMessage('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const renderContent = () => {
    if (activeTab === 'users') return <UserManager />;
    if (activeTab === 'overview') {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="text.secondary" sx={{ mt: 10 }}>
            Welcome to the Aura Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Select a tool from the sidebar to begin managing your instance.
          </Typography>
        </Box>
      );
    }
    
    // Dynamic config section renderer
    return <SystemSettings 
      section={activeTab} 
      fields={fields} 
      onChange={handleConfigChange} 
      title={formatSectionName(activeTab) + " Settings"} 
      description={`Manage configuration for ${formatSectionName(activeTab).toLowerCase()}.`} 
    />;
  };

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
          }}
        >
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>A</Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Aura Admin</Typography>
          </Box>
          <Divider />
          <List sx={{ px: 2, pt: 2 }}>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                onClick={() => navigate('/chat')}
                sx={{ borderRadius: 2, color: 'text.secondary' }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}><ArrowBack fontSize="small" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>Back to Chat</Typography>} />
              </ListItemButton>
            </ListItem>
            
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600, mt: 2, mb: 1 }}>
              MANAGEMENT
            </Typography>

            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                selected={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: activeTab === 'overview' ? 'primary.main' : 'inherit' }}><Dashboard fontSize="small" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'overview' ? 600 : 500, fontSize: '0.95rem' }}>Overview</Typography>} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                selected={activeTab === 'users'} 
                onClick={() => setActiveTab('users')}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: activeTab === 'users' ? 'primary.main' : 'inherit' }}><People fontSize="small" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'users' ? 600 : 500, fontSize: '0.95rem' }}>Users</Typography>} />
              </ListItemButton>
            </ListItem>

            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600, mt: 2, mb: 1 }}>
              SYSTEM CONFIGURATION
            </Typography>

            {sections.map(section => (
              <ListItem disablePadding sx={{ mb: 1 }} key={section}>
                <ListItemButton 
                  selected={activeTab === section} 
                  onClick={() => setActiveTab(section)}
                  sx={{ borderRadius: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: activeTab === section ? 'primary.main' : 'inherit' }}><Settings fontSize="small" /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontWeight: activeTab === section ? 600 : 500, fontSize: '0.95rem' }}>{formatSectionName(section)}</Typography>} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
          <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Toolbar sx={{ justifyContent: 'flex-end', gap: 2 }}>
              {saveMessage && (
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>{saveMessage}</Typography>
              )}
              <button 
                onClick={saveConfig}
                disabled={isSaving}
                style={{ 
                  background: 'var(--accent)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: isSaving ? 0.7 : 1
                }}>
                {isSaving ? 'Saving...' : 'Apply Config Changes'}
              </button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>System Online</Typography>
              </Box>
            </Toolbar>
          </AppBar>
          
          <Box sx={{ p: { xs: 2, md: 4, lg: 6 } }}>
            {renderContent()}
          </Box>
        </Box>

      </Box>
    </ThemeProvider>
  );
}
