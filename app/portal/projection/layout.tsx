import { ensureModuleVisible } from '@/lib/auth/portal-visibility';

export default async function ProjectionLayout({ children }: { children: React.ReactNode }) {
  await ensureModuleVisible('portal.tax_projection');
  return <>{children}</>;
}
