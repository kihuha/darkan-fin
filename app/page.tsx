import { LoginForm } from "@/components/forms/loginForm";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Card className="max-w-md mx-auto m-4">
      <CardContent>
        <LoginForm />
        <small>
          Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
        </small>
      </CardContent>
    </Card>
  );
}
