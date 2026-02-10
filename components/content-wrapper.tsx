"use client";

import { Menu, Bell, X } from "lucide-react";
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

const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};
const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Budget", href: "/dashboard/budget" },
  { name: "Categories", href: "/dashboard/categories" },
  { name: "Transactions", href: "/dashboard/transaction" },
];
const userNavigation = [
  { name: "Your profile", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Sign out", href: "#" },
];

export const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const path = usePathname();

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
              <div className="ml-4 flex items-center md:ml-6 gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-6 w-6" />
                </Button>

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/10">
                        <AvatarImage src={user.imageUrl} alt={user.name} />
                        <AvatarFallback>TC</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 bg-gray-800 border-white/10"
                    align="end"
                  >
                    {userNavigation.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <a
                          href={item.href}
                          className="text-gray-300 focus:bg-white/5 cursor-pointer"
                        >
                          {item.name}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                <SheetContent
                  side="right"
                  className="bg-gray-800 border-white/10 w-64"
                >
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
                            ? "bg-gray-950/50 text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white",
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
                        <AvatarImage src={user.imageUrl} alt={user.name} />
                        <AvatarFallback>TC</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="text-base font-medium text-white">
                          {user.name}
                        </div>
                        <div className="text-sm font-medium text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-gray-400 hover:text-white hover:bg-white/5"
                      >
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-6 w-6" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1 px-2">
                      {userNavigation.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
