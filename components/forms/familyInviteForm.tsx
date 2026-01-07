"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  familyInviteSchema,
  type FamilyInviteInput,
} from "@/lib/validations/family";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type FamilyInviteFormProps = {
  disabled?: boolean;
  onInviteCreated?: (payload: {
    invite: {
      id: string;
      email: string;
      status: string;
      expires_at: string;
      created_at: string;
    };
    inviteLink: string;
  }) => void;
};

export function FamilyInviteForm({
  disabled,
  onInviteCreated,
}: FamilyInviteFormProps) {
  const form = useForm<FamilyInviteInput>({
    resolver: zodResolver(familyInviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FamilyInviteInput) => {
    try {
      const response = await fetch("/api/family/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to send invite");
        return;
      }

      toast.success("Invite created");
      form.reset();
      onInviteCreated?.(result.data);
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite by email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@email.com"
                  {...field}
                  disabled={disabled || form.formState.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={disabled || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Sending..." : "Send Invite"}
        </Button>
      </form>
    </Form>
  );
}
