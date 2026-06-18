import { Box, Typography, TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl, Card, CardContent, Divider, Tooltip, Button, CircularProgress, Chip } from '@mui/material';
import { HelpOutlined, Refresh } from '@mui/icons-material';
import { useState, useEffect } from 'react';

export interface ConfigField {
  key: string;
  label: string;
  section: string;
  type: string;
  value: any;
  options?: { value: string; label: string }[];
  description?: string;
  advanced?: boolean;
}

interface SystemSettingsProps {
  section: string;
  fields: ConfigField[];
  onChange: (key: string, value: any) => void;
  title: string;
  description: string;
}

export default function SystemSettings({ section, fields, onChange, title, description }: SystemSettingsProps) {
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);
  const [cachedModels, setCachedModels] = useState<Record<string, string[]>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (section === 'providers') {
      fetchStatus();
    }
  }, [section]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/admin/api/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProviderStatuses(data.provider_status || []);
        setCachedModels(data.cached_models || {});
      }
    } catch (e) {
      console.error('Failed to fetch provider status', e);
    }
  };

  const testProvider = async (providerId: string) => {
    setIsTesting(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await fetch(`/admin/api/providers/${providerId}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.ok) {
        setCachedModels(prev => ({ ...prev, [providerId]: data.models || [] }));
      } else {
        alert(`Error: ${data.error_type}`);
      }
    } catch (e) {
      console.error('Test failed', e);
    } finally {
      setIsTesting(prev => ({ ...prev, [providerId]: false }));
    }
  };

  // Filter fields belonging to this section
  const sectionFields = fields.filter(f => f.section === section);

  // Group fields into regular and advanced
  const regularFields = sectionFields.filter(f => !f.advanced);
  const advancedFields = sectionFields.filter(f => f.advanced);

  const renderField = (field: ConfigField) => {
    switch (field.type) {
      case 'boolean':
        return (
          <Box key={field.key} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(field.value)}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography sx={{ fontWeight: 500 }}>{field.label}</Typography>}
            />
            {field.description && (
              <Tooltip title={field.description} arrow>
                <HelpOutlined sx={{ ml: 1, color: 'text.secondary', fontSize: '1.2rem', cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
        );

      case 'select':
        return (
          <FormControl fullWidth key={field.key} sx={{ mb: 3 }}>
            <InputLabel id={`label-${field.key}`}>{field.label}</InputLabel>
            <Select
              labelId={`label-${field.key}`}
              value={field.value || ''}
              label={field.label}
              onChange={(e) => onChange(field.key, e.target.value)}
              sx={{ background: 'background.paper' }}
            >
              {field.options?.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {field.description && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                {field.description}
              </Typography>
            )}
          </FormControl>
        );

      case 'password':
      case 'text':
      default:
        // Find if this field matches a provider's credential_env
        const providerMatch = providerStatuses.find(p => p.credential_env === field.key);
        const models = providerMatch ? cachedModels[providerMatch.provider_id] : null;
        
        return (
          <Box key={field.key} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label={field.label}
                type={field.type === 'password' ? 'password' : 'text'}
                value={field.value || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                helperText={field.description}
                variant="outlined"
                sx={{ background: 'background.paper', flexGrow: 1 }}
              />
              {providerMatch && (
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => testProvider(providerMatch.provider_id)}
                  disabled={isTesting[providerMatch.provider_id]}
                  startIcon={isTesting[providerMatch.provider_id] ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ height: 56, whiteSpace: 'nowrap' }}
                >
                  Refresh Models
                </Button>
              )}
            </Box>
            
            {providerMatch && models && models.length > 0 && (
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ width: '100%', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  {models.length} Discovered Models:
                </Typography>
                {models.map((m: string) => (
                  <Chip key={m} label={m} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
              </Box>
            )}
          </Box>
        );
    }
  };

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        {description}
      </Typography>

      <Card sx={{ 
        mb: 4, 
        background: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: 'var(--glass-shadow)'
      }}>
        <CardContent sx={{ p: 4 }}>
          {regularFields.length > 0 ? (
            regularFields.map(renderField)
          ) : (
            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              No basic settings available for this section.
            </Typography>
          )}

          {advancedFields.length > 0 && (
            <>
              <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Advanced Settings
              </Typography>
              {advancedFields.map(renderField)}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
