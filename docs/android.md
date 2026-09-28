# 安卓工程

应用使用 Capacitor 8，将静态页面、壁纸和表情资源打包到 APK；不依赖开发服务器。应用 ID 为 `com.yizhijiangzhi.asouldiary`，名称为「一个魂日记」。Android 7.0（API 24）起可安装，建议使用更新的 Android System WebView。

## 构建

在 `app` 目录执行 `npm run android:apk`。需要 JDK 21、Android SDK Platform 36、Build Tools 36.0.0，并已接受 SDK 许可。设置 `JAVA_HOME` 和 `ANDROID_HOME`；也可使用项目忽略目录 `app/work/android-tools` 内的本机工具。

脚本执行静态构建、Capacitor 同步和 Gradle `assembleDebug`，生成 `app/outputs/android/asoul-diary-3.0.0.apk`。这是调试签名验证包，不是应用商店发布包；网页正式版本命名不改变 APK 的签名性质。后续覆盖安装需要保持签名和应用 ID 一致；不要删除本机调试签名。面向应用商店分发前应配置独立发布签名，并规划原调试包用户的数据迁移。

`npm run android:sync` 更新安卓工程中的网页资源；`npm run android:open` 用已安装的 Android Studio 打开工程。原有 Pages、Workers 构建继续保留。

## 本机数据与设备验证

安卓 WebView 使用应用私有 IndexedDB，与手机浏览器数据隔离。首次使用可在原浏览器导出完整 JSON 备份，再从 App 设置恢复，包含已保存的照片。卸载或清除应用数据仍会丢失本机记录；系统自动备份关闭，数据由用户显式导出。

原生导出使用系统分享面板，请将 JSON 保存到应用外或发送给自己；打开分享面板不代表已经完成外部备份。导入和照片选择使用系统文件选择器。APK 内禁用网页 Service Worker 更新，更新通过覆盖安装新版 APK 完成。

真机验收：首次离线打开、记录及草稿刷新恢复、键盘和表情盘确认、返回键收起面板、照片选择与重启后显示、完整备份导出再导入、同签名覆盖安装后数据保留。
