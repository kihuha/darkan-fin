import { SignupForm } from "@/components/forms/signupForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function LoginPage(
  props: {
    searchParams?: Promise<{ redirect?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams?.redirect;

  return (
    <div className="relative min-h-svh overflow-hidden bg-auth">
      <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:px-12">
        <section className="flex flex-col justify-center gap-8 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center  bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              DF
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Darkan Fin
              </p>
              <p className="text-sm text-muted-foreground">
                A gentle way to manage your money
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Create a smarter, calmer budget routine.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Build categories, set budgets, and keep tabs on your spending from
              any device.
            </p>
          </div>
        </section>

        <section className="flex items-center animate-fade-up [animation-delay:120ms]">
          <Card className="w-full border-white/60 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>
                Start organizing your finances in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SignupForm redirectTo={redirectTo} />
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="font-medium text-primary" href="/">
                  Sign In
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
