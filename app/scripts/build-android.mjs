import {
  existsSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const tools = resolve('work/android-tools');
const socketDirectory = resolve('work/tmp');
mkdirSync(socketDirectory, { recursive: true });
const javaDir = resolve(tools, 'java');
const sdk = process.env.ANDROID_HOME || resolve(tools, 'sdk');
const java =
  process.env.JAVA_HOME ||
  (existsSync(javaDir) ? resolve(javaDir, readdirSync(javaDir)[0]) : '');
if (!java || !existsSync(sdk))
  throw new Error(
    '需要 JDK 21 和 Android SDK；设置 JAVA_HOME 与 ANDROID_HOME，或参阅 docs/android.md。',
  );
const env = {
  ...process.env,
  JAVA_HOME: java,
  ANDROID_HOME: sdk,
  ANDROID_USER_HOME: resolve(tools, 'user'),
  GRADLE_USER_HOME: resolve(tools, 'gradle'),
  JAVA_TOOL_OPTIONS: `${process.env.JAVA_TOOL_OPTIONS || ''} "-Djdk.net.unixdomain.tmpdir=${socketDirectory}"`,
};
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ['scripts/build-pages.mjs']);
run(process.execPath, [
  'node_modules/@capacitor/cli/bin/capacitor',
  'sync',
  'android',
]);
writeFileSync(
  'android/local.properties',
  `sdk.dir=${sdk.replaceAll('\\', '/')}\n`,
);
const localGradle = resolve(tools, 'gradle-dist/gradle-8.14.3/bin/gradle.bat');
const localDependencies = resolve(tools, 'local-dependencies.gradle');
const gradleArgs = ['assembleDebug', '--no-daemon'];
if (existsSync(localDependencies))
  gradleArgs.push('--init-script', localDependencies);
run(
  process.platform === 'win32' && existsSync(localGradle)
    ? localGradle
    : process.platform === 'win32'
      ? 'gradlew.bat'
      : './gradlew',
  gradleArgs,
  resolve('android'),
);
mkdirSync('outputs/android', { recursive: true });
const target = resolve('outputs/android/asoul-diary-3.0.0-alpha.2.apk');
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', target);
console.log(`\nAndroid test APK: ${target}`);
