exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  // Only handle GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse query parameters
    const action = event.queryStringParameters?.action || 'health';

    if (action === 'health') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          status: 'ok',
          timestamp: new Date().toISOString(),
          message: 'Cache function is running! Environment will be configured next.'
        })
      };
    }

    // For now, return mock data for products/categories
    const mockData = {
      products: [
        { id: '1', name: 'Sample Crochet Hat', price: 25.00, category: 'Hats', image_url: '/sample.jpg' },
        { id: '2', name: 'Cozy Scarf', price: 35.00, category: 'Scarves', image_url: '/sample.jpg' }
      ],
      categories: ['Hats', 'Scarves', 'Blankets', 'Bags']
    };

    const responseData = action === 'categories' ? mockData.categories : mockData.products;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({
        success: true,
        data: responseData,
        cached: Date.now(),
        message: 'Mock data - Supabase integration ready for environment variables'
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};