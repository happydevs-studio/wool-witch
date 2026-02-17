#!/usr/bin/env node
import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const serverProcess = spawn('node', ['--loader', 'tsx', 'src/server.ts'], {
    cwd: '/workspaces/wool-witch/mcp',
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const transport = new StdioClientTransport({
    command: serverProcess.stdin,
    response: serverProcess.stdout
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);

  console.log('✓ Connected to MCP server');

  // List available tools
  const toolsList = await client.listTools();
  console.log('\nAvailable tools:');
  toolsList.tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  // Example: List products
  console.log('\n--- Testing list_products ---');
  const productsResult = await client.callTool({
    name: 'list_products',
    arguments: { limit: 3 }
  });
  console.log(productsResult.content[0].text);

  // Example: Get categories
  console.log('\n--- Testing get_categories ---');
  const categoriesResult = await client.callTool({
    name: 'get_categories',
    arguments: {}
  });
  console.log(categoriesResult.content[0].text);

  // Example: View cart
  console.log('\n--- Testing view_cart ---');
  const cartResult = await client.callTool({
    name: 'view_cart',
    arguments: {}
  });
  console.log(cartResult.content[0].text);

  await client.close();
  serverProcess.kill();
  console.log('\n✓ Test complete');
}

main().catch(console.error);
