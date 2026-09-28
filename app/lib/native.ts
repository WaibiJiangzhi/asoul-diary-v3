import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function shareNativeBackup(contents: string, filename: string) {
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const file = await Filesystem.writeFile({
    path: `backups/${filename}`,
    directory: Directory.Cache,
    data: contents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  await Share.share({
    title: '一个魂日记 · 完整备份',
    dialogTitle: '保存或分享完整备份',
    files: [file.uri],
  });
}
