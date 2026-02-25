import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL fehlt. Bitte in Railway Variables setzen.')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }
})

const sql = `
create table if not exists quiz_questions (
  id bigserial primary key,
  edition text not null,
  question text not null,
  answers jsonb not null,
  correct_index int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition, question)
);

create table if not exists drawing_words (
  id bigserial primary key,
  edition text not null,
  word text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition, word)
);

create table if not exists voting_prompts (
  id bigserial primary key,
  edition text not null,
  prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition, prompt)
);

create table if not exists emoji_riddles (
  id bigserial primary key,
  edition text not null,
  emoji text not null,
  answer text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition, emoji, answer)
);

create table if not exists category_prompts (
  id bigserial primary key,
  edition text not null,
  prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition, prompt)
);

create index if not exists idx_quiz_questions_edition_active on quiz_questions (edition, is_active);
create index if not exists idx_drawing_words_edition_active on drawing_words (edition, is_active);
create index if not exists idx_voting_prompts_edition_active on voting_prompts (edition, is_active);
create index if not exists idx_emoji_riddles_edition_active on emoji_riddles (edition, is_active);
create index if not exists idx_category_prompts_edition_active on category_prompts (edition, is_active);
`

try {
  await pool.query(sql)
  console.log('Migration erfolgreich.')
} catch (error) {
  console.error('Migration fehlgeschlagen:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
