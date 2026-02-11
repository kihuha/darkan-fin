import { LoginForm } from "@/components/forms/loginForm";
import { Logo } from "@/components/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function LoginPage(props: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams?.redirect;

  return (
    <div className="relative min-h-svh overflow-hidden bg-auth">
      <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-12">
        <section className="flex flex-col justify-center gap-8 animate-fade-up">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground"
                data-testid="logo-subtitle"
              >
                Darkan Fin
              </p>
              <p
                className="text-sm text-muted-foreground"
                data-testid="logo-description"
              >
                Calm clarity for your cashflow
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              See the full picture of your money, every day.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Track transactions, budgets, and categories in one focused space
              built for quick checks on the go.
            </p>
          </div>
        </section>

        <section className="flex items-center animate-fade-up [animation-delay:120ms]">
          <Card className="w-full bg-white/80 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to keep your finances in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LoginForm redirectTo={redirectTo} />
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link className="font-medium text-primary" href="/signup">
                  Sign Up
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
