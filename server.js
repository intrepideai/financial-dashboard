const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'justbecause';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_UhuR5m7PzwYC@ep-little-flower-af231d9g.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth middleware
const requireAuth = (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// LLM pricing table (per 1M tokens)
const PRICING = {
  'anthropic/claude-opus-4-5': { input: 15.00, output: 75.00 },
  'anthropic/claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'anthropic/claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-5-haiku-latest': { input: 1.00, output: 5.00 },
  'openai/gpt-4': { input: 30.00, output: 60.00 },
  'openai/gpt-4-turbo': { input: 10.00, output: 30.00 },
  'openai/gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

// Calculate cost from tokens
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = PRICING[model] || { input: 0, output: 0 };
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  return inputCost + outputCost;
}

// ====================
// API ENDPOINTS
// ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get cost summary
app.get('/api/costs/summary', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(cost_usd) as total_cost,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 day' THEN cost_usd ELSE 0 END) as today_cost,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN cost_usd ELSE 0 END) as week_cost,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN cost_usd ELSE 0 END) as month_cost
      FROM llm_costs
    `);
    
    const azureResult = await pool.query(`
      SELECT 
        SUM(cost_usd) as total_azure_cost,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 day' THEN cost_usd ELSE 0 END) as today_azure,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN cost_usd ELSE 0 END) as week_azure,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN cost_usd ELSE 0 END) as month_azure
      FROM azure_costs
    `);
    
    const llm = result.rows[0];
    const azure = azureResult.rows[0];
    
    res.json({
      llm: {
        total: parseFloat(llm.total_cost || 0),
        today: parseFloat(llm.today_cost || 0),
        week: parseFloat(llm.week_cost || 0),
        month: parseFloat(llm.month_cost || 0),
        sessions: parseInt(llm.total_sessions || 0)
      },
      azure: {
        total: parseFloat(azure.total_azure_cost || 0),
        today: parseFloat(azure.today_azure || 0),
        week: parseFloat(azure.week_azure || 0),
        month: parseFloat(azure.month_azure || 0)
      },
      combined: {
        total: parseFloat(llm.total_cost || 0) + parseFloat(azure.total_azure_cost || 0),
        today: parseFloat(llm.today_cost || 0) + parseFloat(azure.today_azure || 0),
        week: parseFloat(llm.week_cost || 0) + parseFloat(azure.week_azure || 0),
        month: parseFloat(llm.month_cost || 0) + parseFloat(azure.month_azure || 0)
      }
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get costs by agent
app.get('/api/costs/by-agent', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        agent_id,
        COUNT(*) as session_count,
        SUM(cost_usd) as total_cost,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM llm_costs
      GROUP BY agent_id
      ORDER BY total_cost DESC
    `);
    
    res.json(result.rows.map(row => ({
      agent: row.agent_id,
      sessions: parseInt(row.session_count),
      cost: parseFloat(row.total_cost),
      inputTokens: parseInt(row.total_input_tokens),
      outputTokens: parseInt(row.total_output_tokens)
    })));
  } catch (err) {
    console.error('Error fetching by-agent:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get costs by model
app.get('/api/costs/by-model', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        model,
        provider,
        COUNT(*) as usage_count,
        SUM(cost_usd) as total_cost,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM llm_costs
      GROUP BY model, provider
      ORDER BY total_cost DESC
    `);
    
    res.json(result.rows.map(row => ({
      model: row.model,
      provider: row.provider,
      usageCount: parseInt(row.usage_count),
      cost: parseFloat(row.total_cost),
      inputTokens: parseInt(row.total_input_tokens),
      outputTokens: parseInt(row.total_output_tokens)
    })));
  } catch (err) {
    console.error('Error fetching by-model:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get costs by task
app.get('/api/costs/by-task', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(task_label, '(unlabeled)') as task_label,
        COUNT(*) as session_count,
        SUM(cost_usd) as total_cost
      FROM llm_costs
      GROUP BY task_label
      ORDER BY total_cost DESC
      LIMIT 50
    `);
    
    res.json(result.rows.map(row => ({
      task: row.task_label,
      sessions: parseInt(row.session_count),
      cost: parseFloat(row.total_cost)
    })));
  } catch (err) {
    console.error('Error fetching by-task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get timeline data
app.get('/api/costs/timeline', requireAuth, async (req, res) => {
  const { period = 'day', limit = 30 } = req.query;
  
  const truncateFormat = period === 'hour' ? 'hour' : period === 'week' ? 'week' : 'day';
  
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC($1, timestamp) as period,
        SUM(cost_usd) as total_cost,
        COUNT(*) as session_count
      FROM llm_costs
      GROUP BY period
      ORDER BY period DESC
      LIMIT $2
    `, [truncateFormat, limit]);
    
    res.json(result.rows.map(row => ({
      period: row.period,
      cost: parseFloat(row.total_cost),
      sessions: parseInt(row.session_count)
    })).reverse());
  } catch (err) {
    console.error('Error fetching timeline:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Azure costs
app.get('/api/costs/azure', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        service_name,
        resource_group,
        SUM(cost_usd) as total_cost,
        MAX(timestamp) as last_updated
      FROM azure_costs
      GROUP BY service_name, resource_group
      ORDER BY total_cost DESC
    `);
    
    res.json(result.rows.map(row => ({
      service: row.service_name,
      resourceGroup: row.resource_group,
      cost: parseFloat(row.total_cost),
      lastUpdated: row.last_updated
    })));
  } catch (err) {
    console.error('Error fetching Azure costs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record LLM usage
app.post('/api/costs/llm', requireAuth, async (req, res) => {
  const { agentId, sessionKey, taskLabel, model, provider, inputTokens, outputTokens, metadata } = req.body;
  
  if (!agentId || !sessionKey || !model || !provider || inputTokens == null || outputTokens == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const cost = calculateCost(model, inputTokens, outputTokens);
  
  try {
    const result = await pool.query(`
      INSERT INTO llm_costs (agent_id, session_key, task_label, model, provider, input_tokens, output_tokens, cost_usd, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, timestamp, cost_usd
    `, [agentId, sessionKey, taskLabel, model, provider, inputTokens, outputTokens, cost, metadata ? JSON.stringify(metadata) : null]);
    
    res.json({
      id: result.rows[0].id,
      timestamp: result.rows[0].timestamp,
      cost: parseFloat(result.rows[0].cost_usd)
    });
  } catch (err) {
    console.error('Error recording LLM cost:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record Azure cost
app.post('/api/costs/azure', requireAuth, async (req, res) => {
  const { serviceName, resourceGroup, cost, currency, metadata } = req.body;
  
  if (!serviceName || cost == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO azure_costs (service_name, resource_group, cost_usd, currency, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, timestamp
    `, [serviceName, resourceGroup, cost, currency || 'USD', metadata ? JSON.stringify(metadata) : null]);
    
    res.json({
      id: result.rows[0].id,
      timestamp: result.rows[0].timestamp
    });
  } catch (err) {
    console.error('Error recording Azure cost:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get budget alerts
app.get('/api/budgets', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM budget_alerts ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create/update budget alert
app.post('/api/budgets', requireAuth, async (req, res) => {
  const { alertName, period, thresholdUsd, alertChannel, enabled } = req.body;
  
  if (!alertName || !period || thresholdUsd == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO budget_alerts (alert_name, period, threshold_usd, alert_channel, enabled)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (alert_name) 
      DO UPDATE SET period = $2, threshold_usd = $3, alert_channel = $4, enabled = $5
      RETURNING *
    `, [alertName, period, thresholdUsd, alertChannel, enabled !== false]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving budget:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Financial Dashboard API running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔑 Auth token: ${AUTH_TOKEN}`);
});
