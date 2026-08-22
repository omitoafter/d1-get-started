CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('influencer', 'bartender')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✦',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Invitado',
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

INSERT INTO posts (category, title, body, emoji)
SELECT 'influencer', 'Las voces que mueven la noche', 'Perfiles, lugares y momentos que están definiendo el AFTER.', '✦'
WHERE NOT EXISTS (SELECT 1 FROM posts);

INSERT INTO posts (category, title, body, emoji)
SELECT 'bartender', 'Detrás de la barra', 'Coctelería, energía y las personas que hacen inolvidable cada noche.', '◈'
WHERE (SELECT COUNT(*) FROM posts) = 1;