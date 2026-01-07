"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type InvitePreview = {
  familyName: string | null;
  inviterEmail: string;
  expiresAt: string;
};

type InviteAcceptanceCardProps = {
  token: string;
};

export function InviteAcceptanceCard({ token }: InviteAcceptanceCardProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/family/invite/preview?token=${encodeURIComponent(token)}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || "Invite is invalid or expired");
          return;
        }

        setPreview(result.data);
      } catch (err) {
        console.error("Error loading invite preview:", err);
        setError("Invite is invalid or expired");
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [token]);

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/family/invite/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to accept invite");
        return;
      }

      toast.success("Invite accepted");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Error accepting invite:", err);
      toast.error("Failed to accept invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      await fetch("/api/family/invite/decline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error("Error declining invite:", err);
    } finally {
      router.push("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Invite unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/dashboard")}>Go to app</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">
          Join {preview?.familyName || "a family"}
        </CardTitle>
        <CardDescription>
          You were invited by {preview?.inviterEmail}. This invite expires on{" "}
          {preview?.expiresAt
            ? new Date(preview.expiresAt).toLocaleDateString()
            : "soon"}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Accepting..." : "Accept invite"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDecline}
          className="w-full sm:w-auto"
        >
          Decline
        </Button>
      </CardContent>
    </Card>
  );
}
