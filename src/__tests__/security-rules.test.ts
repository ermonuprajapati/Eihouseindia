import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Firestore & Storage Security Rules Static Invariants', () => {
  const firestoreRules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const storageRules = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf-8');

  it('uses rules_version 2 and default-deny catch-all in firestore.rules', () => {
    expect(firestoreRules).toContain("rules_version = '2';");
    expect(firestoreRules).toContain('match /{document=**}');
    expect(firestoreRules).toContain('allow read, write: if false;');
  });

  it('isolates private user PII and blocks self-role escalation', () => {
    expect(firestoreRules).toContain('match /users/{userId}');
    expect(firestoreRules).toContain("incoming().role == 'USER'");
    expect(firestoreRules).toContain('incoming().role == existing().role');
    expect(firestoreRules).toContain('match /publicProfiles/{userId}');
  });

  it('prevents authors from directly setting post status to PUBLISHED', () => {
    expect(firestoreRules).toContain("incoming().status in ['DRAFT', 'PENDING']");
    expect(firestoreRules).toContain("existing().status == 'PUBLISHED'");
  });

  it('makes moderationLogs immutable', () => {
    expect(firestoreRules).toContain('match /moderationLogs/{logId}');
    expect(firestoreRules).toContain('allow update, delete: if false;');
  });

  it('enforces MIME type, 5MB limit, and UID-scoped paths in storage.rules', () => {
    expect(storageRules).toContain("rules_version = '2';");
    expect(storageRules).toContain('5 * 1024 * 1024');
    expect(storageRules).toContain('image/(jpeg|png|webp|avif)');
    expect(storageRules).toContain('match /uploads/{userId}/{allPaths=**}');
    expect(storageRules).toContain('request.auth.uid == userId');
  });
});
