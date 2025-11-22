import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    router.push('/');
  }

  return (
    <main style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Login Admin</h1>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button>Entrar</button>
      </form>
    </main>
  );
}
