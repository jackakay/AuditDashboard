Package: brotli[core]:x86-windows -> 1.0.9#5

**Host Environment**

- Host: x64-windows
- Compiler: MSVC 19.36.32532.0
-    vcpkg-tool version: 2023-03-29-664f8bb619b752430368d0f30a8289b761f5caba
    vcpkg-readonly: true
    vcpkg-scripts version: 84df5613f71eda8a73ab08dc3041f3af7103a5b2

**To Reproduce**

`vcpkg install `

**Failure logs**

```
-- Downloading https://github.com/google/brotli/archive/e61745a6b7add50d380cfd7d3883dd6c62fc2c71.tar.gz -> google-brotli-e61745a6b7add50d380cfd7d3883dd6c62fc2c71.tar.gz...
-- Extracting source C:/Users/jackk/AppData/Local/vcpkg/downloads/google-brotli-e61745a6b7add50d380cfd7d3883dd6c62fc2c71.tar.gz
-- Applying patch install.patch
-- Applying patch fix-arm-uwp.patch
-- Applying patch pkgconfig.patch
-- Using source at E:/______audits/Route/Route/Route/vcpkg_installed/vcpkg/blds/brotli/src/6c62fc2c71-3fc02d8e7f.clean
-- Found external ninja('1.11.0').
-- Configuring x86-windows
-- Building x86-windows-dbg
-- Building x86-windows-rel
-- Fixing pkgconfig file: E:/______audits/Route/Route/Route/vcpkg_installed/vcpkg/pkgs/brotli_x86-windows/lib/pkgconfig/libbrotlicommon.pc
-- Fixing pkgconfig file: E:/______audits/Route/Route/Route/vcpkg_installed/vcpkg/pkgs/brotli_x86-windows/lib/pkgconfig/libbrotlidec.pc
-- Fixing pkgconfig file: E:/______audits/Route/Route/Route/vcpkg_installed/vcpkg/pkgs/brotli_x86-windows/lib/pkgconfig/libbrotlienc.pc
-- Downloading https://repo.msys2.org/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://www2.futureware.at/~nickoe/msys2-mirror/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirror.yandex.ru/mirrors/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirrors.ustc.edu.cn/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirror.selfnet.de/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst;https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/i686/mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst -> msys-mingw-w64-i686-pkg-config-0.29.2-3-any.pkg.tar.zst...
-- Downloading https://repo.msys2.org/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://www2.futureware.at/~nickoe/msys2-mirror/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirror.yandex.ru/mirrors/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirrors.ustc.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirror.selfnet.de/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst;https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst -> msys-mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst...
[DEBUG] To include the environment variables in debug output, pass --debug-env
[DEBUG] Trying to load bundleconfig from C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\vcpkg\vcpkg-bundle.json
[DEBUG] Bundle config: readonly=true, usegitregistry=true, embeddedsha=84df5613f71eda8a73ab08dc3041f3af7103a5b2, deployment=VisualStudio, vsversion=17.0
[DEBUG] VS telemetry opted in at SOFTWARE\Microsoft\VSCommon\17.0\SQM\\OptIn
[DEBUG] Metrics enabled.
[DEBUG] Feature flag 'binarycaching' unset
[DEBUG] Feature flag 'compilertracking' unset
[DEBUG] Feature flag 'registries' unset
[DEBUG] Feature flag 'versions' unset
Downloading https://repo.msys2.org/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://www2.futureware.at/~nickoe/msys2-mirror/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://mirror.yandex.ru/mirrors/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://mirrors.ustc.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
warning: Download failed -- retrying after 1000ms
warning: Download failed -- retrying after 2000ms
warning: Download failed -- retrying after 4000ms
Downloading https://mirror.selfnet.de/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
Downloading https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst
error: Failed to download from mirror set
error: https://repo.msys2.org/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://www2.futureware.at/~nickoe/msys2-mirror/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://mirror.yandex.ru/mirrors/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://mirrors.ustc.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: WinHttpSendRequest failed with exit code 12007
error: https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: WinHttpSendRequest failed with exit code 12007
error: https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: WinHttpSendRequest failed with exit code 12007
error: https://mirror.bit.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: WinHttpSendRequest failed with exit code 12007
error: https://mirror.selfnet.de/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
error: https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/i686/mingw-w64-i686-libwinpthread-git-9.0.0.6373.5be8fcd83-1-any.pkg.tar.zst: failed: status code 404
[DEBUG] D:\a\_work\1\s\src\vcpkg\base\downloads.cpp(961): 
[DEBUG] Time in subprocesses: 0us
[DEBUG] Time in parsing JSON: 19us
[DEBUG] Time in JSON reader: 0us
[DEBUG] Time in filesystem: 21997us
[DEBUG] Time in loading ports: 0us
[DEBUG] Exiting after 21 s (20915443us)

CMake Error at scripts/cmake/vcpkg_download_distfile.cmake:32 (message):
      
      Failed to download file with error: 1
      If you are using a proxy, please check your proxy setting. Possible causes are:
      
      1. You are actually using an HTTP proxy, but setting HTTPS_PROXY variable
         to `https://address:port`. This is not correct, because `https://` prefix
         claims the proxy is an HTTPS proxy, while your proxy (v2ray, shadowsocksr
         , etc..) is an HTTP proxy. Try setting `http://address:port` to both
         HTTP_PROXY and HTTPS_PROXY instead.
      
      2. If you are using Windows, vcpkg will automatically use your Windows IE Proxy Settings
         set by your proxy software. See https://github.com/microsoft/vcpkg-tool/pull/77
         The value set by your proxy might be wrong, or have same `https://` prefix issue.
      
      3. Your proxy's remote server is out of service.
      
      If you've tried directly download the link, and believe this is not a temporary
      download server failure, please submit an issue at https://github.com/Microsoft/vcpkg/issues
      to report this upstream download server failure.
      

Call Stack (most recent call first):
  scripts/cmake/vcpkg_download_distfile.cmake:270 (z_vcpkg_download_distfile_show_proxy_and_fail)
  scripts/cmake/vcpkg_acquire_msys.cmake:26 (vcpkg_download_distfile)
  scripts/cmake/vcpkg_acquire_msys.cmake:124 (z_vcpkg_acquire_msys_download_package)
  scripts/cmake/vcpkg_find_acquire_program.cmake:533 (vcpkg_acquire_msys)
  scripts/cmake/vcpkg_fixup_pkgconfig.cmake:203 (vcpkg_find_acquire_program)
  C:/Users/jackk/AppData/Local/vcpkg/registries/git-trees/32ea6c4b0d18fa3172ad52147599983acc71d748/portfile.cmake:22 (vcpkg_fixup_pkgconfig)
  scripts/ports.cmake:147 (include)



```


**Additional context**

<details><summary>vcpkg.json</summary>

```
{
  "dependencies": [
    "cpp-httplib",
    "openssl",
    "nlohmann-json"
  ],
  "builtin-baseline": "84df5613f71eda8a73ab08dc3041f3af7103a5b2"
}

```
</details>
