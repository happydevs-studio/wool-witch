#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as readline from 'readline';

async function main() {
  console.log('🧶 Starting Wool Witch MCP Test Client...\n');

  // Start the MCP server using StdioClientTransport
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/server.ts'],
    cwd: '/workspaces/wool-witch/mcp',
    env: process.env
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
  console.log('✓ Connected to MCP server\n');

  // List available tools
  const toolsList = await client.listTools();
  console.log('📋 Available tools:');
  toolsList.tools.forEach((tool, i) => {
    console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
  });
  console.log('');

  // Interactive menu
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

  let running = true;
  while (running) {
    console.log('\n🎯 Quick Actions:');
    console.log('  1. List products');
    console.log('  2. Get categories');
    console.log('  3. View cart');
    console.log('  4. Add product to cart');
    console.log('  5. Clear cart');
    console.log('  6. Custom tool call');
    console.log('  0. Exit');
    
    const choice = await askQuestion('\nEnter your choice: ');

    try {
      switch (choice.trim()) {
        case '1': {
          console.log('\n--- Listing Products ---');
          const result = await client.callTool({
            name: 'list_products',
            arguments: { limit: 5 }
          });
          console.log(result.content[0].text);
          break;
        }
        case '2': {
          console.log('\n--- Categories ---');
          const result = await client.callTool({
            name: 'get_categories',
            arguments: {}
          });
          console.log(result.content[0].text);
          break;
        }
        case '3': {
          console.log('\n--- Current Cart ---');
          const result = await client.callTool({
            name: 'view_cart',
            arguments: {}
          });
          console.log(result.content[0].text);
          break;
        }
        case '4': {
          const productId = await askQuestion('Enter product ID: ');
          const quantity = await askQuestion('Enter quantity: ');
          console.log('\n--- Adding to Cart ---');
          const result = await client.callTool({
            name: 'add_to_cart',
            arguments: { 
              product_id: productId.trim(),
              quantity: parseInt(quantity.trim()) || 1
            }
          });
          console.log(result.content[0].text);
          break;
        }
        case '5': {
          console.log('\n--- Clearing Cart ---');
          const result = await client.callTool({
            name: 'clear_cart',
            arguments: {}
          });
          console.log(result.content[0].text);
          break;
        }
        case '6': {
          const toolName = await askQuestion('Enter tool name: ');
          const argsInput = await askQuestion('Enter arguments as JSON (or {} for none): ');
          let args = {};
          try {
            args = JSON.parse(argsInput.trim() || '{}');
          } catch (e) {
            console.log('Invalid JSON, using empty object {}');
          }
          console.log(`\n--- Calling ${toolName} ---`);
          const result = await client.callTool({
            name: toolName.trim(),
            arguments: args
          });
          console.log(result.content[0].text);
          break;
        }
        case '0': {
          running = false;
          break;
        }
        default: {
          console.log('Invalid choice, please try again.');
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  rl.close();
  await client.close();
  console.log('\n✓ Goodbye!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
