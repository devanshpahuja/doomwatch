CREATE TABLE signature_wall_checkpoint (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sequence INTEGER NOT NULL
);
--> statement-breakpoint
INSERT INTO signature_wall_checkpoint (id, sequence)
SELECT 1, COALESCE(MAX(sequence), 0) FROM signatures;
--> statement-breakpoint
DELETE FROM signatures;
