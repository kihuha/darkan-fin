"use client";

import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Separator } from "./ui/separator";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Budget", href: "/dashboard/budget" },
  { name: "Categories", href: "/dashboard/categories" },
  { name: "Transactions", href: "/dashboard/transaction" },
];

export const ContentWrapper = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
  };
}) => {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  const handleSignOut = () => {
    authClient
      .signOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out. Please try again.");
      });
  };

  return (
    <div className="min-h-full">
      <nav>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="shrink-0">
                <Logo />
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigation.map((item) => (
                    <Button
                      key={item.name}
                      variant={
                        navigation.find((navItem) => navItem.href === path)
                          ?.name === item.name
                          ? "default"
                          : "ghost"
                      }
                      aria-current={
                        navigation.find((navItem) => navItem.href === path)
                          ?.name === item.name
                          ? "page"
                          : undefined
                      }
                    >
                      <Link href={item.href}>{item.name}</Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-x-4 border rounded-md ring-4 ring-white/10 px-3 py-2">
                    <div className="flex items-center gap-x-1">
                      <Avatar className="size-6">
                        <AvatarImage
                          src={user.image || "/avatar-fallback.jpg"}
                        />

                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="text-muted-foreground text-sm ml-1">
                        {user.name}
                      </p>
                    </div>

                    <ChevronDown className="size-4 ml-1 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="start">
                  <DropdownMenuItem onSelect={() => handleSignOut()}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex md:hidden">
              {/* Mobile menu button */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:bg-white/5 hover:text-white"
                  >
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="h-6 w-6" />
                    ) : (
                      <Menu className="h-6 w-6" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="space-y-1 px-2 pt-2 pb-3">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        aria-current={
                          navigation.find((navItem) => navItem.href === path)
                            ?.name === item.name
                            ? "page"
                            : undefined
                        }
                        className={cn(
                          navigation.find((navItem) => navItem.href === path)
                            ?.name === item.name
                            ? "bg-primary text-white"
                            : "",
                          "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-4 pb-3 mt-4">
                    <div className="flex items-center px-5">
                      <Avatar className="h-10 w-10 ring-1 ring-white/10">
                        <AvatarImage
                          src={user.image || "/avatar-fallback.jpg"}
                          alt={user.name}
                        />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="text-base font-medium ">
                          {user.name}
                        </div>
                        <div className="text-sm font-medium ">{user.email}</div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="mt-3 space-y-1 px-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSignOut()}
                        className="w-full"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="mx-auto max-w-7xl px-4 md:py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
