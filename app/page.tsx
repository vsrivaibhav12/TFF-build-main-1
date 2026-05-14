import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/require-role';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');
  if (user.role === 'team') redirect('/team');
  redirect('/portal');
}
