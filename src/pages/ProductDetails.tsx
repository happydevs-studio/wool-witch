import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Package, Truck, Check, AlertCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useCart } from '../contexts/CartContext';
import { OptimizedImage } from '../components/OptimizedImage';
import type { Product } from '../types/database';

interface ProductDetailsProps {
  productId: string;
  onBack: () => void;
}

export function ProductDetails({ productId, onBack }: ProductDetailsProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  async function fetchProductDetails() {
    try {
      setLoading(true);
      setError(null);
      const productData = await dataService.getProductDetails(productId);
      
      if (!productData) {
        setError('Product not found');
      } else {
        setProduct(productData);
      }
    } catch (err) {
      console.error('Failed to fetch product details:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const incrementQuantity = () => {
    if (product?.stock_quantity != null && quantity >= product.stock_quantity) {
      return;
    }
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-8 w-24 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-gray-200 rounded-xl"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={onBack}
            className="flex items-center text-rose-600 hover:text-rose-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Shop</span>
          </button>
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">{error || 'Product not found'}</p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
            >
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity != null && product.stock_quantity === 0;
  const isLowStock = product.stock_quantity != null && product.stock_quantity < 5 && product.stock_quantity > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center text-rose-600 hover:text-rose-700 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Shop</span>
        </button>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="sticky top-8">
              <div className="relative aspect-square overflow-hidden bg-white rounded-xl shadow-lg">
                <OptimizedImage
                  src={product.image_url}
                  alt={product.name}
                  className="hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {isLowStock && (
                  <div className="absolute top-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Only {product.stock_quantity} left!
                  </div>
                )}
                {isOutOfStock && (
                  <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Sold Out
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div>
              <span className="inline-block px-4 py-2 bg-rose-100 text-rose-700 text-sm font-semibold rounded-full">
                {product.category}
              </span>
            </div>

            {/* Product Name */}
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900">
                £{product.price.toFixed(2)}
              </span>
              {product.delivery_charge != null && product.delivery_charge > 0 && (
                <span className="text-lg text-gray-600">
                  + £{product.delivery_charge.toFixed(2)} delivery
                </span>
              )}
            </div>

            {/* Stock Status */}
            {!isOutOfStock && (
              <div className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-lg w-fit">
                <Check className="w-5 h-5 mr-2" />
                <span className="font-medium">In Stock</span>
              </div>
            )}

            {/* Description */}
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center text-2xl font-semibold hover:border-rose-600 hover:text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-900"
                  >
                    −
                  </button>
                  <span className="text-2xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    disabled={product.stock_quantity != null && quantity >= product.stock_quantity}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center text-2xl font-semibold hover:border-rose-600 hover:text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-900"
                  >
                    +
                  </button>
                  {product.stock_quantity != null && (
                    <span className="text-sm text-gray-600 ml-2">
                      {product.stock_quantity} available
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Add to Bag Button */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full flex items-center justify-center space-x-3 px-8 py-4 rounded-xl transition-all font-semibold text-lg shadow-lg ${
                isAdded
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white hover:shadow-xl'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              <span>{isAdded ? 'Added to Bag!' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
            </button>

            {/* Product Features */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-start gap-4">
                <Package className="w-6 h-6 text-rose-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Handcrafted Quality</h3>
                  <p className="text-gray-600 text-sm">
                    Each piece is lovingly handmade with attention to detail and care.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Truck className="w-6 h-6 text-rose-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Delivery Information</h3>
                  <p className="text-gray-600 text-sm">
                    {product.delivery_charge != null && product.delivery_charge > 0
                      ? `Delivery charge: £${product.delivery_charge.toFixed(2)}`
                      : 'Free delivery on this item'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
