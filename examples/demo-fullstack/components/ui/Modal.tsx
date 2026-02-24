export function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <dialog>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
