import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Product } from '../../src/types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

// Load env from repo root for Supabase client configuration.
dotenv.config({ path: path.join(repoRoot, '.env.local') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const apiService = await import('../../src/lib/apiService.ts');
const orderService = await import('../../src/lib/orderService.ts');

const { getProducts, getProductById, getCategories } = apiService;
const {
  calculateSubtotal,
  calculateDeliveryTotal,
  calculateTotal
} = orderService;

type CartItem = {
  product: Product;
  quantity: number;
};

const cart = new Map<string, CartItem>();

const server = new Server(
  {
    name: 'wool-witch-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const buildProductSummary = (product: Product): string => {
  const price = product.price_max ? `$${product.price}-$${product.price_max}` : `$${product.price}`;
  const availability = product.is_available ? 'in stock' : 'unavailable';
  return `${product.name} | ${price} | ${product.category} | ${availability} | id: ${product.id}`;
};

const renderProductCard = (product: Product): { markdown: string; card: Record<string, unknown> } => {
  const price = product.price_max ? `$${product.price}-$${product.price_max}` : `$${product.price}`;
  const availability = product.is_available ? 'In stock' : 'Unavailable';
  const markdown = [
    `### ${product.name}`,
    `- Price: ${price}`,
    `- Category: ${product.category}`,
    `- Availability: ${availability}`,
    `- Product ID: ${product.id}`,
    product.description ? `- ${product.description}` : null,
    product.image_url ? `![${product.name}](${product.image_url})` : null,
    `Add to cart: add_to_cart { "product_id": "${product.id}", "quantity": 1 }`
  ]
    .filter(Boolean)
    .join('\n');

  const card = {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: product.name,
        size: 'Large',
        weight: 'Bolder'
      },
      {
        type: 'TextBlock',
        text: `${price} | ${product.category}`,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: availability,
        wrap: true,
        isSubtle: true
      },
      ...(product.image_url
        ? [{ type: 'Image', url: product.image_url, size: 'Medium' }]
        : []),
      ...(product.description
        ? [{ type: 'TextBlock', text: product.description, wrap: true }]
        : []),
      {
        type: 'TextBlock',
        text: `Product ID: ${product.id}`,
        isSubtle: true,
        spacing: 'Small'
      }
    ]
  };

  return { markdown, card };
};

const renderProductList = (products: Product[], heading: string) => {
  const lines = products.map((product) => `- ${buildProductSummary(product)}`);
  const markdown = [`## ${heading}`, ...lines].join('\n');

  const card = {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: heading,
        size: 'Medium',
        weight: 'Bolder'
      },
      ...products.map((product) => ({
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: product.name,
            weight: 'Bolder',
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `${product.category} | $${product.price}`,
            wrap: true,
            isSubtle: true
          },
          {
            type: 'TextBlock',
            text: `ID: ${product.id}`,
            isSubtle: true,
            spacing: 'Small'
          }
        ],
        spacing: 'Medium'
      }))
    ]
  };

  return { markdown, card };
};

