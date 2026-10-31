import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'recepcion', 'terapeuta'] as const;
type Role = (typeof ROLES)[number];

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/** Verifica el token del solicitante y que su rol (app_metadata) sea admin. */
async function requireAdmin(req: NextRequest, sb: SupabaseClient): Promise<{ caller: User } | NextResponse> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'No autenticado' }, 401);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sesión inválida' }, 401);
  if (data.user.app_metadata?.role !== 'admin') return json({ error: 'Solo el administrador puede gestionar usuarios' }, 403);
  return { caller: data.user };
}

function serialize(u: User) {
  return {
    id: u.id,
    email: u.email ?? '',
    fullName: (u.user_metadata?.full_name as string) || '',
    role: (ROLES.includes(u.app_metadata?.role) ? u.app_metadata.role : null) as Role | null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

async function countAdmins(sb: SupabaseClient): Promise<number> {
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users ?? []).filter((u) => u.app_metadata?.role === 'admin').length;
}

const NOT_CONFIGURED = {
  error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel → Settings → Environment Variables).',
  code: 'SERVICE_KEY_MISSING',
};

export async function GET(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return json(NOT_CONFIGURED, 503);
  const auth = await requireAdmin(req, sb);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return json({ error: error.message }, 500);
  return json({ users: data.users.map(serialize), currentUserId: auth.caller.id });
}

export async function POST(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return json(NOT_CONFIGURED, 503);
  const auth = await requireAdmin(req, sb);
  if (auth instanceof NextResponse) return auth;

  const { email, password, fullName, role } = await req.json();
  if (!email || !password) return json({ error: 'Correo y contraseña son obligatorios' }, 400);
  if (String(password).length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
  if (!ROLES.includes(role)) return json({ error: 'Rol inválido' }, 400);

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || '' },
    app_metadata: { role },
  });
  if (error || !data.user) return json({ error: error?.message || 'No se pudo crear el usuario' }, 400);
  return json({ user: serialize(data.user) }, 201);
}

export async function PATCH(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return json(NOT_CONFIGURED, 503);
  const auth = await requireAdmin(req, sb);
  if (auth instanceof NextResponse) return auth;

  const { id, role, fullName, password } = await req.json();
  if (!id) return json({ error: 'Falta el id del usuario' }, 400);

  const attrs: Parameters<typeof sb.auth.admin.updateUserById>[1] = {};

  if (role !== undefined) {
    if (!ROLES.includes(role)) return json({ error: 'Rol inválido' }, 400);
    if (id === auth.caller.id && role !== 'admin' && (await countAdmins(sb)) <= 1) {
      return json({ error: 'No puedes quitarte el rol admin siendo el único administrador' }, 400);
    }
    attrs.app_metadata = { role };
  }
  if (fullName !== undefined) attrs.user_metadata = { full_name: fullName };
  if (password) {
    if (String(password).length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    attrs.password = password;
  }

  const { data, error } = await sb.auth.admin.updateUserById(id, attrs);
  if (error || !data.user) return json({ error: error?.message || 'No se pudo actualizar' }, 400);
  return json({ user: serialize(data.user) });
}

export async function DELETE(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return json(NOT_CONFIGURED, 503);
  const auth = await requireAdmin(req, sb);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'Falta el id del usuario' }, 400);
  if (id === auth.caller.id) return json({ error: 'No puedes eliminar tu propio usuario' }, 400);

  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
