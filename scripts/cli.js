import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPTS = {
  1: {
    name: 'Sync Local JSON database',
    description: 'Compares a local new data JSON file with the main database and merges updates.',
    reads: ['new-data.json (default or custom path)', 'public/data.json'],
    modifies: ['public/data.json (on execute)', 'backup/ (creates a backup)'],
    scriptFile: 'sync-novels.js',
    hasCustomPath: true,
    defaultPath: '../new-data.json',
    executeFlag: '--merge'
  },
  2: {
    name: 'Sync AnimeStuff Catalogue (Local)',
    description: 'Imports new novels from a local animeStuff catalogue JSON (ignores existing).',
    reads: ['animestuff-data.json (default or custom path)', 'public/data.json'],
    modifies: ['public/data.json (on execute)', 'backup/ (creates a backup)'],
    scriptFile: 'sync-animestuff.js',
    hasCustomPath: true,
    defaultPath: '../animestuff-data.json',
    executeFlag: '--merge'
  },
  3: {
    name: 'Fetch & Sync AnimeStuff (Remote)',
    description: 'Downloads the latest catalogue from animestuff.me and runs the local import/sync.',
    reads: ['https://animestuff.me/novels.json (remote)', 'public/data.json'],
    modifies: ['animestuff-data.json (local cache)', 'public/data.json (on execute)', 'backup/ (creates a backup)'],
    scriptFile: 'sync-animestuff.js',
    hasCustomPath: false,
    extraArgs: ['--fetch'],
    executeFlag: '--merge'
  },
  4: {
    name: 'Sync EsNovels1 (Remote)',
    description: 'Downloads the latest database from remote EsNovels1 repository and merges updates.',
    reads: ['https://esnovels.github.io/EsNovels1/data.json (remote)', 'public/data.json'],
    modifies: ['public/data.json (on execute)', 'backup/ (creates a backup)'],
    scriptFile: 'sync-novels.js',
    hasCustomPath: false,
    extraArgs: ['https://esnovels.github.io/EsNovels1/data.json'],
    executeFlag: '--merge'
  },
  5: {
    name: 'Database Cleansing & Pruning',
    description: 'Detects duplicates, heals encoding artifacts in titles/synopses, and standardizes tags.',
    reads: ['public/data.json'],
    modifies: ['public/data.json (on execute)', 'backup/ (creates a backup)'],
    scriptFile: 'clean-data.js',
    hasCustomPath: false,
    executeFlag: '--write'
  }
};

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n\x1b[35m==================================================');
    console.log('         📚 NOVEL DATABASE CONTROL PANEL');
    console.log('==================================================\x1b[0m');
    console.log('Select an operation to run:\n');

    for (const [key, script] of Object.entries(SCRIPTS)) {
      console.log(`  \x1b[36m[${key}]\x1b[0m \x1b[1m${script.name}\x1b[0m`);
      console.log(`      \x1b[90mDescription: ${script.description}\x1b[0m`);
      console.log(`      \x1b[90mReads:       ${script.reads.join(', ')}\x1b[0m`);
      console.log(`      \x1b[90mModifies:    ${script.modifies.join(', ')}\x1b[0m\n`);
    }
    console.log(`  \x1b[31m[6]\x1b[0m \x1b[1mExit\x1b[0m\n`);

    const selectionInput = await rl.question('Enter choice (1-6): ');
    const choice = parseInt(selectionInput.trim(), 10);

    if (choice === 6 || isNaN(choice) || choice < 1 || choice > 6) {
      console.log('\x1b[33mExiting...\x1b[0m\n');
      rl.close();
      return;
    }

    const selected = SCRIPTS[choice];
    console.log(`\n\x1b[35m--------------------------------------------------\x1b[0m`);
    console.log(`Selected: \x1b[36m${selected.name}\x1b[0m`);
    console.log(`\x1b[35m--------------------------------------------------\x1b[0m\n`);

    const runArgs = [...(selected.extraArgs || [])];

    // Custom Path handling
    if (selected.hasCustomPath) {
      const defaultResolvedPath = path.resolve(__dirname, selected.defaultPath);
      const relativeDefault = path.relative(process.cwd(), defaultResolvedPath);
      const customPathInput = await rl.question(`Enter path to input JSON file (default: \x1b[32m${relativeDefault}\x1b[0m): `);
      const finalPath = customPathInput.trim() || relativeDefault;
      
      const absolutePath = path.resolve(finalPath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`\x1b[31mError: File does not exist at "${finalPath}"\x1b[0m\n`);
        rl.close();
        return;
      }
      runArgs.push(finalPath);
    }

    // Dry Run vs Execute selection
    console.log('\nSelect execution mode:');
    console.log('  \x1b[32m[1] Dry Run (Preview changes only - SAFE)\x1b[0m');
    console.log(`  \x1b[31m[2] Execute/Merge (Write updates & generate backup)\x1b[0m`);
    const modeInput = await rl.question('\nEnter choice (1-2): ');
    const mode = parseInt(modeInput.trim(), 10);

    if (mode === 2) {
      console.log(`\n\x1b[33m⚠️  Warning: Executing and writing modifications to public/data.json!\x1b[0m`);
      const confirmInput = await rl.question('Are you sure you want to proceed? (y/N): ');
      if (confirmInput.trim().toLowerCase() !== 'y') {
        console.log('\x1b[33mOperation canceled. Exiting.\x1b[0m\n');
        rl.close();
        return;
      }
      runArgs.push(selected.executeFlag);
    } else {
      console.log('\n\x1b[32mRunning in Dry Run (Preview) mode...\x1b[0m\n');
    }

    // Execute the child script
    const scriptPath = path.resolve(__dirname, selected.scriptFile);
    console.log(`Executing: \x1b[36mnode scripts/${selected.scriptFile} ${runArgs.join(' ')}\x1b[0m\n`);

    const spawnResult = spawnSync('node', [scriptPath, ...runArgs], { stdio: 'inherit' });

    if (spawnResult.error) {
      console.error('\x1b[31mError running script:\x1b[0m', spawnResult.error.message);
    } else {
      console.log(`\n\x1b[32mProcess completed with status code: ${spawnResult.status}\x1b[0m\n`);
    }

  } catch (err) {
    console.error('\x1b[31mAn unexpected error occurred:\x1b[0m', err.message);
  } finally {
    rl.close();
  }
}

