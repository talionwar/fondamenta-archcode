import { ProductCard } from '../../components/ProductCard';
import { getProducts } from '../../lib/db';

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Products</h1>
      {products.map((p: any) => (
        <ProductCard key={p.id} name={p.name} price={p.price} />
      ))}
    </main>
  );
}
