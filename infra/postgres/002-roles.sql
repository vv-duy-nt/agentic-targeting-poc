\set ON_ERROR_STOP on
\getenv agent_user POSTGRES_AGENT_USER
\getenv agent_password POSTGRES_AGENT_PASSWORD
\getenv database_name POSTGRES_DB

SELECT format(
    'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
    :'agent_user',
    :'agent_password'
)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = :'agent_user'
) \gexec

REVOKE ALL ON DATABASE :"database_name" FROM :"agent_user";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM :"agent_user";
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM :"agent_user";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM :"agent_user";

GRANT CONNECT ON DATABASE :"database_name" TO :"agent_user";
GRANT USAGE ON SCHEMA public TO :"agent_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"agent_user";

ALTER ROLE :"agent_user" SET statement_timeout = '5000ms';
