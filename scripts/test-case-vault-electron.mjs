#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import electronPath from 'electron';
import { build } from 'esbuild';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = fs.mkdtempSync(path.join(repoRoot, '.tmp-vault-electron-'));
const entryPath = path.join(tempRoot, 'vault-smoke.ts');
const bundlePath = path.join(tempRoot, 'vault-smoke.cjs');
const userDataPath = path.join(tempRoot, 'user-data');
const vaultModulePath = path.relative(tempRoot, path.join(repoRoot, 'src', 'main', 'lib', 'case-vault.ts')).replace(/\\/g, '/');
const vaultModuleSpecifier = vaultModulePath.startsWith('.') ? vaultModulePath : `./${vaultModulePath}`;

const source = `
import assert from 'node:assert/strict';
import { app } from 'electron';
import {
  closeDb,
  createCase,
  deleteAnalysis,
  deleteAllCases,
  deleteDraft,
  exportCase,
  listCases,
  purgeExpiredCases,
  renameCase,
  saveAnalysis,
  saveCaseState,
  saveDraft,
} from ${JSON.stringify(vaultModuleSpecifier)};

app.setPath('userData', process.env.LEX_VAULT_TEST_USER_DATA!);

void (async () => {
  console.log('[vault-smoke] esperando Electron ready');
  await app.whenReady();
  console.log('[vault-smoke] Electron ready');
  try {
  const first = await createCase('electron_case', 'Original', 'fiscal', '2027-01-01T00:00:00.000Z');
  await saveAnalysis('electron_case', 'analysis_1', { summary: 'analysis-v1' }, 'fiscal');
  await saveDraft('electron_case', 'draft_1', { generatedDoc: 'draft-v1' }, 'fiscal');
  await saveCaseState('electron_case', { fiscalChatHistory: [{ role: 'user', text: 'persistido' }] }, 'fiscal');

  for (let index = 0; index < 1000; index += 1) {
    await createCase('electron_case', 'Autoguardado ' + index, 'fiscal', '2027-01-01T00:00:00.000Z');
  }
  console.log('[vault-smoke] 1000 ciclos completados');

  await saveAnalysis('electron_case', 'analysis_1', { summary: 'analysis-v2' }, 'fiscal');
  await saveDraft('electron_case', 'draft_1', { generatedDoc: 'draft-v2' }, 'fiscal');
  closeDb();

  const reopened = JSON.parse(await exportCase('electron_case', 'fiscal'));
  assert.equal(reopened.metadata.createdAt, first.createdAt);
  assert.equal(reopened.metadata.name, 'Autoguardado 999');
  assert.deepEqual(reopened.analyses, [{ summary: 'analysis-v2' }]);
  assert.deepEqual(reopened.drafts, [{ generatedDoc: 'draft-v2' }]);
  assert.equal(reopened.state.fiscalChatHistory[0].text, 'persistido');

  await saveAnalysis('electron_case', 'analysis_delete', { id: 'analysis_delete', summary: 'eliminar' }, 'fiscal');
  await saveDraft('electron_case', 'draft_delete', { id: 'draft_delete', generatedDoc: 'eliminar' }, 'fiscal');
  await saveCaseState('electron_case', {
    fiscalChatHistory: [{ role: 'user', text: 'persistido' }],
    fiscalAnalysisHistory: [{ id: 'analysis_1' }, { id: 'analysis_delete' }],
    fiscalDraftingHistory: [{ id: 'draft_1' }, { id: 'draft_delete' }],
    fiscalDraftState: { linkedAnalysisId: 'analysis_delete', generatedDoc: 'eliminar' },
  }, 'fiscal');
  assert.equal(await deleteAnalysis('electron_case', 'analysis_delete', 'fiscal'), true);
  assert.equal(await deleteDraft('electron_case', 'draft_delete', 'fiscal'), true);
  assert.equal(await deleteDraft('electron_case', 'missing', 'fiscal'), false);

  const afterArtifactDelete = JSON.parse(await exportCase('electron_case', 'fiscal'));
  assert.deepEqual(afterArtifactDelete.analyses, [{ summary: 'analysis-v2' }]);
  assert.deepEqual(afterArtifactDelete.drafts, [{ generatedDoc: 'draft-v2' }]);
  assert.deepEqual(afterArtifactDelete.state.fiscalAnalysisHistory, [{ id: 'analysis_1' }]);
  assert.deepEqual(afterArtifactDelete.state.fiscalDraftingHistory, [{ id: 'draft_1' }]);
  assert.equal(afterArtifactDelete.state.fiscalDraftState.linkedAnalysisId, undefined);
  assert.equal(afterArtifactDelete.state.fiscalDraftState.generatedDoc, '');

  await renameCase('electron_case', 'Renombrado', 'fiscal');
  await createCase('expired_case', 'Vencida', 'engineering', '2026-01-01T00:00:00.000Z');
  assert.equal(await purgeExpiredCases('2026-07-14T00:00:00.000Z'), 1);
  assert.deepEqual((await listCases()).map(item => item.caseId), ['electron_case']);
  assert.equal(await deleteAllCases(), 1);
  assert.equal((await listCases()).length, 0);

  console.log(JSON.stringify({ status: 'pass', autosaveCycles: 1000, reopened: true, artifactDeletion: true, retention: true }));
  } finally {
    closeDb();
    app.exit(0);
  }
})().catch(error => {
  console.error(error);
  closeDb();
  app.exit(1);
});
`;

try {
  fs.writeFileSync(entryPath, source, 'utf8');
  await build({
    entryPoints: [entryPath],
    outfile: bundlePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron', 'better-sqlite3'],
    logLevel: 'silent',
  });

  const env = { ...process.env, LEX_VAULT_TEST_USER_DATA: userDataPath };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(electronPath, ['--enable-logging', bundlePath], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Electron vault smoke exceeded 30 seconds.'));
    }, 30_000);

    child.stdout.on('data', chunk => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', chunk => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (status, signal) => {
      clearTimeout(timeout);
      resolve({ status, signal, stdout, stderr });
    });
  });

  if (result.status !== 0) {
    throw new Error(`Electron vault smoke failed with exit code ${result.status} (signal: ${result.signal || 'none'})`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
