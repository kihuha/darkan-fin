import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteAcceptanceCard } from "@/components/settings/inviteAcceptanceCard";

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token;

  if (!token) {
    return (
      <div className="relative min-h-svh bg-auth px-4 py-10">
        <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
        <div className="relative mx-auto flex min-h-svh max-w-xl items-center">
          <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Invite not found</CardTitle>
              <CardDescription>
                This invite link is missing or incomplete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary underline" href="/">
                Return to sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const redirectTarget = `/invite/accept?token=${encodeURIComponent(token)}`;

    return (
      <div className="relative min-h-svh bg-auth px-4 py-10">
        <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
        <div className="relative mx-auto flex min-h-svh max-w-xl items-center">
          <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in to accept</CardTitle>
              <CardDescription>
                You&apos;ll need to sign in before joining a family.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Link
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground"
                href={`/?redirect=${encodeURIComponent(redirectTarget)}`}
              >
                Sign in
              </Link>
              <p className="text-center">
                New here?{" "}
                <Link
                  className="text-primary underline"
                  href={`/signup?redirect=${encodeURIComponent(redirectTarget)}`}
                >
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh bg-auth px-4 py-10">
      <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
      <div className="relative mx-auto flex min-h-svh max-w-xl items-center">
        <InviteAcceptanceCard token={token} />
      </div>
    </div>
  );
}
