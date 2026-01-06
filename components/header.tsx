export const Header = ({
  label,
  actions,
}: {
  label: string;
  actions?: React.ReactNode;
}) => {
  return (
    <header className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
      <h1 className="text-3xl font-bold tracking-tight">{label}</h1>

      <div>{actions}</div>
    </header>
  );
};
