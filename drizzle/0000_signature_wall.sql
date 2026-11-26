CREATE TABLE signatures (
  slot INTEGER PRIMARY KEY CHECK (slot >= 0 AND slot < 100),
  sequence INTEGER NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 24),
  hero INTEGER NOT NULL CHECK (hero >= 0 AND hero < 12)
);
