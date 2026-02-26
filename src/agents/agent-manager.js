const { spawn } = require('child_process');
const path = require('path');

class AgentManager {
  constructor() {
    this.agents = new Map();
    this.maxConcurrent = 4;
  }

  spawnAgent(agentType, taskId, params) {
    if (this.agents.size >= this.maxConcurrent) {
      console.log(`⏳ Queueing task ${taskId} - max agents reached`);
      return null;
    }

    const agentPath = path.join(__dirname, `${agentType}-agent.js`);
    const agent = spawn('node', [agentPath, JSON.stringify(params)]);

    const agentData = {
      type: agentType,
      taskId,
      process: agent,
      startTime: Date.now(),
      output: [],
      errors: []
    };

    agent.stdout.on('data', (data) => {
      const msg = data.toString();
      agentData.output.push(msg);
      console.log(`[${agentType}:${taskId}] ${msg.trim()}`);
    });

    agent.stderr.on('data', (data) => {
      const msg = data.toString();
      agentData.errors.push(msg);
      console.error(`[${agentType}:${taskId}] ERROR: ${msg.trim()}`);
    });

    agent.on('close', (code) => {
      console.log(`[${agentType}:${taskId}] Completed with code ${code}`);
      this.agents.delete(taskId);
    });

    this.agents.set(taskId, agentData);
    console.log(`🚀 Spawned ${agentType} agent for task ${taskId}`);
    return agentData;
  }

  getActiveAgents() {
    return Array.from(this.agents.entries()).map(([id, data]) => ({
      id,
      type: data.type,
      uptime: Date.now() - data.startTime,
      outputCount: data.output.length
    }));
  }

  shutdown() {
    console.log('🛑 Shutting down all agents...');
    for (const [id, data] of this.agents) {
      data.process.kill();
    }
    this.agents.clear();
  }
}

module.exports = new AgentManager();
