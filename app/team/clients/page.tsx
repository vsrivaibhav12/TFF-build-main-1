import { listAccessibleClients } from '@/lib/repositories/clients';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, Building2, ArrowRight } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import { Suspense } from 'react';
import ClientsTableClient from './clients-table-client';

export const dynamic = 'force-dynamic';

export default async function TeamClientsList() {
  const clients = await listAccessibleClients();

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="tff-page-title">My clients</h1>
            <p className="tff-page-subtitle">
              {clients.length} client{clients.length !== 1 ? 's' : ''} assigned to you
            </p>
          </div>
        </div>
      </StaggerItem>

      {clients.length === 0 ? (
        <StaggerItem>
          <EmptyState
            title="No clients assigned"
            body="Ask an admin to assign you to a client to start working."
            icon={<Users className="h-6 w-6 text-zinc-400" />}
          />
        </StaggerItem>
      ) : (
        <>
          <StaggerItem>
            <Suspense
              fallback={
                <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm p-4">
                  <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
                </div>
              }
            >
              <ClientsTableClient clients={clients} />
            </Suspense>
          </StaggerItem>

          {/* Client cards grid for quick access */}
          <StaggerItem>
            <div>
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">Quick access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.slice(0, 6).map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/team/clients/${c.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white shadow-sm p-4 transition-all duration-200 hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-teal-700 transition-colors">
                        {c.business_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {c.lifecycle_stage}
                        </Badge>
                        <span className="text-[10px] text-zinc-400 font-mono">{c.pan}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-teal-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </StaggerItem>
        </>
      )}
    </StaggerContainer>
  );
}
