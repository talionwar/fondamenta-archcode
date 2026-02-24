import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProductCard } from '../components/ProductCard';
import { UserProfile } from '../components/UserProfile';

export default function HomePage() {
  return (
    <main>
      <h1>Demo Store</h1>
      <UserProfile />
      <div>
        <ProductCard name="Widget" price={9.99} />
        <ProductCard name="Gadget" price={19.99} />
      </div>
      <Button label="Shop Now" />
      <Card title="Featured">
        <p>Check out our latest products</p>
      </Card>
    </main>
  );
}
