import { useEffect, useState, useCallback } from 'react';
import { ProductCard } from '../components/ProductCard';
import { dataService } from '../lib/dataService';
import type { Product } from '../types/database';
import { Sparkles, Search, X } from 'lucide-react';

export function Shop() {
  // Use Product interface from database types, but in practice we'll get optimized subset
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categories, setCategories] = useState<string[]>(['All']);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productList = await dataService.getProductList({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: 50
      });
      
      // Cast to Product[] for component compatibility (fields are subset but sufficient)
      setProducts(productList as Product[]);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]); // Ensure products array is cleared on error
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  async function fetchCategories() {
    try {
      const categoryList = await dataService.getCategories();
      setCategories(['All', ...categoryList]);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search input when pressing '/' (like GitHub)
      if (event.key === '/' && event.target !== document.querySelector('input[type="text"]')) {
        event.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // Clear search when pressing Escape
      if (event.key === 'Escape' && searchTerm) {
        clearSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);
  
  // Filter products based on both category and search term (now handled server-side)
  const filteredProducts = products;

  const clearSearch = () => {
    setSearchTerm('');
    // Refocus on search input after clearing
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100 to-pink-100 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-rose-500 mr-2" />
            <h2 className="text-5xl md:text-6xl font-serif font-bold text-gray-900">
              Handcrafted Treasures
            </h2>
            <Sparkles className="w-8 h-8 text-rose-500 ml-2" />
          </div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Discover unique crochet creations and homemade goods, each piece lovingly crafted with care and attention to detail.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products... (Press / to focus)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found for "{searchTerm}"
            </p>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-rose-50 shadow-md'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md h-96 animate-pulse"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">
              {searchTerm ? `No products found for "${searchTerm}".` : 'No products available at the moment.'}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
