INSERT INTO families (id, surname, owner_id, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'TestFamily',
  'b6040c95-1302-40e8-9310-9249ffaf1f5c',
  'Test family for blur verification',
  NOW(),
  NOW()
) RETURNING id;
