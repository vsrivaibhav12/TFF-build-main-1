import { ensureModuleVisible } from '@/lib/auth/portal-visibility';

export default async function Layout({ children }: { children: React.ReactNode }) {
  await ensureModuleVisible('portal.bizlens');
  return <>{children}</>;
}
