import { useState } from 'react';
import { useStore } from '@/store';
import { Button, Card, CardContent } from '@/components/ui';
import { ProductCard } from '@/components/products/product-card';
import { ProductForm } from '@/components/products/product-form';
import type { Product } from '@/types';

export function ProductsPage() {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<Product['type'] | 'all'>('all');
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const handleAddProduct = (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addProduct(data);
    setShowForm(false);
  };

  const filteredProducts =
    filterType === 'all'
      ? products
      : products.filter((p) => p.type === filterType);

  const typeFilters: Array<{ value: Product['type'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'drink_mix', label: 'Drink Mix' },
    { value: 'gel', label: 'Gels' },
    { value: 'chews', label: 'Chews' },
    { value: 'bar', label: 'Bars' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nutrition Products</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add Product</Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <ProductForm
              onSubmit={handleAddProduct}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterType === filter.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 && !showForm ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No products added yet</p>
            <Button onClick={() => setShowForm(true)}>
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={() => deleteProduct(product.id)}
            />
          ))}
          {filteredProducts.length === 0 && products.length > 0 && (
            <p className="text-center text-gray-500 py-8">
              No products match this filter
            </p>
          )}
        </div>
      )}
    </div>
  );
}
