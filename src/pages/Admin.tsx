import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Upload, Package, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import type { Product, Order } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { getAllOrders, updateOrderStatus, getOrderStatistics, formatOrderStatus, getOrderStatusColor } from '../lib/orderService';
import { compressImage, formatFileSize } from '../lib/imageCompression';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  stock_quantity: string;
  delivery_charge: string;
  is_available: boolean;
}

export function Admin() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category: '',
    stock_quantity: '0',
    delivery_charge: '0',
    is_available: true,
  });

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'products') {
        fetchAllProducts();
      } else {
        fetchAllOrders();
        fetchOrderStatistics();
      }
    }
  }, [isAdmin, activeTab]);

  async function fetchAllProducts() {
    try {
      setLoading(true);
      // For admin, we need full product data
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data as any) || []);
      
      // Clear cache since admin might have updated data
      dataService.clearCache();
    } catch (error) {
      // Keep minimal error logging for debugging
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllOrders() {
    try {
      setLoading(true);
      const ordersData = await getAllOrders({ limit: 100 });
      setOrders(ordersData);
    } catch {
      console.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderStatistics() {
    try {
      const stats = await getOrderStatistics();
      setOrderStats(stats);
    } catch {
      console.error('Error loading order statistics');
    }
  }

  async function handleUpdateOrderStatus(orderId: string, newStatus: Order['status']) {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      // Refresh stats
      fetchOrderStatistics();
    } catch {
      console.error('Error updating order status');
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      image_url: product.image_url,
      category: product.category,
      stock_quantity: (product.stock_quantity ?? 0).toString(),
      delivery_charge: (product.delivery_charge ?? 0).toString(),
      is_available: product.is_available ?? false,
    });
    setImagePreview(product.image_url);
    setSelectedImage(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setSelectedImage(null);
    setImagePreview('');
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      category: '',
      stock_quantity: '0',
      delivery_charge: '0',
      is_available: true,
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
        return;
      }

      try {
        setCompressing(true);
        
        // Compress image if needed
        const originalSize = file.size;
        const compressedFile = await compressImage(file);
        
        if (compressedFile.size < originalSize) {
          console.log(`Image compressed from ${formatFileSize(originalSize)} to ${formatFileSize(compressedFile.size)}`);
        }

        setSelectedImage(compressedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        let userMessage = 'Failed to process image.';
        if (error instanceof Error) {
          const msg = error.message || '';
          if (/format|type|mime|decode/i.test(msg)) {
            userMessage = 'Image file is corrupted or in an unsupported format.';
          } else if (/size|large|memory|quota|too big|too large/i.test(msg)) {
            userMessage = 'Image is too large to compress effectively. Please choose a smaller image.';
          }
        }
        alert(`${userMessage} If the problem persists, please try another file.`);
      } finally {
        setCompressing(false);
      }
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Generate unique filename with extension validation
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('woolwitch-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('woolwitch-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      alert('Error uploading image. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate inputs
      if (!formData.name.trim()) {
        alert('Product name is required');
        return;
      }
      if (!formData.category.trim()) {
        alert('Product category is required');
        return;
      }
      if (!formData.description.trim()) {
        alert('Product description is required');
        return;
      }

      // Handle image upload
      let imageUrl = formData.image_url;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (!uploadedUrl) {
          return; // Upload failed, error already shown
        }
        imageUrl = uploadedUrl;
      }

      // Validate that we have an image
      if (!imageUrl.trim()) {
        alert('Product image is required');
        return;
      }

      const price = parseFloat(formData.price);
      const stockQuantity = parseInt(formData.stock_quantity);
      const deliveryCharge = parseFloat(formData.delivery_charge);

      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price (must be 0 or greater)');
        return;
      }
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        alert('Please enter a valid stock quantity (must be 0 or greater)');
        return;
      }
      if (isNaN(deliveryCharge) || deliveryCharge < 0) {
        alert('Please enter a valid delivery charge (must be 0 or greater)');
        return;
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        image_url: imageUrl.trim(),
        category: formData.category.trim(),
        stock_quantity: stockQuantity,
        delivery_charge: deliveryCharge,
        is_available: formData.is_available,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from('products')
          .update(productData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      await fetchAllProducts();
      handleCancel();
    } catch (error) {
      alert('Error saving product. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await (supabase as any)
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAllProducts();
    } catch (error) {
      alert('Error deleting product. Please try again.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex space-x-2 sm:space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-sm sm:text-base">Products</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm sm:text-base">Orders</span>
            </button>
          </div>
          
          {activeTab === 'products' && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center space-x-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Product</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'products' ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
              
              {/* Mobile: Show action buttons prominently when editing */}
              {(isAdding || editingId) && (
                <div className="flex space-x-3 sm:hidden">
                  <button
                    onClick={handleCancel}
                    disabled={uploading}
                    className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="flex items-center justify-center space-x-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{uploading ? 'Uploading...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

        {(isAdding || editingId) && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              {isAdding ? 'Add New Product' : 'Edit Product'}
            </h2>
            
            {/* Compact mobile form layout */}
            <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
              <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 space-y-4 sm:space-y-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2 sm:grid sm:grid-cols-3 sm:gap-4 space-y-4 sm:space-y-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.delivery_charge}
                    onChange={(e) => setFormData({ ...formData, delivery_charge: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose-500 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={compressing}
                    />
                    <Upload className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">
                      {compressing ? 'Compressing image...' : selectedImage ? selectedImage.name : 'Upload image (auto-compressed to 50KB)'}
                    </span>
                  </label>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-w-xs h-32 sm:h-48 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for purchase</span>
                </label>
              </div>
            </div>
            
            {/* Desktop action buttons */}
            <div className="hidden sm:flex sm:justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={uploading || compressing}
                className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || compressing}
                className="flex items-center justify-center space-x-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : compressing ? 'Compressing...' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : (
          <>
            {/* Mobile product cards */}
            <div className="block sm:hidden space-y-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-grow">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                          <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                          <p className="text-sm font-semibold text-gray-900">£{product.price.toFixed(2)}</p>
                        </div>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                            aria-label="Edit product"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete product"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Stock: {product.stock_quantity}</span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            product.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.stock_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-rose-600 hover:text-rose-900 p-1"
                            aria-label="Edit product"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            aria-label="Delete product"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>
            
            {/* Order Statistics */}
            {orderStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Total Orders</h3>
                  <p className="text-3xl font-bold text-rose-600">{orderStats.totalOrders}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Total Revenue</h3>
                  <p className="text-3xl font-bold text-green-600">
                    £{orderStats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Methods</h3>
                  <div className="space-y-1">
                    {Object.entries(orderStats.ordersByPaymentMethod).map(([method, count]) => (
                      <p key={method} className="text-sm text-gray-600">
                        {method}: {count as number}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Order Status</h3>
                  <div className="space-y-1">
                    {Object.entries(orderStats.ordersByStatus).map(([status, count]) => (
                      <p key={status} className="text-sm text-gray-600">
                        {formatOrderStatus(status as Order['status'])}: {count as number}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Orders Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.full_name}</div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          £{order.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {order.payment_method === 'paypal' ? 'PayPal' : 'Card'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getOrderStatusColor(order.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-rose-600 hover:text-rose-900 text-sm">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
