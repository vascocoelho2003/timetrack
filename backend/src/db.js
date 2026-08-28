const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'timetrack.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      profile TEXT NOT NULL DEFAULT 'user' CHECK(profile IN ('admin', 'user')),
      active BOOLEAN NOT NULL DEFAULT 'True',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      department_id INTEGER DEFAULT NULL REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS clients(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_type TEXT NOT NULL CHECK (client_type IN ('person','department')),
      user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
      department_id INTEGER DEFAULT NULL REFERENCES departments(id) ON DELETE CASCADE,
      CONSTRAINT chk_client_target CHECK(
      (client_type = 'person' AND user_id IS NOT NULL AND department_id IS NULL) OR
      (client_type = 'department' AND department_id IS NOT NULL AND user_id IS NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT 'TRUE',
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT 'TRUE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_guests(
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS task_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT 'TRUE',
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_list_id INTEGER DEFAULT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
      parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'doing', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      alert_offset_days INTEGER DEFAULT 0,
      next_alert_date TEXT DEFAULT NULL,
      near_due_email_sent INTEGER DEFAULT 0,
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      client_id INTEGER DEFAULT NULL REFERENCES clients(id) ON DELETE SET NULL,
      docs_url TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS recurrence_rules(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      interval INTEGER NOT NULL DEFAULT 1,
      weekday TEXT CHECK(weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
      day_of_month INTEGER CHECK(day_of_month BETWEEN 1 AND 31),
      month_of_year INTEGER CHECK(month_of_year BETWEEN 1 AND 12),
      start_date TEXT NOT NULL DEFAULT (datetime('now')),
      end_date TEXT,
      active BOOLEAN NOT NULL DEFAULT 'TRUE',
      rule_type TEXT CHECK(rule_type IN ('fixed_day', 'business_day')) NOT NULL DEFAULT 'fixed_day',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      start TEXT NOT NULL,
      end TEXT,
      duration INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      predecessor INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      successor INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      dependency_type TEXT CHECK(dependency_type IN ('SS', 'FS','FF','SF')) NOT NULL DEFAULT 'FF',
      PRIMARY KEY (predecessor, successor)
    );

    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(task_list_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON dependencies(predecessor);
    CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON dependencies(successor);
    CREATE INDEX IF NOT EXISTS idx_project_guests_user ON project_guests(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_guests_project ON project_guests(project_id);
  `);

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userColumns.some((column) => column.name === 'department_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL`);
  }

  const taskColumns = db.prepare(`PRAGMA table_info(tasks)`).all();
  if (!taskColumns.some((column) => column.name === 'client_id')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL`);
  }

  const timeEntryColumns = db.prepare(`PRAGMA table_info(time_entries)`).all();
  const taskIdColumn = timeEntryColumns.find((column) => column.name === 'task_id');
  if (taskIdColumn?.notnull === 1) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE time_entries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        start TEXT NOT NULL,
        end TEXT,
        duration INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO time_entries_new (id, user_id, task_id, start, end, duration, created_at)
        SELECT id, user_id, task_id, start, end, duration, created_at FROM time_entries;
      DROP TABLE time_entries;
      ALTER TABLE time_entries_new RENAME TO time_entries;
      CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
    `);
    try {
      const maxId = db.prepare('SELECT MAX(id) as maxId FROM time_entries').get()?.maxId || 0;
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'time_entries'").run();
      db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES ('time_entries', ?)").run(maxId);
    } catch {
      // sqlite_sequence may not exist yet
    }
    db.pragma('foreign_keys = ON');
  }
}

module.exports = { db, initDb };
