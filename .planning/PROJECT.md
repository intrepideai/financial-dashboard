# Financial Dashboard - Project Plan

## Overview
Build a comprehensive financial tracking dashboard to monitor LLM costs and Azure infrastructure spending across all OpenClaw agents and tasks.

## Goals
1. **Real-time cost visibility** - Track spending as it happens
2. **Multi-dimensional analysis** - Per-agent, per-task, per-model breakdowns
3. **Historical trends** - Charts showing cost evolution over time
4. **Azure integration** - Pull infrastructure costs from Azure Cost Management APIs
5. **Budget awareness** - Alert when approaching spending limits

## Architecture

### Tech Stack
- **Frontend:** React + TypeScript + Recharts (for visualizations)
- **Backend:** Node.js + Express + TypeScript
- **Database:** Neon PostgreSQL (serverless, existing connection)
- **Deployment:** Azure Container Apps
- **Cost APIs:** Azure Cost Management REST API
- **Registry:** Azure Container Registry (clyderegistry.azurecr.io)

### Data Sources
1. **OpenClaw sessions** - Extract token usage and model info from session history
2. **Azure Cost Management API** - Pull infrastructure costs (Container Apps, Storage, etc.)
3. **Manual cost tracking** - API costs from Anthropic, OpenAI, etc.

### Database Schema
```sql
-- LLM usage tracking
CREATE TABLE llm_costs (
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
CREATE TABLE azure_costs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  resource_group VARCHAR(100),
  cost_usd DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  metadata JSONB
);

-- Budget alerts configuration
CREATE TABLE budget_alerts (
  id SERIAL PRIMARY KEY,
  alert_name VARCHAR(100) NOT NULL,
  period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  threshold_usd DECIMAL(10, 2) NOT NULL,
  alert_channel VARCHAR(50),
  enabled BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_llm_costs_timestamp ON llm_costs(timestamp DESC);
CREATE INDEX idx_llm_costs_agent ON llm_costs(agent_id);
CREATE INDEX idx_llm_costs_model ON llm_costs(model);
CREATE INDEX idx_azure_costs_timestamp ON azure_costs(timestamp DESC);
CREATE INDEX idx_azure_costs_service ON azure_costs(service_name);
```

### API Endpoints
- `GET /api/costs/summary` - Total costs (today, week, month, all-time)
- `GET /api/costs/by-agent` - Breakdown by agent
- `GET /api/costs/by-model` - Breakdown by LLM model
- `GET /api/costs/by-task` - Breakdown by task label
- `GET /api/costs/timeline` - Time series data for charts
- `GET /api/costs/azure` - Azure infrastructure costs
- `POST /api/costs/llm` - Record LLM usage
- `GET /api/budgets` - Get budget alerts config
- `POST /api/budgets` - Create/update budget alert

### Frontend Components
1. **Dashboard Overview** - Top-level metrics and charts
2. **Agent View** - Per-agent cost breakdown
3. **Model View** - Per-model cost breakdown
4. **Task View** - Per-task cost breakdown
5. **Timeline Charts** - Cost trends over time
6. **Azure Costs** - Infrastructure spending

## Implementation Phases

### Phase 1: Database & Backend (Current)
- [x] Create project structure
- [ ] Set up database schema
- [ ] Build Express API server
- [ ] Implement cost tracking endpoints
- [ ] Azure Cost Management API integration
- [ ] Cost calculation logic (token → USD conversion)

### Phase 2: Data Collection
- [ ] OpenClaw session parser (extract token usage from sessions)
- [ ] Scheduled job to sync Azure costs daily
- [ ] Rate tables for LLM models (pricing per 1M tokens)

### Phase 3: Frontend
- [ ] React app skeleton
- [ ] Dashboard overview page
- [ ] Time series charts (Recharts)
- [ ] Agent/Model/Task breakdown views
- [ ] Budget alert configuration UI

### Phase 4: Deployment
- [ ] Dockerfile for production build
- [ ] Push to Azure Container Registry
- [ ] Deploy to Azure Container Apps
- [ ] Environment variable configuration
- [ ] Test production deployment

### Phase 5: Integration & Automation
- [ ] Hook into OpenClaw agent loop (auto-track costs)
- [ ] Budget alert notifications via iMessage/Telegram
- [ ] Daily cost summary reports

## Success Criteria
- [x] Project structure created
- [ ] Database deployed and schema created
- [ ] API endpoints functional
- [ ] Azure Cost Management API connected
- [ ] Dashboard accessible via HTTPS
- [ ] Charts displaying real cost data
- [ ] LLM costs tracked automatically
- [ ] Budget alerts working

## Notes
- Follow task-manager deployment pattern (proven architecture)
- Use Neon PostgreSQL from PASSWORDS.md
- Deploy to Azure Container Apps in MyOps resource group
- Auth: x-auth-token header (keep simple for now)
