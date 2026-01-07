import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight, Layers2, List, Sheet } from "lucide-react";

const QUICK_LINKS = [
  {
    title: "Transactions",
    description: "Review recent inflow and outflow at a glance.",
    href: "/dashboard/transaction",
    icon: List,
  },
  {
    title: "Categories",
    description: "Organize expenses and income with clean labels.",
    href: "/dashboard/categories",
    icon: Layers2,
  },
  {
    title: "Budget",
    description: "Plan the month and keep totals aligned.",
    href: "/dashboard/budget",
    icon: Sheet,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Jump into the areas you check most often on mobile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur animate-fade-up [animation-delay:80ms]">
          <CardHeader>
            <CardTitle className="text-xl">Quick access</CardTitle>
            <CardDescription>
              Navigate straight to the tools you use daily.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-center justify-between  border border-white/60 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur animate-fade-up [animation-delay:160ms]">
          <CardHeader>
            <CardTitle className="text-xl">Daily rhythm</CardTitle>
            <CardDescription>
              Keep a quick cadence with a simple routine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className=" border border-white/60 bg-white/70 p-4">
              Check today&apos;s transactions and add new ones as they happen.
            </div>
            <div className=" border border-white/60 bg-white/70 p-4">
              Review categories weekly to keep budgets clean and organized.
            </div>
            <div className=" border border-white/60 bg-white/70 p-4">
              Update the monthly budget once and track it on the go.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
