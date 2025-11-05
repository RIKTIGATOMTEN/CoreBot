// Pre-compile regex patterns (computed once at module load)
const CREATE_TABLE_REGEX = /CREATE\s+TABLE\s+/i;
const IF_NOT_EXISTS_REGEX = /IF\s+NOT\s+EXISTS/i;
const TABLE_NAME_REGEX = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i;
const INDEX_NAME_REGEX = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i;

export function ensureIfNotExists(query: string): string {
  const trimmed = query.trim();
  const upperQuery = trimmed.toUpperCase();

  if (upperQuery.startsWith('CREATE TABLE') && !upperQuery.includes('IF NOT EXISTS')) {
    return query.replace(CREATE_TABLE_REGEX, 'CREATE TABLE IF NOT EXISTS ');
  }

  return query;
}

export function validateQuery(query: string): boolean {
  const trimmed = query.trim();
  const upperQuery = trimmed.toUpperCase();

  // Fast prefix check (most efficient first)
  const startsWithCreate = upperQuery.startsWith('CREATE TABLE') || 
                          upperQuery.startsWith('CREATE INDEX') || 
                          upperQuery.startsWith('CREATE UNIQUE INDEX');

  if (!startsWithCreate) {
    throw new Error(`Only CREATE TABLE and CREATE INDEX statements are allowed. Got: ${trimmed.substring(0, 50)}...`);
  }

  // Optimized: Check for dangerous keywords in one pass
  // Using a Set for O(1) lookups and checking only once
  const dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT',
    'ALTER USER', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
    'CALL', 'INTO OUTFILE', 'LOAD DATA', 'SELECT INTO'
  ];

  for (const keyword of dangerousKeywords) {
    if (upperQuery.includes(keyword)) {
      throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
    }
  }

  // Fast parenthesis check using indexOf (faster than includes)
  if (trimmed.indexOf('(') === -1 || trimmed.indexOf(')') === -1) {
    throw new Error('Invalid SQL syntax: missing parentheses');
  }

  // Fast semicolon check - only count if present
  const firstSemicolon = trimmed.indexOf(';');
  if (firstSemicolon !== -1) {
    throw new Error('Multiple statements or trailing semicolons not allowed in single query');
  }

  return true;
}

export function validateSqlFile(statements: string[]): {
  valid: string[];
  invalid: Array<{statement: string; error: string; index: number}>;
} {
  const valid: string[] = [];
  const invalid: Array<{statement: string; error: string; index: number}> = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    try {
      const processed = ensureIfNotExists(statement);
      validateQuery(processed);
      valid.push(processed);
    } catch (error) {
      invalid.push({
        statement: statement.substring(0, 100) + '...',
        error: (error as Error).message,
        index: i + 1,
      });
    }
  }

  return {valid, invalid};
}

export function isSchemaQuery(query: string): boolean {
  const upperQuery = query.trim().toUpperCase();
  return (
    upperQuery.startsWith('CREATE TABLE') ||
    upperQuery.startsWith('CREATE INDEX') ||
    upperQuery.startsWith('CREATE UNIQUE INDEX')
  );
}

export function extractTableName(query: string): string | null {
  const match = query.match(TABLE_NAME_REGEX);
  return match?.[1] ?? null;
}

export function extractIndexName(query: string): string | null {
  const match = query.match(INDEX_NAME_REGEX);
  return match?.[1] ?? null;
}