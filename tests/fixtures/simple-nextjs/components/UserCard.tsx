import { Button } from './Button';

export function UserCard({ name }: { name: string }) {
  return <div><span>{name}</span><Button label="View" /></div>;
}
