import { listRoleTemplates } from '@/lib/repositories/role-templates';
import RoleTemplatesAdmin from './role-templates-admin';

export const dynamic = 'force-dynamic';

export default async function RoleTemplatesPage() {
  const templates = await listRoleTemplates();
  return <RoleTemplatesAdmin templates={templates} />;
}
