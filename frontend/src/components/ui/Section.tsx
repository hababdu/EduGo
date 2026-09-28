import { ReactNode } from 'react';
import { TEXT, SURFACE } from '../../design/tokens';

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-1">
          {title && <h2 className={TEXT.label}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${SURFACE.card} rounded-2xl ${className}`}>{children}</div>;
}

export function CardList({ children }: { children: ReactNode }) {
  return (
    <div className={`${SURFACE.card} rounded-2xl divide-y divide-white/5 overflow-hidden`}>
      {children}
    </div>
  );
}
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface/30 rounded-2xl animate-pulse border border-white/5 ${className}`}
    />
  );
}

export function ListSkeleton({ rows = 3, height = 'h-16' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-32" />
    </div>
  );
}