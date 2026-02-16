# Wool Witch MCP

Lightweight MCP server that exposes Wool Witch product browsing tools and a chat-friendly cart.

## Setup

```bash
cd mcp
npm install
```

## Run

```bash
npm run dev
```

The server uses Supabase credentials from the repo root `.env.local` or `.env` file.

## Tools

- list_products
- get_product
- get_categories
- add_to_cart
- update_cart_quantity
- remove_from_cart
- view_cart
- clear_cart

Each tool response includes markdown plus an Adaptive Card JSON payload for chat UI rendering.