const renderCart = (items: CartItem[]) => {
  if (items.length === 0) {
    return {
      markdown: '## Cart\nCart is empty.',
      card: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [{ type: 'TextBlock', text: 'Cart is empty.', weight: 'Bolder' }]
      }
    };
  }

  const subtotal = calculateSubtotal(items);
  const deliveryTotal = calculateDeliveryTotal(items);
  const total = calculateTotal(items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const lines = items.map((item) => {
    const price = item.product.price_max
      ? `$${item.product.price}-$${item.product.price_max}`
      : `$${item.product.price}`;
    return `- ${item.product.name} x${item.quantity} | ${price} | id: ${item.product.id}`;
  });

  const markdown = [
    '## Cart',
    ...lines,
    `Subtotal: $${subtotal.toFixed(2)}`,
    `Delivery: $${deliveryTotal.toFixed(2)}`,
    `Total: $${total.toFixed(2)} (${itemCount} items)`
  ].join('\n');

  const card = {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      { type: 'TextBlock', text: 'Cart', size: 'Medium', weight: 'Bolder' },
      ...items.map((item) => ({
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: `${item.product.name} x${item.quantity}`,
            weight: 'Bolder',
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `$${item.product.price} | ${item.product.category}`,
            isSubtle: true,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `ID: ${item.product.id}`,
            isSubtle: true,
            spacing: 'Small'
          }
        ],
        spacing: 'Medium'
      })),
      {
        type: 'TextBlock',
        text: `Subtotal: $${subtotal.toFixed(2)}`,
        spacing: 'Large'
      },
      {
        type: 'TextBlock',
        text: `Delivery: $${deliveryTotal.toFixed(2)}`,
        spacing: 'None'
      },
      {
        type: 'TextBlock',
        text: `Total: $${total.toFixed(2)} (${itemCount} items)`,
        weight: 'Bolder',
        spacing: 'None'
      }
    ]
  };

  return { markdown, card };
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_products',
        description: 'List products with optional category, search, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            search: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      },
      {
        name: 'get_product',
        description: 'Get full product details by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string' }
          },
          required: ['product_id']
        }
      },
      {
        name: 'get_categories',
        description: 'List available product categories.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'add_to_cart',
        description: 'Add a product to the in-chat cart.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            quantity: { type: 'number' }
          },
          required: ['product_id', 'quantity']
        }
      },
      {
        name: 'update_cart_quantity',
        description: 'Update a product quantity in the in-chat cart.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            quantity: { type: 'number' }
          },
          required: ['product_id', 'quantity']
        }
      },
      {
        name: 'remove_from_cart',
        description: 'Remove a product from the in-chat cart.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string' }
          },
          required: ['product_id']
        }
      },
      {
        name: 'view_cart',
        description: 'View cart contents and totals.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'clear_cart',
        description: 'Clear the in-chat cart.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_products': {
        const products = await getProducts({
          category: typeof args?.category === 'string' ? args.category : undefined,
          search: typeof args?.search === 'string' ? args.search : undefined,
          limit: typeof args?.limit === 'number' ? args.limit : undefined,
          offset: typeof args?.offset === 'number' ? args.offset : undefined
        });

        const { markdown, card } = renderProductList(products, 'Product Catalog');

        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'get_product': {
        const productId = String(args?.product_id ?? '');
        const product = await getProductById(productId);

        if (!product) {
          return {
            content: [{ type: 'text', text: `No product found for id ${productId}.` }]
          };
        }

        const { markdown, card } = renderProductCard(product);
        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'get_categories': {
        const categories = await getCategories();
        const markdown = ['## Categories', ...categories.map((c) => `- ${c}`)].join('\n');
        const card = {
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            { type: 'TextBlock', text: 'Categories', size: 'Medium', weight: 'Bolder' },
            ...categories.map((category) => ({
              type: 'TextBlock',
              text: category,
              wrap: true
            }))
          ]
        };

        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'add_to_cart': {
        const productId = String(args?.product_id ?? '');
        const quantity = Number(args?.quantity ?? 0);
        if (!productId || quantity <= 0) {
          return {
            content: [{ type: 'text', text: 'Provide a valid product_id and quantity.' }]
          };
        }

        const product = await getProductById(productId);
        if (!product) {
          return {
            content: [{ type: 'text', text: `No product found for id ${productId}.` }]
          };
        }

        const existing = cart.get(productId);
        if (existing) {
          existing.quantity += quantity;
          cart.set(productId, existing);
        } else {
          cart.set(productId, { product, quantity });
        }

        const { markdown, card } = renderCart(Array.from(cart.values()));
        return {
          content: [
            {
              type: 'text',
              text: `Added ${quantity} to cart.\n\n${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'update_cart_quantity': {
        const productId = String(args?.product_id ?? '');
        const quantity = Number(args?.quantity ?? 0);
        if (!productId || quantity < 0) {
          return {
            content: [{ type: 'text', text: 'Provide a valid product_id and quantity.' }]
          };
        }

        if (quantity === 0) {
          cart.delete(productId);
        } else if (cart.has(productId)) {
          const existing = cart.get(productId);
          if (existing) {
            existing.quantity = quantity;
            cart.set(productId, existing);
          }
        } else {
          const product = await getProductById(productId);
          if (!product) {
            return {
              content: [{ type: 'text', text: `No product found for id ${productId}.` }]
            };
          }
          cart.set(productId, { product, quantity });
        }

        const { markdown, card } = renderCart(Array.from(cart.values()));
        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'remove_from_cart': {
        const productId = String(args?.product_id ?? '');
        cart.delete(productId);
        const { markdown, card } = renderCart(Array.from(cart.values()));
        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'view_cart': {
        const { markdown, card } = renderCart(Array.from(cart.values()));
        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      case 'clear_cart': {
        cart.clear();
        const { markdown, card } = renderCart([]);
        return {
          content: [
            {
              type: 'text',
              text: `${markdown}\n\nAdaptive Card:\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\``
            }
          ]
        };
      }
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }]
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return {
      content: [{ type: 'text', text: `Tool failed: ${message}` }]
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
