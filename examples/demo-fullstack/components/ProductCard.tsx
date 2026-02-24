import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatCurrency } from '../lib/utils';

export function ProductCard({ name, price }: { name: string; price: number }) {
  return (
    <Card title={name}>
      <Badge text="New" />
      <p>{formatCurrency(price)}</p>
      <Button label="Add to Cart" />
    </Card>
  );
}
