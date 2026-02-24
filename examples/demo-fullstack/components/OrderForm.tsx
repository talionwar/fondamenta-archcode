import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function OrderForm() {
  return (
    <form>
      <Input placeholder="Quantity" />
      <Input placeholder="Address" />
      <Button label="Place Order" />
    </form>
  );
}
