'use client';

import { useState } from 'react';

export function Button({ label }: { label: string }) {
  const [clicked, setClicked] = useState(false);
  return <button onClick={() => setClicked(true)}>{label}</button>;
}
