export function Button({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button onClick={onClick} className="btn">{label}</button>;
}
