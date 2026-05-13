import { ThemeToggle } from "@/componentes/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Botão de tema fixo no canto superior direito */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}