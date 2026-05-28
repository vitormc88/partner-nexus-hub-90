update public.documents
set file_url = regexp_replace(file_url, '^https?://[^/]+/storage/v1/object/public/documents/', '')
where file_url ~ '^https?://[^/]+/storage/v1/object/public/documents/';