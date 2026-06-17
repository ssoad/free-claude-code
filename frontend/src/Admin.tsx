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
  Memory, 
  ArrowBack 
} from '@mui/icons-material';

import UserManager from './components/admin/UserManager';
import ProviderManager from './components/admin/ProviderManager';

const drawerWidth = 260;

// Create a sleek dark/light theme to match Aura's aesthetic
const adminTheme = createTheme({
  palette: {
    mode: localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
    primary: { main: '#6366f1' },
    background: {
      default: localStorage.getItem('theme') === 'light' ? '#f4f4f5' : '#1a1a1a',
      paper: localStorage.getItem('theme') === 'light' ? '#ffffff' : '#2d2d2d',
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

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManager />;
      case 'providers':
        return <ProviderManager />;
      case 'overview':
      default:
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

            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                selected={activeTab === 'providers'} 
                onClick={() => setActiveTab('providers')}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: activeTab === 'providers' ? 'primary.main' : 'inherit' }}><Memory fontSize="small" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'providers' ? 600 : 500, fontSize: '0.95rem' }}>LLM Providers</Typography>} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><Settings fontSize="small" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>Settings</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
          <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Toolbar sx={{ justifyContent: 'flex-end' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>System Online</Typography>
              </Box>
            </Toolbar>
          </AppBar>
          
          <Box sx={{ p: 6 }}>
            {renderContent()}
          </Box>
        </Box>

      </Box>
    </ThemeProvider>
  );
}
