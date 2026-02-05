# 💰 Financial Dashboard

Comprehensive cost tracking dashboard for OpenClaw LLM usage and Azure infrastructure costs.

## Features

### 📊 Interactive Visualizations
- **Cost Timeline**: Daily/weekly views with interactive line charts
- **Per-Agent Breakdown**: Horizontal bar chart showing cost by agent (top 10)
- **Model Distribution**: Doughnut chart of costs by LLM model
- **Source Comparison**: Pie chart comparing LLM vs Azure costs
- **Task Analytics**: Sortable table of top 20 tasks by cost
- **Azure Services**: Breakdown of Azure infrastructure costs

### 🎯 Summary Cards
- Total spent (all-time)
- Today's costs (LLM + Azure)
- This week's costs
- This month's costs
- LLM total with percentage
- Azure total with percentage

### ⚡ Real-Time Updates
- Auto-refresh every 5 minutes
- Manual refresh button
- Last updated timestamp

## Architecture

```
financial-dashboard/
├── server.js           # Express API server
├── package.json        # Dependencies
├── Dockerfile          # Container configuration
├── migrations/         # Database schema
│   └── setup-schema.js
└── public/             # Frontend
    └── index.html      # Single-page dashboard (vanilla JS + Chart.js)
```

## API Endpoints

### Summary
- `GET /api/costs/summary` - Overall cost statistics (today, week, month, total)

### Breakdowns
- `GET /api/costs/by-agent` - Cost grouped by agent ID
- `GET /api/costs/by-model` - Cost grouped by LLM model
- `GET /api/costs/by-task` - Cost grouped by task label
- `GET /api/costs/timeline?period=day&limit=30` - Time-series cost data

### Azure
- `GET /api/costs/azure` - Azure service costs

### Recording
- `POST /api/costs/llm` - Record LLM usage
- `POST /api/costs/azure` - Record Azure cost

### Budgets
- `GET /api/budgets` - List budget alerts
- `POST /api/budgets` - Create/update budget alert

### Health
- `GET /api/health` - Health check endpoint

## Database Schema

### `llm_costs`
Tracks LLM API calls and costs.
- `agent_id`: Agent identifier (main, subagent, cron, etc.)
- `session_key`: Unique session identifier
- `task_label`: Optional task description
- `model`: LLM model name
- `provider`: API provider (anthropic, openai)
- `input_tokens`, `output_tokens`: Token usage
- `cost_usd`: Calculated cost in USD
- `metadata`: Additional JSON data

### `azure_costs`
Tracks Azure infrastructure costs.
- `service_name`: Azure service (Container Apps, Storage, etc.)
- `resource_group`: Azure resource group
- `cost_usd`: Cost in USD
- `metadata`: Additional JSON data

### `budget_alerts`
Budget alert configuration.
- `alert_name`: Alert identifier
- `period`: daily, weekly, monthly
- `threshold_usd`: Alert threshold
- `alert_channel`: Delivery channel
- `enabled`: Active status

## Setup & Deployment

### Local Development

1. **Install dependencies:**
   ```bash
   cd financial-dashboard
   npm install
   ```

2. **Set up database:**
   ```bash
   npm run migrate
   ```

3. **Start server:**
   ```bash
   npm start
   # Dashboard: http://localhost:3000
   ```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `AUTH_TOKEN`: API authentication token (default: "justbecause")
- `DATABASE_URL`: PostgreSQL connection string (default: Neon DB from code)

### Deploy to Azure Container Apps

1. **Build container:**
   ```bash
   docker build -t financial-dashboard .
   ```

2. **Push to Azure Container Registry:**
   ```bash
   az acr login --name myopscontainers
   docker tag financial-dashboard myopscontainers.azurecr.io/financial-dashboard:latest
   docker push myopscontainers.azurecr.io/financial-dashboard:latest
   ```

3. **Deploy to Container Apps:**
   ```bash
   az containerapp create \
     --name financial-dashboard \
     --resource-group MyOps \
     --image myopscontainers.azurecr.io/financial-dashboard:latest \
     --target-port 3000 \
     --ingress external \
     --registry-server myopscontainers.azurecr.io \
     --env-vars DATABASE_URL=<connection-string> AUTH_TOKEN=justbecause
   ```

## Integration with OpenClaw

To integrate cost tracking into OpenClaw sessions:

```javascript
// Record LLM usage after each API call
await fetch('http://localhost:3000/api/costs/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': 'justbecause'
  },
  body: JSON.stringify({
    agentId: 'main',
    sessionKey: session.key,
    taskLabel: session.label,
    model: 'anthropic/claude-sonnet-4-5',
    provider: 'anthropic',
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    metadata: { /* optional */ }
  })
});
```

## LLM Pricing

Current pricing table (per 1M tokens):

| Model | Input | Output |
|-------|-------|--------|
| claude-opus-4-5 | $15.00 | $75.00 |
| claude-sonnet-4-5 | $3.00 | $15.00 |
| claude-3-5-haiku-latest | $1.00 | $5.00 |
| gpt-4 | $30.00 | $60.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |

Pricing is embedded in `server.js` and can be updated as providers change rates.

## Security

- All API endpoints (except `/api/health`) require `x-auth-token` header
- Token is configurable via `AUTH_TOKEN` environment variable
- Database connection uses SSL (Neon PostgreSQL)
- Frontend is served as static files (no server-side rendering)

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon)
- **Frontend**: Vanilla JavaScript + Chart.js 4.4.1
- **Deployment**: Docker + Azure Container Apps
- **Charts**: Chart.js with Luxon time adapter

## Future Enhancements

- [ ] Budget alert notifications (iMessage/Telegram integration)
- [ ] Cost projection models (predict monthly spend)
- [ ] Export to CSV/Excel
- [ ] Custom date range filters
- [ ] Model comparison tool (cost per quality)
- [ ] Azure Cost Management API integration (automated Azure cost ingestion)
- [ ] Per-project cost allocation
- [ ] Cost optimization recommendations

## License

Internal use - Intrepide AI / OpenClaw

---

**Dashboard created:** 2026-02-05  
**Status:** ✅ Production Ready
