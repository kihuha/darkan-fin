"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, UserPlus } from "lucide-react";
import { FamilyInviteForm } from "@/components/forms/familyInviteForm";

type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
};

type FamilyInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
};

type FamilyData = {
  family: {
    id: string;
    name: string | null;
  };
  role: "admin" | "member";
  members: FamilyMember[];
  invites: FamilyInvite[];
};

const statusVariant: Record<FamilyInvite["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  accepted: "secondary",
  revoked: "outline",
  expired: "destructive",
};

export function FamilySettingsSection() {
  const [data, setData] = useState<FamilyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const fetchFamily = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/family");
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to load family settings");
        return;
      }

      setData(result.data);
    } catch (error) {
      console.error("Error fetching family settings:", error);
      toast.error("Failed to load family settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleInviteCreated = (payload: {
    invite: FamilyInvite;
    inviteLink: string;
  }) => {
    setInviteLink(payload.inviteLink);
    fetchFamily();
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch (error) {
      console.error("Error copying invite link:", error);
      toast.error("Failed to copy invite link");
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      const response = await fetch("/api/family/invite/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to revoke invite");
        return;
      }

      toast.success("Invite revoked");
      fetchFamily();
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast.error("Failed to revoke invite");
    }
  };

  const isAdmin = data?.role === "admin";
  const familyName = useMemo(() => data?.family?.name || "Your Family", [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{familyName}</h2>
        <p className="text-sm text-muted-foreground">
          Everyone in your family can view and manage the same data.
        </p>
      </div>

      <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-4 w-4" />
            Invite a member
          </CardTitle>
          <CardDescription>
            Add someone by email and share your family dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FamilyInviteForm
            disabled={!isAdmin}
            onInviteCreated={handleInviteCreated}
          />
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              Only admins can invite or revoke members.
            </p>
          )}
          {inviteLink && (
            <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm sm:flex-row sm:items-center">
              <Input readOnly value={inviteLink} className="text-xs" />
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleCopy}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Family members</CardTitle>
            <CardDescription>
              Everyone with access to this family.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.members?.length ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Name
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Email
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Role
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Joined
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {member.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(member.created_at), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No members yet</EmptyTitle>
                  <EmptyDescription>
                    Invite someone to share your family dashboard.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Pending invites</CardTitle>
            <CardDescription>
              Invitations waiting to be accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.invites?.length ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[420px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Email
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Sent
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Expires
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {invite.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[invite.status]}>
                            {invite.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(invite.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(invite.expires_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {invite.status === "pending" && isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevoke(invite.id)}
                            >
                              Revoke
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No pending invites</EmptyTitle>
                  <EmptyDescription>
                    New invites will show up here until accepted.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
