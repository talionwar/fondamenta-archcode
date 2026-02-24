import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { Toast } from '../../components/ui/Toast';
import { Dropdown } from '../../components/ui/Dropdown';
import { Tabs } from '../../components/ui/Tabs';
import { Table } from '../../components/ui/Table';
import { DashboardStats } from '../../components/DashboardStats';
import { ProductCard } from '../../components/ProductCard';
import { OrderForm } from '../../components/OrderForm';
import { GodComponent } from '../../components/GodComponent';
import { UserProfile } from '../../components/UserProfile';
import { getProducts } from '../../lib/db';
import { getAnalytics } from '../../lib/analytics';
import { formatCurrency, formatDate } from '../../lib/utils';

export default async function DashboardPage() {
  const products = await getProducts();
  const analytics = await getAnalytics();

  return (
    <main>
      <h1>Dashboard</h1>
      <DashboardStats />
      <Tabs>
        <div>
          <Table data={products} />
          <Button label="Add Product" />
          <Modal title="New Product">
            <Input placeholder="Name" />
            <Input placeholder="Price" />
          </Modal>
        </div>
        <div>
          <OrderForm />
          <GodComponent />
        </div>
      </Tabs>
      <div>
        <Badge text="New" />
        <Avatar src="/avatar.png" />
        <Spinner />
        <Toast message="Welcome!" />
        <Dropdown items={['Option 1', 'Option 2']} />
      </div>
      {products.map((p: any) => (
        <ProductCard key={p.id} name={p.name} price={p.price} />
      ))}
      <Card title="Revenue">
        <p>{formatCurrency(analytics.revenue)}</p>
        <p>{formatDate(analytics.lastUpdated)}</p>
      </Card>
      <UserProfile />
    </main>
  );
}
