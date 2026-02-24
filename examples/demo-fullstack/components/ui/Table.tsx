export function Table({ data }: { data: any[] }) {
  return <table><tbody>{data.map((r, i) => <tr key={i}><td>{JSON.stringify(r)}</td></tr>)}</tbody></table>;
}
