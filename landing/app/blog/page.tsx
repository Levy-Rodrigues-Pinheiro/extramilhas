import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from './posts';

export const metadata: Metadata = {
  title: 'Blog · Milhas Extras',
  description:
    'Guias, estratégias e análises sobre milhas aéreas, transferências bonificadas e CPM.',
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-3 text-slate-400">
          Guias, estratégias e análises sobre milhas aéreas no Brasil
        </p>
      </header>

      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-purple-500/40"
          >
            <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
              <time>{new Date(post.date).toLocaleDateString('pt-BR')}</time>
              <span>·</span>
              <span>{post.readMin} min de leitura</span>
              {post.tags?.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="mb-2 text-xl font-bold text-white hover:text-accent-purple">
              {post.title}
            </h2>
            <p className="text-sm text-slate-400">{post.excerpt}</p>
          </Link>
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-slate-500">
        <Link href="/" className="underline hover:text-slate-400">
          ← Voltar pra home
        </Link>
      </p>
    </main>
  );
}
