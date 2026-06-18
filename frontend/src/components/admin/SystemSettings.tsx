import { Box, Typography, TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl, Card, CardContent, Divider, Tooltip } from '@mui/material';
import { HelpOutlined } from '@mui/icons-material';

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
        return (
          <Box key={field.key} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={field.label}
              type={field.type === 'password' ? 'password' : 'text'}
              value={field.value || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              helperText={field.description}
              variant="outlined"
              sx={{ background: 'background.paper' }}
            />
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
