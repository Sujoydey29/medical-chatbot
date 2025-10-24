-- Check current vector dimensions in database
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name IN ('messages', 'patientMemory')
    AND column_name = 'contentEmbedding';

-- Also check if the vector extension is properly loaded
SELECT typname, typlen FROM pg_type WHERE typname = 'vector';
