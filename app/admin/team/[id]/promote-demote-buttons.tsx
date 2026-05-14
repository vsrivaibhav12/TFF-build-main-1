"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { promoteToAdminAction, demoteAdminAction } from "@/lib/actions/admin-hierarchy";
import { toast } from "sonner";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  userId: string;
  currentRole: string;
  isPrimeAdmin: boolean;
  canPromote: boolean;
  canDemote: boolean;
}

export default function PromoteDemoteButtons({ userId, currentRole, isPrimeAdmin, canPromote, canDemote }: Props) {
  const [pending, startTransition] = useTransition();

  function promote() {
    if (!confirm("Promote this team member to admin? They will gain full admin access.")) return;
    startTransition(async () => {
      const r = await promoteToAdminAction(userId);
      if (r.success) { toast.success("Promoted to admin"); window.location.reload(); }
      else toast.error(r.error);
    });
  }

  function demote() {
    if (!confirm("Demote this admin back to team role? They will lose admin access.")) return;
    startTransition(async () => {
      const r = await demoteAdminAction(userId);
      if (r.success) { toast.success("Demoted to team"); window.location.reload(); }
      else toast.error(r.error);
    });
  }

  if (currentRole === "team" && canPromote) {
    return (
      <Button variant="outline" size="sm" onClick={promote} disabled={pending} className="gap-1">
        <ArrowUp className="h-3.5 w-3.5" /> Promote to admin
      </Button>
    );
  }

  if (currentRole === "admin" && canDemote) {
    return (
      <Button variant="outline" size="sm" onClick={demote} disabled={pending} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
        <ArrowDown className="h-3.5 w-3.5" /> Demote to team
      </Button>
    );
  }

  return null;
}
