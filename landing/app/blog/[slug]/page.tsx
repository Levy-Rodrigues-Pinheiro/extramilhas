import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '../posts';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: 'Post não encontrado' };
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

/**
 * Render markdown-simples. Sem lib pra não pesar bundle — trata só
 * `## H2`, `### H3`, `\`code\``, `**bold**`, listas `- `, e parágrafos.
 * Pra formatos mais ricos futuro = migrar pra react-markdown.
 */
function renderMarkdown(body: string): JSX.Element[] {
  const lines = body.trim().split('\n');
  const out: JSX.Element[] = [];
  let buf: string[] = [];
  let inList = false;
  let inCode = false;

  const flushPara = () => {
    if (buf.length === 0) return;
    const text = buf.join(' ');
    out.push(
      <p key={out.length} className="mb-4 leading-relaxed text-slate-300">
        {formatInline(text)}
      </p>,
    );
    buf = [];
  };
  const flushList = () => {
    if (buf.length === 0) return;
    out.push(
      <ul key={out.length} className="mb-4 ml-5 list-disc space-y-1 text-slate-300">
        {buf.map((item, i) => (
          <li key={i}>{formatInline(item)}</li>
        ))}
      </ul>,
    );
    buf = [];
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(
          <pre key={out.length} className="mb-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs">
            <code className="text-slate-300">{buf.join('\n')}</code>
          </pre>,
        );
        buf = [];
        inCode = false;
      } else {
        flushPara();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      buf.push(line);
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      inList = false;
      out.push(
        <h2 key={out.length} className="mb-3 mt-8 text-2xl font-bold text-white">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      flushPara();
      flushList();
      out.push(
        <h3 key={out.length} className="mb-2 mt-6 text-lg font-bold text-white">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith('- ')) {
      if (!inList) {
        flushPara();
        inList = true;
      }
      buf.push(line.slice(2));
    } else if (line.trim() === '') {
      if (inList) {
        flushList();
        inList = false;
      } else {
        flushPara();
      }
    } else {
      if (inList) {
        flushList();
        inList = false;
      }
      buf.push(line);
    }
  }
  if (inList) flushList();
  else flushPara();

  return out;
}

function formatInline(text: string): React.ReactNode {
  // bold **x** e inline code `x`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const m = match[0];
    if (m.startsWith('**')) {
      parts.push(
        <strong key={i++} className="font-semibold text-white">
          {m.slice(2, -2)}
        </strong>,
      );
    } else if (m.startsWith('`')) {
      parts.push(
        <code key={i++} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-accent-purple">
          {m.slice(1, -1)}
        </code>,
      );
    } else if (m.startsWith('[')) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(m);
      if (linkMatch) {
        parts.push(
          <Link key={i++} href={linkMatch[2]} className="text-accent-purple hover:underline">
            {linkMatch[1]}
          </Link>,
        );
      }
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <article>
        <header className="mb-8 border-b border-slate-800 pb-6">
          <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
            <time>
              {new Date(post.date).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readMin} min de leitura</span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">{post.title}</h1>
          <p className="mt-3 text-base text-slate-400">{post.excerpt}</p>
        </header>

        <div>{renderMarkdown(post.body)}</div>

        {/* JSON-LD pra rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt,
              datePublished: post.date,
              author: { '@type': 'Organization', name: 'Milhas Extras' },
              keywords: post.keywords?.join(', '),
            }),
          }}
        />
      </article>

      <footer className="mt-16 flex items-center justify-between border-t border-slate-800 pt-8">
        <Link href="/blog" className="text-sm text-accent-purple hover:underline">
          ← Voltar ao blog
        </Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          Abrir app →
        </Link>
      </footer>
    </main>
  );
}
