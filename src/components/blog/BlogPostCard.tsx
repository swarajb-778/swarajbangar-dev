import Link from 'next/link';
import { Badge } from '@/components/ui';
import { CornerGlowCard, type CornerGlowTint } from '@/components/ui/CornerGlowCard';
import { formatDate } from '@/lib/utils';
import type { BlogPost } from '@/lib/types';

export interface BlogPostCardProps {
  readonly post: BlogPost;
}

const TINTS: readonly CornerGlowTint[] = ['purple', 'teal', 'emerald'];

function tintFor(slug: string): CornerGlowTint {
  const sum = [...slug].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TINTS[sum % TINTS.length];
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <CornerGlowCard tint={tintFor(post.slug)} style={{ height: '100%' }}>
        <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2">
          {post.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">
          {post.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
          <span>{formatDate(post.date)}</span>
          <span className="size-1 rounded-full bg-text-disabled" />
          <span>{post.readingTime}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="gray">{tag}</Badge>
          ))}
        </div>
      </CornerGlowCard>
    </Link>
  );
}
