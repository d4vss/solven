import "next-auth";

declare module "next-auth" {
  interface User {
    id: string | number;
    onboardingDone: boolean;
  }

  interface Session {
    user: User;
  }
}
