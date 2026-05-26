import type Database from 'better-sqlite3';

/**
 * Run all database migrations.
 * Uses a simple version-based approach with a migrations table.
 */
export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const currentVersion = db.prepare(
    'SELECT MAX(version) as version FROM schema_migrations'
  ).get() as { version: number | null } | undefined;

  const version = currentVersion?.version ?? 0;

  const migrations = getMigrations();

  for (const migration of migrations) {
    if (migration.version > version) {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(
          migration.version
        );
      })();
    }
  }
}

interface Migration {
  version: number;
  sql: string;
}

function getMigrations(): Migration[] {
  return [
    {
      version: 1,
      sql: `
        CREATE TABLE jurisdiction_profiles (
          id TEXT PRIMARY KEY,
          school_name TEXT NOT NULL,
          school_address TEXT,
          municipality TEXT NOT NULL DEFAULT '',
          province TEXT,
          country TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'discovering',
          discovered_at TEXT NOT NULL,
          approved_at TEXT,
          approved_by TEXT,
          expires_at TEXT NOT NULL,
          confidence_score REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX idx_profiles_school_name ON jurisdiction_profiles(school_name);
        CREATE INDEX idx_profiles_status ON jurisdiction_profiles(status);

        CREATE TABLE discovered_resources (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          url TEXT,
          phone TEXT,
          email TEXT,
          target_audience TEXT NOT NULL DEFAULT '[]',
          category TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT '',
          confidence REAL NOT NULL DEFAULT 0,
          is_known_resource INTEGER NOT NULL DEFAULT 0,
          verified_by_teacher INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (profile_id) REFERENCES jurisdiction_profiles(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_resources_profile_id ON discovered_resources(profile_id);
        CREATE INDEX idx_resources_category ON discovered_resources(category);

        CREATE TABLE legal_obligations (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          authority TEXT NOT NULL DEFAULT '',
          deadline TEXT,
          source_url TEXT,
          applicable_law TEXT,
          confidence REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (profile_id) REFERENCES jurisdiction_profiles(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_obligations_profile_id ON legal_obligations(profile_id);

        CREATE TABLE reporting_procedures (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          title TEXT NOT NULL,
          steps TEXT NOT NULL DEFAULT '[]',
          target_authority TEXT NOT NULL DEFAULT '',
          required_documents TEXT,
          template_available INTEGER NOT NULL DEFAULT 0,
          source_url TEXT,
          confidence REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (profile_id) REFERENCES jurisdiction_profiles(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_procedures_profile_id ON reporting_procedures(profile_id);

        CREATE TABLE cases (
          id TEXT PRIMARY KEY,
          teacher_id TEXT NOT NULL,
          student_id TEXT,
          jurisdiction_profile_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'report',
          priority TEXT NOT NULL DEFAULT 'medium',
          incident_type TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (jurisdiction_profile_id) REFERENCES jurisdiction_profiles(id)
        );

        CREATE INDEX idx_cases_teacher_id ON cases(teacher_id);
        CREATE INDEX idx_cases_profile_id ON cases(jurisdiction_profile_id);
        CREATE INDEX idx_cases_status ON cases(status);

        CREATE TABLE checklist_items (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          text TEXT NOT NULL,
          done INTEGER NOT NULL DEFAULT 0,
          "order" INTEGER NOT NULL DEFAULT 0,
          jurisdiction_specific INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_checklist_case_id ON checklist_items(case_id);

        CREATE TABLE case_stage_history (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          from_stage TEXT,
          to_stage TEXT NOT NULL,
          changed_by TEXT NOT NULL,
          changed_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_stage_history_case_id ON case_stage_history(case_id);
      `,
    },
  ];
}
