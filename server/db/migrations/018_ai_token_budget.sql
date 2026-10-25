CREATE TABLE ai_token_days(day date PRIMARY KEY, tokens bigint NOT NULL CHECK(tokens>=0));
CREATE TABLE ai_token_reservations(id uuid PRIMARY KEY, day date NOT NULL REFERENCES ai_token_days(day), reserved bigint NOT NULL, actual bigint, created_at timestamptz NOT NULL DEFAULT now());
