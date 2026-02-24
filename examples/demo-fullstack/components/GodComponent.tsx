import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Avatar } from './ui/Avatar';
import { Spinner } from './ui/Spinner';
import { Toast } from './ui/Toast';
import { Dropdown } from './ui/Dropdown';
import { Tabs } from './ui/Tabs';
import { Table } from './ui/Table';
import { ProductCard } from './ProductCard';
import { OrderForm } from './OrderForm';
import { formatCurrency, formatDate, slugify } from '../lib/utils';
import { getProducts, getOrders } from '../lib/db';

export function GodComponent() {
  return (
    <div>
      <Card title="Everything">
        <Button label="Do All" />
        <Modal title="Edit">
          <Input placeholder="Name" />
          <Badge text="Status" />
        </Modal>
        <Avatar src="/img.png" />
        <Spinner />
        <Toast message="Hello" />
        <Dropdown items={['A', 'B']} />
        <Tabs>
          <Table data={[]} />
        </Tabs>
        <ProductCard name="X" price={1} />
        <OrderForm />
      </Card>
    </div>
  );
}
