select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_name in ('profiles') and column_name='clerk_user_id';