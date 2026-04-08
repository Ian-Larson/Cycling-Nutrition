import { useState } from 'react';
import { useStore } from '@/store';
import { Button, Card, CardContent, CardHeader } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { BottleCard } from '@/components/bottles/bottle-card';
import { BottleForm } from '@/components/bottles/bottle-form';
import { ProductCard } from '@/components/products/product-card';
import { ProductForm } from '@/components/products/product-form';
import type { Product } from '@/types';

const QUICK_BOTTLE_TEMPLATES: Array<{ name: string; capacityMl: number }> = [
  { name: '550ml Small', capacityMl: 550 },
  { name: '750ml Standard', capacityMl: 750 },
  { name: '950ml Large', capacityMl: 950 },
];

const QUICK_PRODUCT_TEMPLATES: Array<
  Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
> = [
  {
    name: 'Maurten 320',
    brand: 'Maurten',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 80, calories: 320 },
    serving: { servingSizeGrams: 80, servingSizeMl: 500, scoopSizeGrams: 40 },
  },
  {
    name: 'PF 30 Gel',
    brand: 'Precision Fuel & Hydration',
    type: 'gel',
    isAvailable: true,
    nutrition: { carbsGrams: 30, calories: 120 },
    serving: {},
  },
  {
    name: 'Clif Bloks',
    brand: 'Clif',
    type: 'chews',
    isAvailable: true,
    nutrition: { carbsGrams: 24, calories: 100 },
    serving: {},
  },
];

