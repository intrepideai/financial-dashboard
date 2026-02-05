const fetch = require('node-fetch');

const API_BASE = 'https://financial-dashboard.livelyglacier-b499ba1a.eastus2.azurecontainerapps.io/api';
const AUTH_TOKEN = 'justbecause';

// Sample data generator
async function seedData() {
  console.log('🌱 Seeding sample financial data...\n');
  
  const agents = ['main', 'ops', 'cron', 'subagent'];
  const models = [
    'anthropic/claude-opus-4-5',
    'anthropic/claude-sonnet-4-5',
    'anthropic/claude-3-5-haiku-latest'
  ];
  const tasks = [
    'Build financial dashboard',
    'Deploy to Azure',
    'Code review',
    'Database migration',
    'API integration',
    'Bug fix',
    'Feature development',
    'Documentation update',
    null  // unlabeled
  ];
  
  // Generate LLM cost data for the past 30 days
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  console.log('📊 Creating LLM usage records...');
  for (let day = 0; day < 30; day++) {
    const sessionsPerDay = Math.floor(Math.random() * 10) + 5;  // 5-15 sessions per day
    
    for (let session = 0; session < sessionsPerDay; session++) {
      const agentId = agents[Math.floor(Math.random() * agents.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const provider = model.split('/')[0];
      const taskLabel = tasks[Math.floor(Math.random() * tasks.length)];
      
      // Random token counts (realistic ranges)
      const inputTokens = Math.floor(Math.random() * 50000) + 5000;    // 5k-55k
      const outputTokens = Math.floor(Math.random() * 20000) + 1000;   // 1k-21k
      
      const sessionKey = `agent:${agentId}:session:${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      try {
        const response = await fetch(`${API_BASE}/costs/llm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': AUTH_TOKEN
          },
          body: JSON.stringify({
            agentId,
            sessionKey,
            taskLabel,
            model,
            provider,
            inputTokens,
            outputTokens,
            metadata: {
              seeded: true,
              day: 30 - day
            }
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`  ✓ Day ${30 - day}: ${agentId} - ${model} - $${result.cost.toFixed(4)}`);
        } else {
          console.error(`  ✗ Error: ${response.statusText}`);
        }
      } catch (err) {
        console.error(`  ✗ Error:`, err.message);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n💰 Creating Azure infrastructure costs...');
  const azureServices = [
    { name: 'Container Apps', group: 'MyOps', dailyCost: 15 },
    { name: 'Container Registry', group: 'MyOps', dailyCost: 5 },
    { name: 'PostgreSQL (Neon)', group: 'External', dailyCost: 8 },
    { name: 'Key Vault', group: 'MyOps', dailyCost: 2 },
    { name: 'Storage Account', group: 'MyOps', dailyCost: 3 }
  ];
  
  for (const service of azureServices) {
    try {
      const response = await fetch(`${API_BASE}/costs/azure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': AUTH_TOKEN
        },
        body: JSON.stringify({
          serviceName: service.name,
          resourceGroup: service.group,
          cost: service.dailyCost,
          currency: 'USD',
          metadata: {
            seeded: true
          }
        })
      });
      
      if (response.ok) {
        console.log(`  ✓ ${service.name} (${service.group}): $${service.dailyCost}/day`);
      }
    } catch (err) {
      console.error(`  ✗ Error for ${service.name}:`, err.message);
    }
  }
  
  console.log('\n✅ Sample data seeded successfully!');
  console.log(`\n🌐 View dashboard: ${API_BASE.replace('/api', '')}\n`);
}

seedData().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
