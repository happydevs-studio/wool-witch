-- Woolwitch - Set storage bucket file size limit to 50KB
-- Updates the woolwitch-images bucket to enforce a 50KB maximum file size

UPDATE storage.buckets
SET file_size_limit = 51200  -- 50KB in bytes
WHERE id = 'woolwitch-images';
