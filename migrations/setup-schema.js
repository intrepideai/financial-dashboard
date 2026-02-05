const { Pool } = require('pg');

// Database connection from environment or PASSWORDS.md
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_UhuR5m7PzwYC@ep-little-flower-af231d9g.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString });

const schema = `
-- LLM usage tracking
CREATE TABLE IF NOT EXISTS llm_costs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_id VARCHAR(100) NOT NULL,
  session_key VARCHAR(200) NOT NULL,
  task_label VARCHAR(200),
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  metadata JSONB
);

-- Azure infrastructure costs
CREATE TABLE IF NOT EXISTS azure_costs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  resource_group VARCHAR(100),
  cost_usd DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  metadata JSONB
);

-- Budget alerts configuration
CREATE TABLE IF NOT EXISTS budget_alerts (
  id SERIAL PRIMARY KEY,
  alert_name VARCHAR(100) NOT NULL,
  period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  threshold_usd DECIMAL(10, 2) NOT NULL,
  alert_channel VARCHAR(50),
  enabled BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_costs_timestamp ON llm_costs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_llm_costs_agent ON llm_costs(agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_costs_model ON llm_costs(model);
CREATE INDEX IF NOT EXISTS idx_azure_costs_timestamp ON azure_costs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_azure_costs_service ON azure_costs(service_name);
`;

async function setupSchema() {
  const client = await pool.connect();
  try {
    console.log('Creating database schema...');
    await client.query(schema);
    console.log('✅ Database schema created successfully');
  } catch (err) {
    console.error('❌ Error creating schema:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setupSchema().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
