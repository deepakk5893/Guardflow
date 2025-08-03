-- Cleanup script for duplicate chats
-- This script will keep only the most recent active chat per USER per TASK
-- and archive all others
-- Note: Multiple users CAN have separate chats for the same task

-- First, let's see the current state
SELECT 
    user_id, 
    task_id, 
    COUNT(*) as chat_count,
    STRING_AGG(id::text, ', ') as chat_ids
FROM chats 
WHERE status = 'active' 
GROUP BY user_id, task_id 
HAVING COUNT(*) > 1
ORDER BY user_id, task_id;

-- Archive duplicate chats, keeping only the most recent one for each user+task combination
WITH chat_rankings AS (
    SELECT 
        id,
        user_id,
        task_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, task_id 
            ORDER BY updated_at DESC, created_at DESC
        ) as rank
    FROM chats 
    WHERE status = 'active'
),
chats_to_archive AS (
    SELECT id 
    FROM chat_rankings 
    WHERE rank > 1
)
UPDATE chats 
SET status = 'archived', 
    updated_at = NOW()
WHERE id IN (SELECT id FROM chats_to_archive);

-- Verify the cleanup
SELECT 
    user_id, 
    task_id, 
    COUNT(*) as active_chat_count
FROM chats 
WHERE status = 'active' 
GROUP BY user_id, task_id 
HAVING COUNT(*) > 1;

-- Show final state
SELECT 
    user_id,
    task_id,
    id,
    title,
    total_tokens_used,
    status,
    created_at,
    updated_at
FROM chats 
WHERE status = 'active'
ORDER BY user_id, task_id, updated_at DESC;