import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '@/state/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';

export function Login() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { loginUser } = useApp();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    loginUser(email.trim());
    navigate({ to: '/' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <Card className="w-full max-w-sm bg-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-center">CYPHER‑X Personal Vault</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Enter your email (no password)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">Login / Continue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

