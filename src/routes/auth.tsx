import { createFileRoute, redirect } from "@tanstack/react-router";

// A tela de login agora é a homepage.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
