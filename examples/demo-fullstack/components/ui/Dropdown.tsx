export function Dropdown({ items }: { items: string[] }) {
  return <select>{items.map(i => <option key={i}>{i}</option>)}</select>;
}
