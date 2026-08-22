import { ArrowLeft, ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import { Link, useParams } from "wouter";
import { useGetBlog, useGetBlogArticle } from "@workspace/api-client-react";
import type { ReactNode } from "react";
import { PromoBanner } from "@/components/promo-banner";

const OFFICIAL_LOGO_URL = `${import.meta.env.BASE_URL}by-omito-official-logo.png`;

function JournalMark() {
  return <Link href="/" data-testid="link-blog-home" className="inline-flex items-center">
    <img src={OFFICIAL_LOGO_URL} alt="BY OMITO" className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
  </Link>;
}

function StoryDate({ value }: { value: string }) {
  return <span className="mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#a891b5]"><CalendarDays size={13} />{new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>;
}

function BlogFrame({ children }: { children: ReactNode }) {
  return <div className="app-noise min-h-[100dvh] bg-[#120d18] text-[#f5eaff]">
    <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 md:px-8">
      <JournalMark />
      <div className="flex items-center gap-4">
        <Link href="/explore" data-testid="link-blog-explore" className="hidden text-xs text-[#bbaac6] transition hover:text-[#d59cff] sm:block">Explore the room</Link>
        <Link href="/sign-in" data-testid="link-blog-sign-in" className="rounded-full border border-[#4b345d] px-4 py-2 text-xs font-bold transition hover:border-[#d59cff] hover:text-[#d59cff]">Get inside</Link>
      </div>
    </header>
    {children}
  </div>;
}

export function BlogPage() {
  const blog = useGetBlog();
  document.title = "Journal — BY OMITO";
  return <BlogFrame>
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 md:px-8 md:pt-20">
      <div className="max-w-2xl">
        <p className="mono mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-[#ff74c7]"><Sparkles size={13} />The BY OMITO journal</p>
        <h1 data-testid="heading-blog" className="display text-5xl font-extrabold leading-[.88] tracking-[-.08em] md:text-7xl">Stories worth staying up for<span className="text-[#d59cff]">.</span></h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#b7a6c1]">Notes from the people, pours, and places that make the city move after dark.</p>
      </div>
      <PromoBanner placement="journal" />

      {blog.isLoading ? <div data-testid="state-blog-loading" className="mono py-20 text-xs uppercase tracking-[.2em] text-[#a891b5]">Tuning the signal…</div> : null}
      {blog.isError ? <div data-testid="state-blog-error" className="mt-12 rounded-2xl border border-[#5b3044] bg-[#271620] p-6 text-sm text-[#f0b1c5]">The journal could not load. Please refresh and try again.</div> : null}
      {!blog.isLoading && !blog.isError && !blog.data?.length ? <div data-testid="state-blog-empty" className="mt-12 rounded-2xl border border-[#3c294b] bg-[#1b1224] p-8 text-sm text-[#b7a6c1]">New field notes are on their way.</div> : null}
      <section className="mt-14 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Journal stories">
        {blog.data?.map((article) => <Link key={article.id} href={`/blog/${article.slug}`} data-testid={`card-blog-${article.slug}`} className="soft-card group min-w-0 overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:border-[#9d5dc4]">
          <img src={article.coverImageUrl} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="p-5">
            <StoryDate value={article.publishedAt} />
            <h2 className="display mt-4 text-2xl font-bold tracking-[-.04em]">{article.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#b7a6c1]">{article.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#d59cff]">Read story <ArrowUpRight size={15} /></span>
          </div>
        </Link>)}
      </section>
    </main>
  </BlogFrame>;
}

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useGetBlogArticle(slug);
  if (article.data) document.title = `${article.data.title} — BY OMITO`;
  return <BlogFrame>
    <main className="mx-auto max-w-[860px] px-5 pb-20 pt-10 md:px-8 md:pt-16">
      <Link href="/blog" data-testid="link-back-blog" className="inline-flex items-center gap-2 text-xs text-[#bbaac6] transition hover:text-[#d59cff]"><ArrowLeft size={15} />Back to journal</Link>
      {article.isLoading ? <div data-testid="state-blog-article-loading" className="mono py-20 text-xs uppercase tracking-[.2em] text-[#a891b5]">Opening the story…</div> : null}
      {article.isError || !slug ? <div data-testid="state-blog-article-error" className="mt-12 rounded-2xl border border-[#5b3044] bg-[#271620] p-6 text-sm text-[#f0b1c5]">This story is unavailable.</div> : null}
      {article.data ? <article className="mt-10">
        <StoryDate value={article.data.publishedAt} />
        <h1 data-testid="heading-blog-article" className="display mt-5 max-w-3xl text-5xl font-extrabold leading-[.9] tracking-[-.08em] md:text-7xl">{article.data.title}</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c2b0cc]">{article.data.excerpt}</p>
        <img src={article.data.coverImageUrl} alt="" className="mt-10 h-[260px] w-full rounded-2xl object-cover md:h-[430px]" />
        <div className="mx-auto mt-10 max-w-2xl">
          <p className="whitespace-pre-line text-base leading-8 text-[#dbd0e1]">{article.data.body}</p>
          <div className="mt-12 border-t border-[#362344] pt-6"><p className="mono text-[10px] uppercase tracking-[.18em] text-[#8b7796]">Filed by</p><Link href={`/profile/${article.data.author.username}`} className="mt-2 inline-block text-sm font-bold text-[#d59cff]">{article.data.author.displayName}</Link></div>
        </div>
      </article> : null}
    </main>
  </BlogFrame>;
}