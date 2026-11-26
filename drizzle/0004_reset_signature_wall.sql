UPDATE signature_wall_checkpoint
SET sequence = MAX(sequence, COALESCE((SELECT MAX(sequence) FROM signatures), 0)) + 1
WHERE id = 1;
--> statement-breakpoint
DELETE FROM signatures;
--> statement-breakpoint
DELETE FROM signature_visitors;