export function InventoryPage() {
  const [showBottleForm, setShowBottleForm] = useState(false);
  const [editingBottleId, setEditingBottleId] = useState<string | null>(null);
  const [bottleSortDirection, setBottleSortDirection] = useState<'asc' | 'desc'>(
    'asc'
  );
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<Product['type'] | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');

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
    setEditingBottleId(null);
  };

  const handleEditBottle = (
    bottleId: string,
    data: { name: string; capacityMl: number }
  ) => {
    updateBottle(bottleId, data);
    setEditingBottleId(null);
  };

  const handleAddProduct = (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addProduct(data);
    setShowProductForm(false);
    setEditingProduct(null);
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
  const availabilityFilteredProducts = filteredProducts.filter((product) => {
    if (availabilityFilter === 'all') return true;
    if (availabilityFilter === 'available') return product.isAvailable;
    return !product.isAvailable;
  });
  const sortedBottles = [...bottles].sort((a, b) =>
    bottleSortDirection === 'asc'
      ? a.capacityMl - b.capacityMl
      : b.capacityMl - a.capacityMl
  );

  const typeFilters: Array<{ value: Product['type'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'drink_mix', label: 'Drink mix' },
    { value: 'gel', label: 'Gels' },
    { value: 'chews', label: 'Chews' },
    { value: 'bar', label: 'Bars' },
  ];

  const availableBottleCount = bottles.filter((bottle) => bottle.isAvailable).length;
  const availableProductCount = products.filter((product) => product.isAvailable).length;

  const quickAddBottle = (template: { name: string; capacityMl: number }) => {
    addBottle({ ...template, isAvailable: true });
    setShowBottleForm(false);
    setEditingBottleId(null);
  };

  const quickAddProduct = (
    template: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addProduct(template);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        eyebrow="Inventory"
        title="Inventory"
        description={
          <>
            Bottles and fuel.
          </>
        }
        meta={
          <div className="page-stat-grid">
            <div className="page-stat">
              <p className="page-stat-label">Bottles</p>
              <p className="page-stat-value">{availableBottleCount}</p>
              <p className="page-stat-copy">{bottles.length} saved</p>
            </div>
            <div className="page-stat">
              <p className="page-stat-label">Products</p>
              <p className="page-stat-value">{availableProductCount}</p>
              <p className="page-stat-copy">{products.length} saved</p>
            </div>
            <div className="page-stat">
              <p className="page-stat-label">Quick add</p>
              <p className="page-stat-value">
                {QUICK_BOTTLE_TEMPLATES.length + QUICK_PRODUCT_TEMPLATES.length}
              </p>
              <p className="page-stat-copy">Common items</p>
            </div>
          </div>
        }
      />

      {/* Bottles Section */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 md:mb-4">
          <div>
            <h2 className="section-title text-lg">Bottles</h2>
            <p className="section-copy">
              {availableBottleCount}/{bottles.length || 0} available today
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
            <button
              type="button"
              onClick={() =>
                setBottleSortDirection((current) =>
                  current === 'asc' ? 'desc' : 'asc'
                )
              }
              className="min-h-11 rounded-full border border-[color:var(--border-soft)] bg-white px-4 py-2 text-center text-sm font-semibold text-ink-700 transition-colors hover:bg-shell-50 md:min-h-10"
            >
              Size {bottleSortDirection === 'asc' ? '↑' : '↓'}
            </button>
            {!showBottleForm && (
              <Button
                size="sm"
                className="w-full md:w-auto"
                onClick={() => {
                  setEditingBottleId(null);
                  setShowBottleForm(true);
                }}
              >
                New bottle
              </Button>
            )}
          </div>
        </div>

        <div className="mb-2.5 rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 md:mb-3 md:p-4">
          <p className="mb-3 text-sm font-medium text-ink-700">Quick add</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {QUICK_BOTTLE_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => quickAddBottle(template)}
                className="min-h-10 shrink-0 rounded-full border border-[color:var(--border-soft)] bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 md:min-h-0"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {showBottleForm && (
          <Card className="mb-2.5 md:mb-3">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <h3 className="section-title text-lg">New bottle</h3>
            </CardHeader>
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
            <CardContent className="py-5 text-center md:py-6">
              <p className="mb-4 text-ink-600">No bottles added yet.</p>
              <Button className="w-full sm:w-auto" onClick={() => setShowBottleForm(true)}>
                New bottle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedBottles.map((bottle) =>
              editingBottleId === bottle.id ? (
                <Card key={bottle.id} className={!bottle.isAvailable ? 'opacity-60' : ''}>
                  <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
                    <h3 className="section-title text-lg">{bottle.name}</h3>
                  </CardHeader>
                  <CardContent>
                    <BottleForm
                      initialData={{
                        name: bottle.name,
                        capacityMl: bottle.capacityMl,
                      }}
                      submitLabel="Save"
                      onSubmit={(data) => handleEditBottle(bottle.id, data)}
                      onCancel={() => setEditingBottleId(null)}
                    />
                  </CardContent>
                </Card>
              ) : (
                <BottleCard
                  key={bottle.id}
                  bottle={bottle}
                  onToggleAvailable={() =>
                    updateBottle(bottle.id, { isAvailable: !bottle.isAvailable })
                  }
                  onEdit={() => {
                    setShowBottleForm(false);
                    setEditingBottleId(bottle.id);
                  }}
                  onDelete={() => deleteBottle(bottle.id)}
                />
              )
            )}
          </div>
        )}
      </section>

      {/* Products Section */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 md:mb-4">
          <div>
            <h2 className="section-title text-lg">Products</h2>
            <p className="section-copy">
              {availableProductCount}/{products.length || 0} available today
            </p>
          </div>
          {!showProductForm && !editingProduct && (
            <Button size="sm" className="w-full md:w-auto" onClick={() => setShowProductForm(true)}>
              New product
            </Button>
          )}
        </div>

        <div className="mb-2.5 rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 md:mb-3 md:p-4">
          <p className="mb-3 text-sm font-medium text-ink-700">Quick add</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {QUICK_PRODUCT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => quickAddProduct(template)}
                className="min-h-10 shrink-0 rounded-full border border-[color:var(--border-soft)] bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 md:min-h-0"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {showProductForm && (
          <Card className="mb-2.5 md:mb-3">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <h3 className="section-title text-lg">New product</h3>
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
          <Card className="mb-2.5 md:mb-3">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <h3 className="section-title text-lg">{editingProduct.name}</h3>
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
          <div className="mb-2.5 rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 md:mb-3 md:p-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="section-kicker text-[0.68rem]">Type</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:px-0">
                  {typeFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setFilterType(filter.value)}
                      className={`min-h-10 shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors md:min-h-0 ${
                        filterType === filter.value
                          ? 'border-brand-300 bg-brand-100 text-brand-800'
                          : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="section-kicker text-[0.68rem]">Availability</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:px-0">
                  {(['all', 'available', 'unavailable'] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => setAvailabilityFilter(value)}
                      className={`min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors md:min-h-0 ${
                        availabilityFilter === value
                          ? 'border-brand-300 bg-brand-100 text-brand-800'
                          : 'border-[color:var(--border-soft)] bg-white text-ink-600 hover:bg-shell-50'
                      }`}
                    >
                      {value === 'all'
                        ? 'All'
                        : value === 'available'
                          ? 'Available'
                          : 'Unavailable'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {products.length === 0 && !showProductForm ? (
          <Card>
            <CardContent className="py-5 text-center md:py-6">
              <p className="mb-4 text-ink-600">No products added yet.</p>
              <Button className="w-full sm:w-auto" onClick={() => setShowProductForm(true)}>
                New product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {availabilityFilteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onToggleAvailable={() =>
                  updateProduct(product.id, { isAvailable: !product.isAvailable })
                }
                onEdit={() => {
                  setShowProductForm(false);
                  setEditingProduct(product);
                }}
                onDelete={() => deleteProduct(product.id)}
              />
            ))}
            {availabilityFilteredProducts.length === 0 && products.length > 0 && (
              <p className="py-6 text-center text-ink-500">
                No products match these filters.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
