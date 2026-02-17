#!/usr/bin/env node
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Load env from repo root
dotenv.config({ path: path.join(repoRoot, '.env.local') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let mcpClient = null;
let isConnected = false;
let anthropic = null;

// Initialize MCP client
async function initMCP() {
  if (isConnected) return;
  
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/server.ts'],
    cwd: '/workspaces/wool-witch/mcp',
    env: process.env
  });

  mcpClient = new Client(
    {
      name: 'web-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await mcpClient.connect(transport);
  isConnected = true;
  console.log('✓ Connected to MCP server');
}

// Initialize Anthropic client
function initAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set - AI features will be limited');
    console.warn('   Add your API key to .env.local to enable Claude AI');
    return;
  }
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✓ Claude AI initialized');
}

// Convert MCP tools to Claude function format
async function getMCPToolsForClaude() {
  const toolsList = await mcpClient.listTools();
  return toolsList.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }));
}

// API endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!isConnected) {
      await initMCP();
    }

    if (!anthropic) {
      // Fallback to simple pattern matching if no API key
      return res.json({
        type: 'assistant',
        content: '⚠️ AI features require ANTHROPIC_API_KEY environment variable. Add it to .env.local to enable Claude AI.\n\nFor now, try these commands:\n- "show products"\n- "view cart"\n- "get categories"',
        toolResults: []
      });
    }

    // Get available MCP tools
    const tools = await getMCPToolsForClaude();

    // Build conversation history for Claude
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call Claude with function calling
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a helpful shopping assistant for Woolwitch, a handmade crochet goods store.

IMPORTANT STYLING RULES:
- Keep responses VERY brief (1-2 sentences maximum)
- The visual product cards will display all the details - don't repeat them
- Use natural, conversational language without emojis
- When showing products, just say something simple like "Here are our available products" or "I found these items for you"
- For cart operations, briefly confirm the action (e.g., "Added to cart" or "Here's your cart")
- Don't list out product details - the cards show everything

TECHNICAL NOTES:
- Prices from tools are in USD ($) - they're already correct, no conversion needed
- Use tools to get real data from the database
- Delivery is £3.50 for orders under £50`,
      messages,
      tools
    });

    let finalResponse = '';
    let toolResults = [];

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');
      
      if (!toolUse) break;

      console.log(`🔧 Claude calling tool: ${toolUse.name}`, toolUse.input);

      // Execute the MCP tool
      const result = await mcpClient.callTool({
        name: toolUse.name,
        arguments: toolUse.input
      });

      const content = result.content[0];
      
      // Extract adaptive card if present
      let adaptiveCard = null;
      if (content.text.includes('```json')) {
        const cardJson = content.text.split('```json\n')[1]?.split('\n```')[0];
        if (cardJson) {
          try {
            adaptiveCard = JSON.parse(cardJson);
          } catch (e) {
            console.error('Failed to parse adaptive card:', e);
          }
        }
      }

      toolResults.push({
        tool: toolUse.name,
        adaptiveCard
      });

      // Continue conversation with tool result
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: content.text
        }]
      });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a helpful shopping assistant for Woolwitch, a handmade crochet goods store.

IMPORTANT STYLING RULES:
- Keep responses VERY brief (1-2 sentences maximum)
- The visual product cards will display all the details - don't repeat them
- Use natural, conversational language without emojis
- When showing products, just say something simple like "Here are our available products" or "I found these items for you"
- For cart operations, briefly confirm the action (e.g., "Added to cart" or "Here's your cart")
- Don't list out product details - the cards show everything

TECHNICAL NOTES:
- Prices from tools are in USD ($) - they're already correct, no conversion needed
- Use tools to get real data from the database
- Delivery is £3.50 for orders under £50`,
        messages,
        tools
      });
    }

    // Extract final text response
    const textBlock = response.content.find(block => block.type === 'text');
    if (textBlock) {
      finalResponse = textBlock.text;
    }

    res.json({
      type: 'assistant',
      content: finalResponse,
      toolResults,
      conversationHistory: messages
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      type: 'assistant',
      content: `Sorry, I encountered an error: ${error.message}`,
      toolResults: []
    });
  }
});

app.get('/api/tools', async (req, res) => {
  try {
    if (!isConnected) {
      await initMCP();
    }
    const toolsList = await mcpClient.listTools();
    res.json(toolsList.tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3333;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🧶 Woolwitch MCP AI Chat running at:`);
  console.log(`   http://localhost:${PORT}`);
  await initMCP();
  initAnthropic();
  console.log(`\nOpen this URL in your browser to start chatting!\n`);
});
