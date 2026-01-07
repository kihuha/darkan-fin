import { FamilySettingsSection } from "@/components/settings/familySettingsSection";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage family access and invitations.
        </p>
      </div>

      <FamilySettingsSection />
    </div>
  );
}
