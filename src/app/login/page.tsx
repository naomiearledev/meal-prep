import { LoginForm } from "./LoginForm";
import { login } from "./actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <LoginForm action={login} error={error} />;
}