// Support bypassing menu if flags are passed directly
const directArgs = process.argv.slice(2);
if (directArgs.length > 0) {
  const first = directArgs[0].toLowerCase();
  
  let mapped = null;
  if (first === '--sync' || first === 'sync') mapped = SCRIPTS[1];
  else if (first === '--animestuff' || first === 'animestuff') mapped = SCRIPTS[2];
  else if (first === '--fetch' || first === 'fetch') mapped = SCRIPTS[3];
  else if (first === '--esnovels' || first === 'esnovels') mapped = SCRIPTS[4];
  else if (first === '--clean' || first === 'clean') mapped = SCRIPTS[5];

  if (mapped) {
    const scriptPath = path.resolve(__dirname, mapped.scriptFile);
    const runArgs = [...(mapped.extraArgs || []), ...directArgs.slice(1)];
    console.log(`Executing direct bypass command: \x1b[36mnode scripts/${mapped.scriptFile} ${runArgs.join(' ')}\x1b[0m\n`);
    const spawnResult = spawnSync('node', [scriptPath, ...runArgs], { stdio: 'inherit' });
    process.exit(spawnResult.status);
  } else {
    console.log('\n\x1b[33mDirect Bypass Options:\x1b[0m');
    console.log('  npm run cli -- sync [path] [--merge]');
    console.log('  npm run cli -- animestuff [path] [--merge]');
    console.log('  npm run cli -- fetch [--merge]');
    console.log('  npm run cli -- esnovels [--merge]');
    console.log('  npm run cli -- clean [--write]');
    console.log('\nOr run without arguments for the interactive menu.\n');
    process.exit(0);
  }
} else {
  main();
}
