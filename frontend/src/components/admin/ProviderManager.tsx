import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Snackbar
} from '@mui/material';
import { Save, VpnKey } from '@mui/icons-material';

interface ProviderConfig {
  provider_type: string;
  anthropic_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  bedrock_aws_access_key_id?: string;
  bedrock_aws_secret_access_key?: string;
  bedrock_aws_region?: string;
  lmstudio_host?: string;
  ollama_host?: string;
  [key: string]: any;
}

export default function ProviderManager() {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/admin/api/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load LLM configuration');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/admin/api/config/validate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: config })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to save configuration');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProviderConfig, value: string) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (!config) return <Typography color="error">Failed to load configuration.</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>LLM Provider Configuration</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Active Provider</Typography>
        <FormControl fullWidth sx={{ mb: 4 }}>
          <InputLabel>Primary LLM Provider</InputLabel>
          <Select
            value={config.provider_type || 'anthropic'}
            label="Primary LLM Provider"
            onChange={(e) => handleChange('provider_type', e.target.value)}
          >
            <MenuItem value="anthropic">Anthropic (Claude)</MenuItem>
            <MenuItem value="openai">OpenAI (ChatGPT)</MenuItem>
            <MenuItem value="gemini">Google Gemini</MenuItem>
            <MenuItem value="bedrock">AWS Bedrock</MenuItem>
            <MenuItem value="lmstudio">LM Studio (Local)</MenuItem>
            <MenuItem value="ollama">Ollama (Local)</MenuItem>
            <MenuItem value="llamacpp">llama.cpp (Local)</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>API Keys & Credentials</Typography>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <VpnKey sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
            <TextField 
              fullWidth 
              label="Anthropic API Key" 
              type="password"
              variant="outlined" 
              value={config.anthropic_api_key || ''}
              onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
              placeholder="sk-ant-..."
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <VpnKey sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
            <TextField 
              fullWidth 
              label="OpenAI API Key" 
              type="password"
              variant="outlined" 
              value={config.openai_api_key || ''}
              onChange={(e) => handleChange('openai_api_key', e.target.value)}
              placeholder="sk-..."
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <VpnKey sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
            <TextField 
              fullWidth 
              label="Google Gemini API Key" 
              type="password"
              variant="outlined" 
              value={config.gemini_api_key || ''}
              onChange={(e) => handleChange('gemini_api_key', e.target.value)}
            />
          </Box>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Local Provider Settings</Typography>
        <Stack spacing={3}>
          <TextField 
            fullWidth 
            label="Ollama Host URL" 
            variant="outlined" 
            value={config.ollama_host || 'http://127.0.0.1:11434'}
            onChange={(e) => handleChange('ollama_host', e.target.value)}
          />
          <TextField 
            fullWidth 
            label="LM Studio Host URL" 
            variant="outlined" 
            value={config.lmstudio_host || 'http://127.0.0.1:1234'}
            onChange={(e) => handleChange('lmstudio_host', e.target.value)}
          />
        </Stack>
      </Paper>

      <Snackbar 
        open={success} 
        autoHideDuration={4000} 
        onClose={() => setSuccess(false)}
        message="Configuration saved successfully."
      />
    </Box>
  );
}
