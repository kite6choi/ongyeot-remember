-- 온곁 리멤버 초기 스키마
-- plan.md 6장 기준

-- ============================================================
-- 1. 테이블 생성
-- ============================================================

-- 반려동물
create table pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  age_years int,
  passed_on date not null,
  created_at timestamptz default now()
);

-- 추억 (사진 + 짧은 메모, 반려동물당 최대 5개)
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  photo_path text,
  note text check (char_length(note) <= 100),
  created_at timestamptz default now()
);

-- 대화 세션
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- 메시지
create table messages (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','safety')),
  content text not null,
  created_at timestamptz default now()
);

-- 저널 (감정 점수 포함)
create table journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  journal_date date not null default current_date,
  headline text not null,
  longing smallint not null check (longing between 0 and 10),
  guilt smallint not null check (guilt between 0 and 10),
  lethargy smallint not null check (lethargy between 0 and 10),
  warmth smallint not null check (warmth between 0 and 10),
  moments text[] not null default '{}',
  self_message text not null,
  small_step text,
  edited boolean default false,
  created_at timestamptz default now()
);

-- 위기 이벤트 (원문 저장 안 함)
create table risk_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  level text not null check (level in ('high','medium')),
  source text not null check (source in ('keyword','classifier','both')),
  created_at timestamptz default now()
);

-- AI 사용량 로그 (비용 추적)
create table ai_usage (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null check (purpose in ('chat','risk','journal','eval')),
  model text not null,
  input_tokens int,
  cached_tokens int,
  output_tokens int,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. 인덱스
-- ============================================================

create index journals_user_date_idx on journals(user_id, journal_date desc);
create index messages_conversation_idx on messages(conversation_id, created_at);
create index ai_usage_created_idx on ai_usage(created_at desc);
create index risk_events_user_idx on risk_events(user_id, created_at desc);

-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================

-- 모든 테이블에 RLS 활성화
alter table pets enable row level security;
alter table memories enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table journals enable row level security;
alter table risk_events enable row level security;
alter table ai_usage enable row level security;

-- pets: 본인 데이터만 CRUD
create policy "Users can manage their own pets"
  on pets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- memories: 본인 데이터만 CRUD
create policy "Users can manage their own memories"
  on memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- conversations: 본인 데이터만 CRUD
create policy "Users can manage their own conversations"
  on conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- messages: 본인 데이터만 CRUD
create policy "Users can manage their own messages"
  on messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- journals: 본인 데이터만 CRUD
create policy "Users can manage their own journals"
  on journals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- risk_events: 본인 데이터 조회만 가능, insert는 서버만
create policy "Users can view their own risk events"
  on risk_events for select
  using (auth.uid() = user_id);

-- ai_usage: 본인 데이터 조회만 가능, insert는 서버만
create policy "Users can view their own AI usage"
  on ai_usage for select
  using (auth.uid() = user_id);

-- ============================================================
-- 4. Storage 버킷 (memories)
-- ============================================================

-- memories 버킷 생성 (비공개)
insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

-- memories 버킷 정책: 본인 폴더만 접근
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'memories' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own files"
  on storage.objects for select
  using (
    bucket_id = 'memories' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own files"
  on storage.objects for update
  using (
    bucket_id = 'memories' and
    (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'memories' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'memories' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
