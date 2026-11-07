# 将本前端工程部署到 Nginx（详细教程）

> 适用环境：本机 Ubuntu 24.04 + Nginx 1.24.0 + Node 20.20.2。
> 目标：把本仓库 `dist/` 部署到 `http://192.168.232.128/`，**只部署前端静态站点**，暂不接 Spring Boot。
> 所有命令都可以直接复制执行。
>
> 如果部署后访问到的仍然是 `Welcome to nginx!`，直接看[第 15 节](#15-本次部署排障总结2026-11-05)。

---

## 目录

1. [快速开始（TL;DR）](#1-快速开始tldr)
2. [当前环境与部署原理](#2-当前环境与部署原理)
3. [第一步：构建前端](#3-第一步构建前端)
4. [第二步：把文件放到 Nginx 目录](#4-第二步把文件放到-nginx-目录)
5. [第三步：编写 Nginx 站点配置](#5-第三步编写-nginx-站点配置)
6. [第四步：启用站点并重载](#6-第四步启用站点并重载)
7. [第五步：验证部署结果](#7-第五步验证部署结果)
8. [第六步：浏览器访问与网络检查](#8-第六步浏览器访问与网络检查)
9. [日常更新发布](#9-日常更新发布)
10. [进阶：原子发布与快速回滚](#10-进阶原子发布与快速回滚)
11. [查看日志与排错](#11-查看日志与排错)
12. [常见问题](#12-常见问题)
13. [卸载 / 恢复默认站点](#13-卸载--恢复默认站点)
14. [附录](#14-附录)
15. [本次部署排障总结（2026-11-05）](#15-本次部署排障总结2026-11-05)

---

## 1. 快速开始（TL;DR）

如果只想先跑通，按顺序执行下面几段即可，详细解释在后面章节。

```bash
# 1. 构建
cd /home/gyh/code/learn-book/learn-book-front
npm ci
npm run build

# 2. 复制到 Nginx 目录
sudo mkdir -p /var/www/learn-book
sudo rsync -a --delete dist/ /var/www/learn-book/
sudo chown -R root:root /var/www/learn-book
sudo find /var/www/learn-book -type d -exec chmod 755 {} +
sudo find /var/www/learn-book -type f -exec chmod 644 {} +

# 3. 写入站点配置（内容见第 5 节）
sudo nano /etc/nginx/sites-available/learn-book.conf

# 4. 启用并重载
sudo ln -sf /etc/nginx/sites-available/learn-book.conf /etc/nginx/sites-enabled/learn-book.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 5. 验证
curl -I http://127.0.0.1/
```

浏览器打开：`http://192.168.232.128/`

---

## 2. 当前环境与部署原理

### 2.1 本机现状

| 项目 | 当前值 | 说明 |
| --- | --- | --- |
| 操作系统 | Ubuntu 24.04 | 使用 `sites-available` / `sites-enabled` |
| Nginx | 1.24.0（已安装、已启动、开机自启） | 已在监听 80 端口 |
| Nginx 运行用户 | `www-data` | 需要能读取站点文件 |
| 默认站点 | `/etc/nginx/sites-available/default` 已启用 | `root /var/www/html`，声明了 `default_server` |
| Node / npm | v20.20.2 / 10.8.2 | 满足 Vite 5 要求 |
| 前端产物 | `dist/` 已存在 | `index.html` 引用 `/assets/...` |
| 当前用户 | `gyh`（属于 `sudo` 组） | 修改系统目录需要 `sudo` |
| 家目录权限 | `/home/gyh` 是 `drwxr-x---` | **`www-data` 进不去** |
| 后端 | `../backend`，端口 8080，当前未启动 | 本教程暂不接入 |
| 访问地址 | `192.168.232.128` | 以 `hostname -I` 为准 |

### 2.2 为什么不能直接把 Nginx 指向工程目录

```bash
stat -c '%A %U:%G %n' /home/gyh
# drwxr-x--- gyh gyh /home/gyh
```

`/home/gyh` 只有属主 `gyh` 和同组用户能进入，`www-data` 不在这个组里，访问 `/home/gyh/...` 会得到 **403 Forbidden**。

所以正确做法是：把构建产物复制到一个 Nginx 能读的目录，例如 `/var/www/learn-book`，并把根目录权限设为 `755`、文件设为 `644`。

### 2.3 请求链路

```text
浏览器
  │  http://192.168.232.128/
  ▼
Nginx（www-data，监听 80）
  │
  ├── /                 → /var/www/learn-book/index.html
  ├── /assets/*.js|css  → /var/www/learn-book/assets/*（长缓存）
  ├── /favicon.svg      → /var/www/learn-book/favicon.svg
  └── /notes、/settings → 找不到文件，回退到 index.html（SPA 路由）
```

### 2.4 本项目的两个关键特性

1. **SPA 路由**：`/notes`、`/settings` 这些路径在服务器上没有对应文件，刷新时会 404。必须用 `try_files $uri $uri/ /index.html;` 回退。
2. **绝对资源路径**：`dist/index.html` 里写的是 `/assets/index-xxx.js`，以 `/` 开头。因此必须部署在**域名/IP 根路径**，不能直接放到 `/learn-book/` 子目录，否则资源会 404。

---

## 3. 第一步：构建前端

进入工程目录：

```bash
cd /home/gyh/code/learn-book/learn-book-front
```

确认 Node 环境：

```bash
node -v    # 期望 v20.x
npm -v     # 期望 10.x
```

安装依赖并构建：

```bash
npm ci
npm run build
```

说明：

- `npm ci` 会严格按 `package-lock.json` 安装，比 `npm install` 更适合部署。
- `npm run build` 实际执行 `vue-tsc --noEmit && vite build`，会先做 TypeScript 类型检查。
- 类型检查失败会直接中断，先修代码再部署。

检查产物：

```bash
ls -la dist
ls dist/assets | head
```

正常应看到：

```text
dist/
├── assets/
│   ├── index-xxxxxxxx.js
│   ├── index-xxxxxxxx.css
│   └── ...
├── favicon.svg
└── index.html
```

> 每次构建后文件名里的 hash 会变化，这是正常的，也是长缓存的基础。

---

## 4. 第二步：把文件放到 Nginx 目录

创建目录：

```bash
sudo mkdir -p /var/www/learn-book
```

复制文件（推荐 `rsync`，会删除目标里多余的旧文件）：

```bash
sudo rsync -a --delete dist/ /var/www/learn-book/
```

如果机器上没有 `rsync`，可以改用：

```bash
sudo rm -rf /var/www/learn-book/*
sudo cp -r dist/. /var/www/learn-book/
```

修正属主和权限：

```bash
sudo chown -R root:root /var/www/learn-book
sudo find /var/www/learn-book -type d -exec chmod 755 {} +
sudo find /var/www/learn-book -type f -exec chmod 644 {} +
```

为什么要这样：

- 文件属主设为 `root`，避免普通用户误改线上文件。
- 目录 `755`：`www-data` 能进入和读取。
- 文件 `644`：`www-data` 能读取，不能写入。
- 不要把权限开成 `777`，没有必要且有安全风险。

检查结果：

```bash
ls -la /var/www/learn-book
ls -la /var/www/learn-book/assets | head
```

确认 `index.html`、`favicon.svg`、`assets/` 都在。

### 4.1 `www-data` 是什么

`www-data` 是 Debian/Ubuntu 软件包创建的一个**系统用户/用户组**，专门用来运行 Web 服务器的工作进程（Nginx、Apache 都常用它）。

`/etc/nginx/nginx.conf` 第一行：

```nginx
user www-data;
```

含义：

```text
root 启动 master 进程（为了绑定 80/443 等特权端口）
        │
        └── fork 出 worker 进程，降权为 www-data 运行
```

也就是说：**Nginx 真正处理请求的进程不是 root，而是 `www-data`**。这样即使 Web 服务被攻破，攻击者也只有 `www-data` 的权限，不能随意修改系统文件。

| 项目 | 说明 |
| --- | --- |
| 类型 | 系统用户，通常不能登录（shell 是 `nologin`） |
| 密码 | 没有可用密码 |
| 用途 | 运行 Web 服务进程，遵循最小权限原则 |
| 发行版差异 | Ubuntu/Debian 是 `www-data`；CentOS/RHEL 的 Nginx 常用 `nginx` |
| 同组 | Apache 也常以 `www-data` 运行 |

查看当前情况：

```bash
id www-data
getent passwd www-data
ps -o user=,pid=,cmd= -C nginx
```

通常会看到 master 是 `root`，worker 是 `www-data`。

这对部署有直接影响：

1. **站点文件必须对 `www-data` 可读**，否则返回 403。
2. **要经过的每一级目录都要有执行（`x`）权限**。例如 `/home/gyh` 是 `drwxr-x---`，`www-data` 不在组里就会被挡住——这正是第 15 节 403 问题的根源。
3. **上传目录**如果要写，需要把属主/权限给到 `www-data`，但不要图省事设成 `777`。
4. **不要用 root 运行 worker**，也不要把站点目录交给普通用户随便写。

验证某个路径 `www-data` 能不能读：

```bash
sudo -u www-data test -r /var/www/learn-book/index.html && echo "可读" || echo "不可读"
```

一句话：`www-data` 是 Web 服务器的**低权限运行账号**；master 用 root 启停和绑端口，worker 用 `www-data` 处理请求，所以网站文件必须让 `www-data` 能读到。

---

## 5. 第三步：编写 Nginx 站点配置

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/learn-book.conf
```

写入以下内容：

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    charset utf-8;

    root  /var/www/learn-book;
    index index.html;

    access_log /var/log/nginx/learn-book.access.log;
    error_log  /var/log/nginx/learn-book.error.log warn;

    # gzip：Ubuntu 默认只压缩 HTML，这里补上常见文本类型
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/xml
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # 带 hash 的静态资源：长缓存
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 图标：缓存 7 天
    location = /favicon.svg {
        expires 7d;
        access_log off;
    }

    # 入口 HTML：不缓存，保证发版立即生效
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires -1;
    }

    # SPA 路由回退：文件不存在时返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.1 配置逐行解释

| 配置 | 作用 |
| --- | --- |
| `listen 80 default_server;` | 监听 IPv4 80，并作为默认站点 |
| `listen [::]:80 default_server;` | 监听 IPv6 80 |
| `server_name _;` | 匹配任意域名/IP |
| `charset utf-8;` | 避免中文乱码 |
| `root /var/www/learn-book;` | 站点根目录 |
| `index index.html;` | 目录请求默认返回 `index.html` |
| `access_log ...` | 该站点独立访问日志 |
| `error_log ... warn;` | 错误日志，级别 `warn` |
| `gzip ...` | 开启压缩并指定类型 |
| `location /assets/` | 匹配构建产物 |
| `try_files $uri =404;` | 资源不存在就返回 404，**不要**回退到 HTML |
| `expires 1y;` | 浏览器缓存 1 年 |
| `add_header Cache-Control "public, immutable";` | 告诉浏览器内容不会变，可放心长缓存 |
| `access_log off;` | 静态资源不记访问日志，减少日志量 |
| `location = /index.html` | 精确匹配入口文件 |
| `Cache-Control no-cache...` | 入口文件不缓存，发版后立即拿到新 HTML |
| `location /` | 其他所有请求 |
| `try_files $uri $uri/ /index.html;` | 文件 → 目录 → 回退入口，实现 SPA 路由 |

### 5.2 关于 `default_server` 冲突

本机默认站点 `/etc/nginx/sites-enabled/default` 已经写了 `listen 80 default_server;`。如果新配置也写 `default_server`，`nginx -t` 会报：

```text
duplicate default server
```

处理方式二选一：

**方式 A（推荐）：停用默认站点**，新站点作为唯一入口。

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

**方式 B：保留默认站点**，新站点只绑定本机 IP：

```nginx
# 去掉 default_server，改成：
listen 80;
listen [::]:80;
server_name 192.168.232.128 localhost;
```

这样访问 `http://192.168.232.128/` 会命中新站点，其他未匹配的 Host 仍走默认站点。

> 本教程后续按方式 A 继续。

---

## 6. 第四步：启用站点并重载

创建软链接：

```bash
sudo ln -sf /etc/nginx/sites-available/learn-book.conf /etc/nginx/sites-enabled/learn-book.conf
```

停用默认站点（如果第 5.2 节选择了方式 A）：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

检查配置：

```bash
sudo nginx -t
```

期望输出：

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

平滑重载：

```bash
sudo systemctl reload nginx
```

确认状态：

```bash
systemctl status nginx --no-pager
```

> 只改静态文件时不需要 reload；改了 `nginx.conf` 或站点配置才需要 reload。

### 6.1 补充：`ln -sf` 这条命令的作用

```bash
sudo ln -sf /etc/nginx/sites-available/learn-book.conf /etc/nginx/sites-enabled/learn-book.conf
```

这一步是**启用站点**：在 `sites-enabled` 里创建一个指向 `sites-available` 配置文件的软链接。

| 部分 | 含义 |
| --- | --- |
| `ln -s` | 创建符号链接（快捷方式），不是复制文件 |
| `-f` | 如果链接已存在，强制覆盖，保证命令可重复执行 |
| 源文件 | `/etc/nginx/sites-available/learn-book.conf`（真正的配置） |
| 链接文件 | `/etc/nginx/sites-enabled/learn-book.conf`（被 Nginx 加载的入口） |

执行后的结构：

```text
/etc/nginx/sites-available/learn-book.conf   ← 实际配置在这里
/etc/nginx/sites-enabled/learn-book.conf  ->  ../sites-available/learn-book.conf
```

为什么需要这一步：`/etc/nginx/nginx.conf` 里有

```nginx
include /etc/nginx/sites-enabled/*;
```

Nginx **只加载 `sites-enabled` 目录里的文件**。`sites-available` 只是“配置仓库”，放所有可用配置；`sites-enabled` 是“开关”，放软链。这样启用/停用站点只需增删软链，不用改配置内容：

```bash
# 启用
sudo ln -sf /etc/nginx/sites-available/learn-book.conf /etc/nginx/sites-enabled/

# 停用
sudo rm -f /etc/nginx/sites-enabled/learn-book.conf
```

注意事项：

- 它**不会**检查配置语法，也不会 reload；之后仍要 `sudo nginx -t && sudo systemctl reload nginx`。
- 如果源文件不存在，会创建一个**悬空软链**——这正是第 15 节里 `nginx -t` 报 `No such file or directory` 的原因。
- 修改 `sites-available` 的源文件后，因为软链指向它，效果会同步；不需要重新执行 `ln`。
- 验证：`ls -la /etc/nginx/sites-enabled/` 或 `readlink /etc/nginx/sites-enabled/learn-book.conf`。

---

## 7. 第五步：验证部署结果

### 7.1 首页

```bash
curl -I http://127.0.0.1/
```

期望：

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

### 7.2 入口文件缓存头

```bash
curl -I http://127.0.0.1/index.html
```

期望包含：

```text
Cache-Control: no-cache, no-store, must-revalidate
```

### 7.3 静态资源与长缓存

先取一个实际构建出来的 JS 文件名：

```bash
ASSET=$(ls /var/www/learn-book/assets/index-*.js | head -n1 | xargs basename)
echo "$ASSET"
curl -I "http://127.0.0.1/assets/$ASSET"
```

期望包含：

```text
HTTP/1.1 200 OK
Cache-Control: public, immutable
Expires: ...
```

### 7.4 SPA 路由回退

```bash
curl -I http://127.0.0.1/notes
curl -I http://127.0.0.1/settings
```

两者都应返回 `200` 且 `Content-Type: text/html`，因为服务器上没有这些路径，由 `index.html` 接管。

### 7.5 不存在的静态资源应 404

```bash
curl -I http://127.0.0.1/assets/not-exist.js
```

期望：

```text
HTTP/1.1 404 Not Found
```

如果这里返回 `200`，说明 `/assets/` 的 `try_files $uri =404;` 写错或没生效。

### 7.6 图标

```bash
curl -I http://127.0.0.1/favicon.svg
```

期望 `200`，`Content-Type: image/svg+xml`。

### 7.7 一条命令汇总检查

```bash
for p in / /index.html /notes /favicon.svg; do
  printf '%-16s ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "http://127.0.0.1$p"
done
```

期望大致为：

```text
/                200 text/html
/index.html      200 text/html
/notes           200 text/html
/favicon.svg     200 image/svg+xml
```

---

## 8. 第六步：浏览器访问与网络检查

在宿主机浏览器打开：

```text
http://192.168.232.128/
```

如果打不开，按顺序检查。

### 8.1 确认 IP

```bash
hostname -I
```

IP 可能变化，以实际输出为准。

### 8.2 确认 Nginx 在监听

```bash
ss -lntp | grep ':80'
```

应看到 `0.0.0.0:80` 和 `[::]:80`。

### 8.3 确认本机 curl 能通

```bash
curl -I http://127.0.0.1/
```

本机能通、外部不能通，通常是防火墙或虚拟机网络问题。

### 8.4 检查防火墙

```bash
sudo ufw status
```

如果防火墙启用且没有放行 80：

```bash
sudo ufw allow 80/tcp
```

### 8.5 检查虚拟机网络

- 确认虚拟机网络是 NAT / 桥接，且宿主机能 ping 到 `192.168.232.128`。
- 如果在云主机上，还要检查安全组是否放行 80。

### 8.6 检查错误日志

```bash
sudo tail -f /var/log/nginx/learn-book.error.log
```

同时观察访问日志，确认请求是否到达：

```bash
sudo tail -f /var/log/nginx/learn-book.access.log
```

访问日志有记录说明请求到了 Nginx；没有记录说明是网络/防火墙问题。

---

## 9. 日常更新发布

改完代码后，最简单的发布流程：

```bash
cd /home/gyh/code/learn-book/learn-book-front

# 1. 构建
npm run build

# 2. 覆盖到 Nginx 目录
sudo rsync -a --delete dist/ /var/www/learn-book/
sudo chown -R root:root /var/www/learn-book
sudo find /var/www/learn-book -type d -exec chmod 755 {} +
sudo find /var/www/learn-book -type f -exec chmod 644 {} +

# 3. 验证
curl -I http://127.0.0.1/
```

注意：

- **不需要** `systemctl reload nginx`，因为只换了静态文件。
- 浏览器可能缓存旧页面，强制刷新：`Ctrl + F5` / `Cmd + Shift + R`。
- 本次构建的 `assets` 文件名带了新 hash，旧资源即使被缓存也不影响新版本。

可保存成脚本 `deploy-frontend.sh`（放在工程根目录或任意位置）：

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC="/home/gyh/code/learn-book/learn-book-front"
DEST="/var/www/learn-book"

cd "$SRC"
npm ci
npm run build

sudo rsync -a --delete "$SRC/dist/" "$DEST/"
sudo chown -R root:root "$DEST"
sudo find "$DEST" -type d -exec chmod 755 {} +
sudo find "$DEST" -type f -exec chmod 644 {} +

echo "部署完成：http://192.168.232.128/"
```

```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

---

## 10. 进阶：原子发布与快速回滚

上面的方式会直接覆盖线上文件，发布瞬间可能出现“新旧资源混合”。更稳的做法是按版本存放，再用软链接切换。

### 10.1 目录结构

```text
/var/www/learn-book/
├── releases/
│   ├── 20261103-153000/
│   └── 20261103-161500/
└── current -> releases/20261103-161500
```

### 10.2 修改 Nginx 根目录

把站点配置里的：

```nginx
root /var/www/learn-book;
```

改成：

```nginx
root /var/www/learn-book/current;
```

然后重载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 10.3 发布脚本

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC="/home/gyh/code/learn-book/learn-book-front"
ROOT="/var/www/learn-book"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$ROOT/releases/$STAMP"

cd "$SRC"
npm ci
npm run build

sudo mkdir -p "$DEST"
sudo rsync -a --delete "$SRC/dist/" "$DEST/"
sudo chown -R root:root "$DEST"
sudo find "$DEST" -type d -exec chmod 755 {} +
sudo find "$DEST" -type f -exec chmod 644 {} +

# 原子切换
sudo ln -sfn "$DEST" "$ROOT/current"

# 只保留最近 5 个版本
ls -1dt "$ROOT"/releases/* | tail -n +6 | xargs -r sudo rm -rf

echo "已发布：$DEST"
```

### 10.4 回滚

回滚就是把 `current` 指回上一个版本：

```bash
ls -1dt /var/www/learn-book/releases/*
sudo ln -sfn /var/www/learn-book/releases/<上一个版本> /var/www/learn-book/current
```

因为 `current` 是软链接，切换后立即生效，不需要 reload Nginx。

---

## 11. 查看日志与排错

站点日志：

```bash
sudo tail -f /var/log/nginx/learn-book.access.log
sudo tail -f /var/log/nginx/learn-book.error.log
```

Nginx 全局日志：

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

排查命令：

```bash
sudo nginx -t                    # 配置语法
sudo nginx -T                    # 打印实际生效的完整配置
systemctl status nginx --no-pager
ss -lntp | grep ':80'
curl -I http://127.0.0.1/
```

常用手段：

- 用 `nginx -T` 确认 `root` 到底指向哪里、站点是否真的被加载。
- 访问日志有记录但返回 403/404，说明请求到了 Nginx，问题在文件路径或权限。
- 访问日志没有记录，说明请求没到 Nginx，查网络、防火墙、端口。

---

## 12. 常见问题

### 12.1 403 Forbidden

可能原因：

1. `root` 指向了 `/home/gyh/...`，`www-data` 没有权限进入。
2. 文件权限不对，`www-data` 读不到。
3. 目录里没有 `index.html`。

检查：

```bash
sudo nginx -T | grep -n 'root '
ls -ld /home/gyh /var/www/learn-book
ls -la /var/www/learn-book
```

处理：按第 4 节复制到 `/var/www/learn-book` 并修正权限。

### 12.2 页面能开但白屏，静态资源 404

检查 `dist/index.html` 里资源路径：

```bash
grep -n 'assets' dist/index.html
```

如果是 `/assets/...`，站点必须部署在根路径。若确实要部署到子路径，需要在 `vite.config.ts` 设置 `base` 并重新构建，同时调整 Nginx `location`。

### 12.3 刷新 `/notes` 或 `/settings` 变 404

缺少 SPA 回退。确认配置里有：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 12.4 `duplicate default server`

默认站点和新站点都写了 `default_server`。执行：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

或按第 5.2 节方式 B 去掉新站点的 `default_server`。

### 12.5 `bind() to 0.0.0.0:80 failed (98: Address already in use)`

80 端口被占用：

```bash
sudo ss -lntp | grep ':80'
```

可能是 Nginx 已经在跑（正常）、Apache、或其他进程。先确认是谁占用。

### 12.6 改了配置不生效

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo nginx -T | grep -n 'learn-book'
```

确认新站点文件在 `sites-enabled` 里，且没有命中另一个 `server` 块。

### 12.7 中文乱码

确认配置里有：

```nginx
charset utf-8;
```

并且 `index.html` 里是 `<meta charset="UTF-8" />`。

### 12.8 浏览器访问是旧页面

- 强制刷新。
- 确认 `index.html` 返回 `Cache-Control: no-cache`。
- 确认发布到了正确的目录（尤其用了 `releases/current` 时，看软链接指向）。

### 12.9 首页正常，但 JS/CSS 返回 404

```bash
ls /var/www/learn-book/assets | head
curl -I http://127.0.0.1/assets/<实际文件名>
```

多半是复制不完整，或 `root` 指错。

### 12.10 `Permission denied` 写配置或复制文件

需要使用 `sudo`。当前用户 `gyh` 在 `sudo` 组，但执行时仍要加 `sudo`。

---

## 13. 卸载 / 恢复默认站点

停用本教程的站点：

```bash
sudo rm -f /etc/nginx/sites-enabled/learn-book.conf
sudo nginx -t && sudo systemctl reload nginx
```

恢复 Ubuntu 默认站点：

```bash
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

删除部署文件：

```bash
sudo rm -rf /var/www/learn-book
```

---

## 14. 附录

### 14.1 命令速查

| 命令 | 作用 |
| --- | --- |
| `npm ci` | 按 lockfile 安装依赖 |
| `npm run build` | 类型检查 + 构建到 `dist/` |
| `sudo rsync -a --delete dist/ /var/www/learn-book/` | 同步产物（删除多余旧文件） |
| `sudo nginx -t` | 检查配置 |
| `sudo nginx -T` | 打印实际生效配置 |
| `sudo systemctl reload nginx` | 平滑重载 |
| `sudo systemctl restart nginx` | 重启（会断连接，尽量不用） |
| `curl -I http://127.0.0.1/` | 查看响应头 |
| `sudo tail -f /var/log/nginx/learn-book.error.log` | 看站点错误日志 |
| `ss -lntp \| grep ':80'` | 查看 80 端口监听 |
| `hostname -I` | 查看本机 IP |
| `sudo ufw status` | 查看防火墙 |

### 14.2 文件位置速查

| 内容 | 路径 |
| --- | --- |
| 工程目录 | `/home/gyh/code/learn-book/learn-book-front` |
| 构建产物 | `/home/gyh/code/learn-book/learn-book-front/dist` |
| 部署目录 | `/var/www/learn-book` |
| 站点配置 | `/etc/nginx/sites-available/learn-book.conf` |
| 启用软链 | `/etc/nginx/sites-enabled/learn-book.conf` |
| 访问日志 | `/var/log/nginx/learn-book.access.log` |
| 错误日志 | `/var/log/nginx/learn-book.error.log` |
| Nginx 主配置 | `/etc/nginx/nginx.conf` |

### 14.3 后续接入 Spring Boot

本教程只部署前端。等后端启动后（`server.port: 8080`），在站点配置里加：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

这样浏览器访问的仍然是 `http://192.168.232.128/api/...`，与前端同域，不需要处理 CORS。

### 14.4 生产环境提醒

当前是 `IP + HTTP`，适合本机/内网验证。正式环境至少补上：

- HTTPS（本机 Nginx 1.24 使用 `listen 443 ssl http2;`）。
- 安全响应头（`X-Content-Type-Options`、`X-Frame-Options` 等）。
- 访问控制 / 限流。
- 日志轮转与监控。
- 禁止直接暴露后端 8080 端口。

---

## 15. 本次部署排障总结（2026-11-05）

> 本节记录本机实际部署时踩的坑，作为排查参考。快照时间：2026-11-05 16:00 左右。

### 15.1 一句话结论

部署**没有生效**，问题不在 Nginx 配置内容，而是两件事叠加：

1. `/etc/nginx/sites-enabled/default` 是**悬空软链**，导致 `nginx -t` 失败，配置无法 reload。
2. `root` 指向 `/home/gyh/project/learn-book`，而 `/home/gyh` 是 `750`，`www-data` 无法进入；即使 reload 成功也会变成 403。

### 15.2 当前实际状态（排障时快照）

| 项目 | 状态 |
| --- | --- |
| Nginx 进程 | 正在运行，但加载的是 15:36 的旧配置 |
| `sudo nginx -t` | 失败：`sites-enabled/default` 目标不存在 |
| `sites-available/default` | 已被删除 |
| `sites-enabled/default` | 悬空软链仍在（未删除） |
| `learn-book.conf` | 已存在，`root /home/gyh/project/learn-book` |
| `/home/gyh` 权限 | `drwxr-x---`，`www-data` 无法穿过 |
| `/var/www/learn-book` | 不存在 |
| 实际访问 `/` | 返回 Ubuntu 默认页 `Welcome to nginx!`（615 字节） |
| `/notes`、`/assets/*` | 404 |
| `learn-book.*.log` | 不存在，说明站点从未加载 |

### 15.3 关键证据

```bash
ls -la /etc/nginx/sites-enabled/
# default -> /etc/nginx/sites-available/default   （目标已不存在）

sudo nginx -t
# [emerg] open() "/etc/nginx/sites-enabled/default" failed
#         (2: No such file or directory) in /etc/nginx/nginx.conf:60
# nginx: configuration file /etc/nginx/nginx.conf test failed

curl -s http://127.0.0.1/ | head -3
# <title>Welcome to nginx!</title>

curl -sI http://127.0.0.1/notes | head -1
# HTTP/1.1 404 Not Found

ls /var/log/nginx/learn-book.*.log
# No such file or directory
```

### 15.4 根因分析

**根因 1：悬空软链**

`/etc/nginx/sites-available/default` 被删除，但 `/etc/nginx/sites-enabled/default` 还指向它。`/etc/nginx/nginx.conf:60` 的 `include /etc/nginx/sites-enabled/*;` 会尝试打开这个链接，目标不存在就报 `ENOENT`。

> 注意：删的是 `sites-available` 里的源文件，而不是 `sites-enabled` 里的软链。

**根因 2：root 路径不可访问**

```text
/home/gyh                 drwxr-x---  gyh:gyh   ← www-data 无法进入
/home/gyh/project         drwxr-xr-x  root:root
/home/gyh/project/learn-book  drwxr-xr-x  gyh:gyh
```

Nginx worker 以 `www-data` 运行，无法穿过 `/home/gyh`，所以 `root` 指到它下面会返回 403。

### 15.5 正确处理顺序

> 以下命令需要 `sudo`，请在终端执行。

**第 1 步：删除悬空软链**

```bash
sudo rm -f /etc/nginx/sites-enabled/default
ls -la /etc/nginx/sites-enabled/
# 应只剩：learn-book.conf -> /etc/nginx/sites-available/learn-book.conf

sudo nginx -t
# 必须看到 test is successful，否则先停下排查
```

**第 2 步：把文件放到 `www-data` 能访问的目录**

```bash
sudo mkdir -p /var/www/learn-book
sudo rsync -a --delete /home/gyh/project/learn-book/ /var/www/learn-book/
sudo chown -R root:root /var/www/learn-book
sudo find /var/www/learn-book -type d -exec chmod 755 {} +
sudo find /var/www/learn-book -type f -exec chmod 644 {} +
```

**第 3 步：修改 root**

编辑 `/etc/nginx/sites-available/learn-book.conf`，把：

```nginx
root /home/gyh/project/learn-book;
```

改成：

```nginx
root /var/www/learn-book;
```

**第 4 步：测试并重载**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**第 5 步：验证**

```bash
curl -s http://127.0.0.1/ | head -5
# 应为你的页面（标题「学习知识库」），不是 Welcome to nginx!

curl -sI http://127.0.0.1/notes | head -1
# HTTP/1.1 200 OK

curl -sI http://127.0.0.1/favicon.svg | head -1
# HTTP/1.1 200 OK

sudo tail -n 10 /var/log/nginx/learn-book.access.log
# 应能看到本次访问记录
```

替代方案：如果不想复制文件，可以保留原路径，执行 `sudo chmod o+x /home/gyh`，让 `www-data` 能穿过家目录。但不推荐，优先使用 `/var/www`。

### 15.6 验证标准

| 检查点 | 通过标准 |
| --- | --- |
| 删除软链后 | `sudo nginx -t` 显示 `test is successful` |
| reload 后 | `curl /` 返回你的页面，不是 `Welcome to nginx!` |
| 响应长度 | `Content-Length` 不再是默认页的 `615` |
| SPA 路由 | `/notes`、`/settings` 返回 `200` |
| 静态资源 | `/assets/<实际文件名>.js` 返回 `200` |
| 日志 | `/var/log/nginx/learn-book.access.log` 有记录 |
| 日志文件 | `learn-book.error.log` 已创建 |

### 15.7 经验教训

1. **停用站点只删 `sites-enabled` 里的软链**，不要删 `sites-available` 里的源文件；要恢复时源文件还在。
2. **每次改配置先 `nginx -t`，通过后再 `reload`**。`reload` 失败时 Nginx 会继续使用旧配置，容易误判成“新配置没生效”。
3. **不要用家目录作为站点根目录**，放到 `/var/www/` 这类标准目录。
4. **判断部署是否生效看三个信号**：页面内容、`Content-Length`、站点专属日志是否生成。
5. **修改 `/etc/nginx`、`/var/www` 必须用 `sudo`**，否则命令会静默失败或提示权限不足。
6. **`default_server` 只能有一个**：新站点用它时，必须先停用 Ubuntu 默认站点，否则 `nginx -t` 会报 `duplicate default server`。

### 15.8 与正文的差异说明

- 正文按 `/var/www/learn-book` 编写。
- 本次实际把文件放在了 `/home/gyh/project/learn-book`，因此触发了权限问题。
- 最终建议统一到 `/var/www/learn-book`，与正文保持一致。

---

## 参考

- Nginx 官方文档：<https://nginx.org/en/docs/>
- Ubuntu Nginx 默认配置：`/etc/nginx/sites-available/default`
- Vite 静态部署：<https://cn.vitejs.dev/guide/static-deploy.html>
