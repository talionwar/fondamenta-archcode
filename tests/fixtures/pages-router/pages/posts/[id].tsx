import type { GetStaticProps, GetStaticPaths } from 'next';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => ({
  props: { id: params?.id },
});

export default function PostPage({ id }: { id: string }) {
  return <div>Post {id}</div>;
}
