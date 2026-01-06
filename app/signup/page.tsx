import { SignupForm } from "@/components/forms/signupForm";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="max-w-md mx-auto m-4">
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
