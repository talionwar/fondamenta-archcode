import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  props: { posts: [] },
});

export default function Posts({ posts }: { posts: any[] }) {
  return <div>{posts.length} posts</div>;
}
