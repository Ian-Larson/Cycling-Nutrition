import { useState } from 'react';
import { useStore } from '@/store';
import { Button, Card, CardContent, CardHeader } from '@/components/ui';
import { BottleCard } from '@/components/bottles/bottle-card';
import { BottleForm } from '@/components/bottles/bottle-form';
import { ProductCard } from '@/components/products/product-card';
import { ProductForm } from '@/components/products/product-form';
import type { Product } from '@/types';

export function InventoryPage() {
  const [showBottleForm, setShowBottleForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<Product['type'] | 'all'>('all');

  const bottles = useStore((s) => s.bottles);
  const addBottle = useStore((s) => s.addBottle);
  const updateBottle = useStore((s) => s.updateBottle);
  const deleteBottle = useStore((s) => s.deleteBottle);

  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const handleAddBottle = (data: { name: string; capacityMl: number }) => {
    addBottle({ ...data, isAvailable: true });
    setShowBottleForm(false);
  };

  const handleAddProduct = (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addProduct(data);
    setShowProductForm(false);
  };

  const handleEditProduct = (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setEditingProduct(null);
    }
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Bottles Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Bottles</h2>
          {!showBottleForm && (
            <Button size="sm" onClick={() => setShowBottleForm(true)}>
              Add Bottle
            </Button>
          )}
        </div>

        {showBottleForm && (
          <Card className="mb-4">
            <CardContent>
              <BottleForm
                onSubmit={handleAddBottle}
                onCancel={() => setShowBottleForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {bottles.length === 0 && !showBottleForm ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">No bottles added yet</p>
              <Button onClick={() => setShowBottleForm(true)}>
                Add Your First Bottle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bottles.map((bottle) => (
              <BottleCard
                key={bottle.id}
                bottle={bottle}
                onToggleAvailable={() =>
                  updateBottle(bottle.id, { isAvailable: !bottle.isAvailable })
                }
                onDelete={() => deleteBottle(bottle.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Products Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Nutrition Products</h2>
          {!showProductForm && !editingProduct && (
            <Button size="sm" onClick={() => setShowProductForm(true)}>
              Add Product
            </Button>
          )}
        </div>

        {showProductForm && (
          <Card className="mb-4">
            <CardHeader>
              <h3 className="font-semibold">New Product</h3>
            </CardHeader>
            <CardContent>
              <ProductForm
                onSubmit={handleAddProduct}
                onCancel={() => setShowProductForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {editingProduct && (
          <Card className="mb-4">
            <CardHeader>
              <h3 className="font-semibold">Edit Product</h3>
            </CardHeader>
            <CardContent>
              <ProductForm
                initialData={editingProduct}
                onSubmit={handleEditProduct}
                onCancel={() => setEditingProduct(null)}
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

        {products.length === 0 && !showProductForm ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">No products added yet</p>
              <Button onClick={() => setShowProductForm(true)}>
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
                onEdit={() => {
                  setShowProductForm(false);
                  setEditingProduct(product);
                }}
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
      </section>
    </div>
  );
}
