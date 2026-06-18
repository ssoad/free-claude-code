import { Box, Typography, TextField, Switch, Select, MenuItem, InputLabel, FormControl, Card, CardContent, Divider, Button, CircularProgress, Chip, IconButton, Autocomplete } from '@mui/material';
import { Refresh, DragIndicator, DeleteOutlined, ArrowUpward, ArrowDownward } from '@mui/icons-material';
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

// Fallback Chain Builder component for MODEL_* routing keys
const FallbackModelBuilder = ({ value, onChange, cachedModels }: { value: string, onChange: (val: string) => void, cachedModels: Record<string, string[]> }) => {
  const models = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const [newModel, setNewModel] = useState('');

  // Flatten all known models from all providers
  const allKnownModels = Object.entries(cachedModels).flatMap(([provider, providerModels]) => 
    providerModels.map(m => `${provider}/${m}`)
  );

  const handleAdd = () => {
    if (newModel && !models.includes(newModel)) {
      onChange([...models, newModel].join(','));
      setNewModel('');
    }
  };

  const handleRemove = (index: number) => {
    const next = [...models];
    next.splice(index, 1);
    onChange(next.join(','));
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= models.length) return;
    const next = [...models];
    const temp = next[index];
    next[index] = next[index + dir];
    next[index + dir] = temp;
    onChange(next.join(','));
  };

  return (
    <Box sx={{ mt: 2, mb: 4, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
        Fallback Chain Sequence
      </Typography>
      
      {models.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 2 }}>
          No models configured. Will inherit from default MODEL.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {models.map((mod, idx) => (
            <Box key={`${mod}-${idx}`} sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, gap: 1 }}>
              <DragIndicator sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
              <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, fontFamily: 'monospace' }}>
                {idx === 0 ? <Chip label="Primary" size="small" color="primary" sx={{ mr: 1, height: 20, fontSize: '0.65rem' }} /> : 
                 <Chip label={`Fallback ${idx}`} size="small" variant="outlined" sx={{ mr: 1, height: 20, fontSize: '0.65rem' }} />}
                {mod}
              </Typography>
              <IconButton size="small" onClick={() => handleMove(idx, -1)} disabled={idx === 0}><ArrowUpward fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => handleMove(idx, 1)} disabled={idx === models.length - 1}><ArrowDownward fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => handleRemove(idx)}><DeleteOutlined fontSize="small" /></IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Autocomplete
          freeSolo
          size="small"
          options={allKnownModels}
          sx={{ flexGrow: 1 }}
          value={newModel}
          onChange={(_, val) => setNewModel(val || '')}
          onInputChange={(_, val) => setNewModel(val)}
          renderInput={(params) => <TextField {...params} label="Add model (provider/model_name)" variant="outlined" />}
        />
        <Button variant="contained" onClick={handleAdd} disabled={!newModel}>Add</Button>
      </Box>
    </Box>
  );
};

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
          <Box key={field.key} sx={{ 
            mb: 2, 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: 'primary.main', opacity: 0.9 }
          }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>{field.label}</Typography>
              {field.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {field.description}
                </Typography>
              )}
            </Box>
            <Switch
              checked={Boolean(field.value)}
              onChange={(e) => onChange(field.key, e.target.checked)}
              color="primary"
            />
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
        if (['MODEL', 'MODEL_OPUS', 'MODEL_SONNET', 'MODEL_HAIKU'].includes(field.key)) {
          return (
            <Box key={field.key} sx={{ mb: 5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{field.label}</Typography>
              {field.description && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{field.description}</Typography>}
              <FallbackModelBuilder 
                value={field.value || ''} 
                onChange={(val) => onChange(field.key, val)} 
                cachedModels={cachedModels} 
              />
            </Box>
          );
        }

        // Find if this field matches a provider's credential_env
        const providerMatchText = providerStatuses.find(p => p.credential_env === field.key);
        const modelsText = providerMatchText ? cachedModels[providerMatchText.provider_id] : null;
        
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
              {providerMatchText && (
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => testProvider(providerMatchText.provider_id)}
                  disabled={isTesting[providerMatchText.provider_id]}
                  startIcon={isTesting[providerMatchText.provider_id] ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ height: 56, whiteSpace: 'nowrap' }}
                >
                  Refresh Models
                </Button>
              )}
            </Box>
            
            {providerMatchText && modelsText && modelsText.length > 0 && (
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ width: '100%', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  {modelsText.length} Discovered Models:
                </Typography>
                {modelsText.map((m: string) => (
                  <Chip key={m} label={m} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
              </Box>
            )}
          </Box>
        );

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
    <Box sx={{ maxWidth: 'xl', width: '100%', mx: 'auto' }}>
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
