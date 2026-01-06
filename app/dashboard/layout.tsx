import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { ContentWrapper } from "@/components/content-wrapper";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <main>
      <ContentWrapper user={session.user}>{children}</ContentWrapper>
    </main>
  );
}
