#!/usr/bin/env node
import fs from 'node:fs';

const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';

const readEnvValue = (key) => {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  const match = envContent.match(new RegExp(`^${key}="?(.*?)"?$`, 'm'));
  return match?.[1] ?? '';
};

const SUPABASE_URL = readEnvValue('VITE_SUPABASE_URL');
const SUPABASE_KEY = readEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY');

const requiredMigrations = [
  '20260216145659_d6ed658d-0a32-4b5d-86ea-b1e881f4ec85',
  '20260216160000_project_team_access_visibility',
  '20260128155343_ce806069-0e86-41be-9e5b-6812473037ea',
];

const printStep = (title) => console.log(`\n=== ${title} ===`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env/process env.');
  process.exit(1);
}

printStep('Connectivity check');
let health;
try {
  health = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
} catch (error) {
  console.log(`Network error while calling auth/v1/health: ${error}`);
  console.log('This blocks migration history/policy runtime validation here.');
  process.exit(2);
}

console.log(`auth/v1/health => HTTP ${health.status}`);
if (!health.ok) {
  console.log('Unable to reach authenticated Supabase APIs from this environment.');
  console.log('This blocks migration history/policy runtime validation here.');
  process.exit(2);
}

printStep('Migration history check (needs service-role credentials)');
console.log('Expected versions:');
requiredMigrations.forEach((version) => console.log(`- ${version}`));
console.log('Use the SQL below in Supabase SQL editor or psql connected as service role/admin:');
console.log(`SELECT version FROM supabase_migrations.schema_migrations\nWHERE version IN (${requiredMigrations.map((v) => `'${v}'`).join(', ')});`);

printStep('Profiles visibility checks (client user context)');
console.log('Run as a client authenticated session and validate rows for owner_id/created_by/user_project_access members:');
console.log(`SELECT user_id, full_name, email, avatar_url FROM public.profiles WHERE user_id IN (
  SELECT owner_id FROM public.projects WHERE client_id = public.get_user_client_id(auth.uid())
  UNION
  SELECT created_by FROM public.projects WHERE client_id = public.get_user_client_id(auth.uid())
  UNION
  SELECT upa.user_id
  FROM public.user_project_access upa
  JOIN public.projects p ON p.id = upa.project_id
  WHERE p.client_id = public.get_user_client_id(auth.uid())
);`);

printStep('ClientProjects cards (list + kanban)');
console.log('UI should render avatar_url when available and fallback initials from full_name/email.');
console.log('Validate with a client user that has access to shared projects.');
