import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import type { Product } from '../types/database';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {product.stock_quantity < 5 && product.stock_quantity > 0 && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Only {product.stock_quantity} left
          </div>
        )}
        {product.stock_quantity === 0 && (
          <div className="absolute top-3 right-3 bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Sold Out
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2">
          <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-full">
            {product.category}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {product.name}
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              £{product.price.toFixed(2)}
            </span>
            {product.delivery_charge > 0 && (
              <p className="text-xs text-gray-500">
                + £{product.delivery_charge.toFixed(2)} delivery
              </p>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock_quantity === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all font-medium ${
              isAdded
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isAdded ? 'Added!' : 'Add to Bag'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
