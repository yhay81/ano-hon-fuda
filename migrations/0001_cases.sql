PRAGMA foreign_keys = ON;

CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  owner_token_hash TEXT NOT NULL,
  creator_session_id TEXT NOT NULL,
  memory_title TEXT NOT NULL CHECK (length(memory_title) BETWEEN 1 AND 80),
  kind TEXT NOT NULL CHECK (kind IN ('novel', 'picture', 'manga', 'reference', 'other')),
  read_when TEXT NOT NULL CHECK (length(read_when) BETWEEN 1 AND 80),
  read_where TEXT NOT NULL CHECK (length(read_where) <= 80),
  cover_hint TEXT NOT NULL CHECK (length(cover_hint) <= 200),
  memory_text TEXT NOT NULL CHECK (length(memory_text) BETWEEN 20 AND 1000),
  already_tried TEXT NOT NULL CHECK (length(already_tried) <= 240),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'solved', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX cases_expires_at ON cases (expires_at);
CREATE INDEX cases_creator ON cases (creator_session_id, created_at);

CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  author TEXT NOT NULL CHECK (length(author) <= 80),
  evidence_url TEXT NOT NULL CHECK (length(evidence_url) <= 500),
  reason TEXT NOT NULL CHECK (length(reason) <= 300),
  verdict TEXT NOT NULL DEFAULT 'new'
    CHECK (verdict IN ('new', 'checking', 'not_it', 'correct', 'hidden')),
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (case_id, session_id, occurred_on)
);

CREATE INDEX suggestions_case ON suggestions (case_id, created_at);

CREATE TABLE reports (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'unsafe', 'other')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, reporter_session_id)
);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (
    name IN (
      'visited',
      'case_created',
      'link_copied',
      'suggestion_saved',
      'owner_opened',
      'case_solved',
      'case_deleted',
      'returned'
    )
  ),
  context TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (session_id, name, context, occurred_on)
);

CREATE INDEX product_events_created_at ON product_events (created_at);
