import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

interface UsageData {
  username: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface TimeSeriesData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export default function UsageDashboard() {
  const [data, setData] = useState<UsageData[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/admin/api/usage', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          setData(result.usage || []);
          setTimeSeries(result.time_series || []);
        }
      } catch (err) {
        console.error('Failed to fetch usage data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Aggregate model data for Bar Chart
  const modelAggregation = data.reduce((acc, curr) => {
    acc[curr.model] = (acc[curr.model] || 0) + curr.total_tokens;
    return acc;
  }, {} as Record<string, number>);
  
  const barChartData = Object.entries(modelAggregation).map(([model, total_tokens]) => ({
    model,
    total_tokens
  }));

  return (
    <Box sx={{ maxWidth: 'xl', width: '100%', mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, color: 'text.primary' }}>
        Analytics & Usage
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 60%', minWidth: 300 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Daily Token Usage</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              {timeSeries.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.2)" />
                    <XAxis dataKey="date" tick={{ fill: 'gray', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'gray', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', background: 'var(--bg-card)' }}
                      itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="total_tokens" name="Total Tokens" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No time series data available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 30%', minWidth: 300 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Usage by Model</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              {barChartData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.2)" />
                    <XAxis dataKey="model" tick={{ fill: 'gray', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'gray', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', background: 'var(--bg-card)' }}
                      cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                      itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                    />
                    <Bar dataKey="total_tokens" name="Tokens" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No model data available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Detailed Breakdown</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Provider</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Input Tokens</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Output Tokens</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Tokens</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No usage data recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{row.username}</TableCell>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{row.input_tokens.toLocaleString()}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{row.output_tokens.toLocaleString()}</TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: 'primary.main' }}>
                    {row.total_tokens.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
