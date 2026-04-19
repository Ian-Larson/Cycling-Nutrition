import { useState } from 'react';
import { useStore } from '@/store';
import { Button, Card, CardContent, CardHeader, Toggle } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { ProductForm } from '@/components/products/product-form';
import { BOTTLE_SIZES } from '@/types/bottle';
import type { BottleSize } from '@/types/bottle';
import type { Product } from '@/types';

const PRODUCT_TYPE_LABELS: Record<Product['type'], string> = {
  drink_mix: 'Drink mix',
  gel: 'Gel',
  chews: 'Chews',
  bar: 'Bar',
  other: 'Other',
};

function BottleCounter({
  size,
  count,
  onIncrement,
  onDecrement,
}: {
  size: BottleSize;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1rem] border border-[color:var(--border-soft)] bg-white px-3 py-3">
      <p className="font-semibold text-ink-900">{size}ml</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={count <= 0}
          onClick={onDecrement}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-shell-50 text-lg font-medium text-ink-700 transition-colors hover:bg-shell-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Remove one ${size}ml bottle`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-semibold tabular-nums text-ink-900">
          {count}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-shell-50 text-lg font-medium text-ink-700 transition-colors hover:bg-shell-100"
          aria-label={`Add one ${size}ml bottle`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<Product['type'] | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');

  const bottleCounts = useStore((s) => s.bottleCounts);
  const incrementBottleCount = useStore((s) => s.incrementBottleCount);

  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

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

  const typeFilters: Array<{ value: Product['type'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'drink_mix', label: 'Drink mix' },
    { value: 'gel', label: 'Gels' },
    { value: 'chews', label: 'Chews' },
    { value: 'bar', label: 'Bars' },
  ];

  const availableProductCount = products.filter((product) => product.isAvailable).length;

  const visibleMobileProducts = availabilityFilteredProducts.filter(
    (product) => product.id !== editingProduct?.id
  );

  const renderMobileProductRow = (product: Product, isLast: boolean) => (
    <div
      key={product.id}
      className={`space-y-2.5 px-3 py-3 ${
        isLast ? '' : 'border-b border-[color:var(--border-soft)]'
      } ${product.isAvailable ? '' : 'opacity-60'}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-semibold text-ink-900">{product.name}</p>
          <p className="text-sm leading-5 text-brand-700">
            {PRODUCT_TYPE_LABELS[product.type]}
            {product.brand ? ` • ${product.brand}` : ''}
          </p>
          <p className="text-sm leading-5 text-ink-700">
            {product.nutrition.carbsGrams}g carbs • {product.nutrition.calories} kcal
            {product.serving.servingSizeGrams
              ? ` / ${product.serving.servingSizeGrams}g`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowProductForm(false);
              setEditingProduct(product);
            }}
            className="inline-flex min-h-8 items-center rounded-lg px-1 text-[0.82rem] font-medium text-brand-700 transition-colors hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100"
          >
            Edit
          </button>
          <Toggle
            checked={product.isAvailable}
            onChange={() =>
              updateProduct(product.id, { isAvailable: !product.isAvailable })
            }
            label={`Use ${product.name} in planning`}
          />
        </div>
      </div>
    </div>
  );

  const renderDesktopProductRow = (product: Product, isLast: boolean) => (
    <div
      key={product.id}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 lg:px-5 ${
        isLast ? '' : 'border-b border-[color:var(--border-soft)]'
      } ${product.isAvailable ? '' : 'opacity-60'}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{product.name}</p>
          <span className="rounded-full bg-shell-100 px-2.5 py-1 text-xs font-medium text-ink-600">
            {PRODUCT_TYPE_LABELS[product.type]}
          </span>
          {product.brand ? (
            <span className="text-sm leading-5 text-ink-600">{product.brand}</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-5 text-ink-700">
          {product.nutrition.carbsGrams}g carbs • {product.nutrition.calories} kcal
          {product.serving.servingSizeGrams
            ? ` / ${product.serving.servingSizeGrams}g`
            : ''}
        </p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setShowProductForm(false);
            setEditingProduct(product);
          }}
          className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100"
        >
          Edit
        </button>
        <Toggle
          checked={product.isAvailable}
          onChange={() =>
            updateProduct(product.id, { isAvailable: !product.isAvailable })
          }
          label={`Use ${product.name} in planning`}
        />
      </div>
    </div>
  );

  return (
    <div className="page-shell max-w-6xl space-y-4 md:space-y-6">
      <PageIntro
        title="Inventory"
        description={
          <>
            Manage bottles and fuel.
          </>
        }
      />

      <SectionNav section="nutrition" />

      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)] xl:items-start xl:gap-6 xl:space-y-0">
      {/* Bottles Section */}
      <section className="space-y-3 md:space-y-4">
        <div className="mb-2.5 md:mb-4">
          <h2 className="section-title text-lg">Bottles</h2>
          <p className="section-copy mt-1">Set how many of each size you own.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {BOTTLE_SIZES.map((size: BottleSize) => (
            <BottleCounter
              key={size}
              size={size}
              count={bottleCounts[size]}
              onIncrement={() => incrementBottleCount(size, 1)}
              onDecrement={() => incrementBottleCount(size, -1)}
            />
          ))}
        </div>

        <p className="text-xs leading-5 text-ink-500">
          These counts are your bottle inventory. In the planner you can choose how many of each to bring on a ride.
        </p>
      </section>

      {/* Fuel Section */}
      <section className="space-y-3 md:space-y-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 md:mb-4">
          <div>
            <h2 className="section-title text-lg">Fuel</h2>
            <p className="section-copy">
              <span className="font-semibold text-brand-700">{availableProductCount}</span>{' '}
              of {products.length || 0} available
            </p>
          </div>
          {!showProductForm && !editingProduct && (
            <Button size="sm" className="w-full md:w-auto" onClick={() => setShowProductForm(true)}>
              Add fuel
            </Button>
          )}
        </div>

        {showProductForm && (
          <Card className="mb-2.5 md:mb-3">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <h3 className="section-title text-lg">Add fuel</h3>
            </CardHeader>
            <CardContent>
              <ProductForm
                onSubmit={handleAddProduct}
                onCancel={() => setShowProductForm(false)}
                submitLabel="Add fuel"
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
                onDelete={() => {
                  deleteProduct(editingProduct.id);
                  setEditingProduct(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        {products.length > 0 && (
          <div className="mb-2.5 rounded-[1.05rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 md:mb-3 md:p-4">
            <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
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
              <p className="mb-4 text-ink-600">No fuel added yet.</p>
              <Button className="w-full sm:w-auto" onClick={() => setShowProductForm(true)}>
                Add fuel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="md:hidden">
              {visibleMobileProducts.length > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {visibleMobileProducts.map((product, index) =>
                      renderMobileProductRow(
                        product,
                        index === visibleMobileProducts.length - 1
                      )
                    )}
                  </CardContent>
                </Card>
              )}
              {visibleMobileProducts.length === 0 && products.length > 0 && (
                <p className="py-5 text-center text-ink-500">
                  No fuel matches these filters.
                </p>
              )}
            </div>
            <div className="hidden md:block">
              {visibleMobileProducts.length > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {visibleMobileProducts.map((product, index) =>
                      renderDesktopProductRow(
                        product,
                        index === visibleMobileProducts.length - 1
                      )
                    )}
                  </CardContent>
                </Card>
              )}
              {availabilityFilteredProducts.length === 0 && products.length > 0 && (
                <p className="py-6 text-center text-ink-500">
                  No fuel matches these filters.
                </p>
              )}
            </div>
          </>
        )}
      </section>
      </div>
    </div>
  );
}
