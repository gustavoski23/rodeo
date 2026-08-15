/* auth-strip — la franja de "inicia sesión para guardar tu Premium en tu
   cuenta" que va arriba del pago en cripto.

   Por qué existe: el receptor de cobros no sabe QUIÉN paga (es sin cuentas).
   Para que el Premium quede atado a un correo, Hablarte tiene que saber quién es
   el que paga — y eso es esta sesión. Si el usuario ya entró, se lo decimos y
   el pago se ata solo; si no, ofrecemos Google y enlace mágico SIN obligar:
   sin sesión el pago igual funciona, solo que no queda atado a la cuenta. */

import { useEffect, useState } from 'react';
import { Check, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/ui/sign-up';
import { providersDisponibles, useAuth } from '@/stores/auth';

const CORREO_OK = /\S+@\S+\.\S+/;

export function AuthStrip() {
  const usuario = useAuth((s) => s.usuario);
  const loginGoogle = useAuth((s) => s.loginGoogle);
  const loginConEnlace = useAuth((s) => s.loginConEnlace);

  // El botón de Google solo aparece si el proveedor está habilitado (Paso 4 del
  // runbook). Si no, se queda el camino por correo, que funciona sin Google.
  const [googleOn, setGoogleOn] = useState(false);
  useEffect(() => {
    let vivo = true;
    void providersDisponibles().then((p) => {
      if (vivo) setGoogleOn(p.google);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Ya con sesión: no hay nada que pedir, solo confirmar dónde se guardará.
  if (usuario) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Check size={14} strokeWidth={2.5} className="shrink-0 text-green-600" />
        <span className="min-w-0">
          Tu Premium se guardará en{' '}
          <span className="font-medium text-foreground">{usuario.email}</span>
        </span>
      </div>
    );
  }

  // Enlace mágico enviado: el usuario se va al correo y vuelve con sesión.
  if (estado === 'enviado') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-input bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Mail size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
        <span>
          Te mandé un enlace a <span className="font-medium text-foreground">{email}</span>. Ábrelo y
          vuelve — el pago quedará atado a esa cuenta.
        </span>
      </div>
    );
  }

  const enviar = async () => {
    if (!CORREO_OK.test(email.trim())) {
      setError('Ese correo no se ve válido.');
      return;
    }
    setEstado('enviando');
    setError(null);
    const r = await loginConEnlace(email);
    if (r.ok) setEstado('enviado');
    else {
      setEstado('idle');
      setError(r.mensaje);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-input bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Inicia sesión para guardar tu Premium en tu cuenta.
        </span>{' '}
        Sin esto el pago funciona igual, pero no queda atado a tu correo.
      </p>

      {googleOn && (
        <Button type="button" variant="outline" className="w-full" onClick={() => void loginGoogle()}>
          <GoogleIcon />
          Continuar con Google
        </Button>
      )}

      <div className="flex items-stretch gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Tu correo"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void enviar();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void enviar()}
          disabled={estado === 'enviando'}
        >
          {estado === 'enviando' ? <Loader2 className="animate-spin" size={16} /> : 'Enviar enlace'}
        </Button>
      </div>

      {error !== null && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
