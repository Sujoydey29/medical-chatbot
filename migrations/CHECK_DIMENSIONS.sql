-- Check actual current dimensions
SELECT 
    'messages' as table_name,
    (atttypmod - 4) as current_dimensions
FROM pg_attribute 
WHERE attrelid = '"messages"'::regclass 
AND attname = 'contentEmbedding'

UNION ALL

SELECT 
    'patientMemory' as table_name,
    (atttypmod - 4) as current_dimensions
FROM pg_attribute 
WHERE attrelid = '"patientMemory"'::regclass 
AND attname = 'contentEmbedding';
