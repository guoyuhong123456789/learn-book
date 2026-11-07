# Nginx 入门教程

> 只讲最常用的部分：静态站点、反向代理、负载均衡、HTTPS、日志排错和 Docker 部署。
> 最后用一套配置把本仓库的 `dist/` 部署起来。

---

## 目录

1. [Nginx 是什么](#1-nginx-是什么)
2. [安装与常用命令](#2-安装与常用命令)
3. [配置结构](#3-配置结构)
4. [第一个静态网站](#4-第一个静态网站)
5. [location 匹配](#5-location-匹配)
6. [root 与 alias](#6-root-与-alias)
7. [反向代理](#7-反向代理)
8. [负载均衡](#8-负载均衡)
9. [HTTPS](#9-https)
10. [常用配置](#10-常用配置)
11. [日志与排错](#11-日志与排错)
12. [Docker 部署](#12-docker-部署)
13. [部署本仓库](#13-部署本仓库)
14. [速查表](#14-速查表)

---

## 1. Nginx 是什么

Nginx 是一个高性能的 HTTP 服务器，主要干三件事：

```text
浏览器
  │
  ▼
Nginx
  ├── 直接返回静态文件（HTML/CSS/JS/图片）
  ├── 把请求转发给后端（反向代理）
  └── 把请求分给多个后端（负载均衡）
```

| 用途 | 场景 |
| --- | --- |
| 静态站点 | 托管 Vue/React 打包后的 `dist/` |
| 反向代理 | 前端和 Spring Boot 同域，`/api/` 转发到后端 |
| 负载均衡 | 多个后端实例分摊流量 |
| HTTPS | 统一处理证书和加密 |

它用少量进程处理大量并发连接，所以通常放在架构最前面。

---

## 2. 安装与常用命令

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install nginx

# CentOS / RHEL
sudo dnf install nginx

# macOS
brew install nginx
```

最常用的 5 条命令：

```bash
nginx -t                 # 检查配置语法
nginx -T                 # 打印最终生效的完整配置
nginx -s reload          # 平滑重载（不断连接）
nginx -s quit            # 优雅停止
systemctl status nginx   # 查看运行状态
```

> 改完配置：先 `nginx -t`，通过后再 `nginx -s reload`。

配置文件位置：

- Debian/Ubuntu：`/etc/nginx/nginx.conf`、`/etc/nginx/sites-enabled/`
- CentOS/RHEL：`/etc/nginx/nginx.conf`、`/etc/nginx/conf.d/*.conf`
- 日志：`/var/log/nginx/access.log`、`/var/log/nginx/error.log`

---

## 3. 配置结构

配置是分层的：

```text
main
└── http
    ├── upstream
    └── server
        └── location
```

- 指令以 `;` 结尾，块用 `{ }`。
- `#` 是注释。
- `server`、`location` 必须写在 `http` 块里。

最小配置：

```nginx
events {}

http {
    server {
        listen 80;
        server_name localhost;

        location / {
            return 200 "hello nginx\n";
        }
    }
}
```

常用内置变量：

| 变量 | 含义 |
| --- | --- |
| `$host` | 请求的域名 |
| `$uri` | 请求路径（不含查询串） |
| `$args` | 查询串 |
| `$remote_addr` | 客户端 IP |
| `$scheme` | `http` 或 `https` |
| `$request_method` | 请求方法 |

---

## 4. 第一个静态网站

```nginx
server {
    listen 80;
    server_name example.com;

    root  /var/www/example;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

```bash
sudo mkdir -p /var/www/example
echo '<h1>Hello Nginx</h1>' | sudo tee /var/www/example/index.html
sudo nginx -t && sudo nginx -s reload
curl http://example.com
```

说明：

- `root` 是网站根目录。
- `index` 是默认首页。
- `try_files $uri $uri/ =404`：先找文件，再找目录，都没有就返回 404。

> 一个 `server` 块就是一个站点；`listen 80 default_server;` 可以指定默认站点。

---

## 5. location 匹配

```nginx
location [修饰符] 路径 {
    ...
}
```

| 修饰符 | 含义 | 优先级 |
| --- | --- | --- |
| `=` | 精确匹配 | 最高 |
| `^~` | 前缀匹配，命中后不再看正则 | 次高 |
| `~` / `~*` | 正则匹配（`~*` 不区分大小写） | 按顺序 |
| 无 | 普通前缀匹配，取最长 | 最低 |

匹配顺序：`=` → 最长前缀（若带 `^~` 直接用）→ 正则 → 最长前缀兜底。

```nginx
server {
    # 1. 精确匹配
    location = /healthz {
        return 200 "ok\n";
    }

    # 2. 静态资源，命中后不走正则
    location ^~ /static/ {
        root /var/www;
    }

    # 3. 图片正则
    location ~* \.(jpg|png|css|js)$ {
        root /var/www/assets;
        expires 30d;
    }

    # 4. 普通前缀
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
    }

    # 5. 兜底
    location / {
        try_files $uri $uri/ =404;
    }
}
```

常见坑：

- `/api` 和 `/api/` 是两个不同的 location。
- 正则里的 `.` 要写成 `\.`。
- `location` 匹配的是去掉域名和查询串后的路径。

---

## 6. root 与 alias

```nginx
# root：路径 = root + 完整 URI
location /images/ {
    root /var/www;
}
# /images/a.png -> /var/www/images/a.png

# alias：路径 = alias + 去掉 location 前缀后的部分
location /images/ {
    alias /var/www/pics/;
}
# /images/a.png -> /var/www/pics/a.png
```

记忆：`root` 会把 URI 整段拼上去，`alias` 会用 alias 替换 location 前缀。用 `alias` 时两边都建议以 `/` 结尾。

---

## 7. 反向代理

把请求转给后端服务：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;
    }
}
```

### 7.1 `proxy_pass` 末尾斜杠

```nginx
# 后端收到 /api/users
location /api/ {
    proxy_pass http://backend;
}

# 后端收到 /users（/api/ 前缀被替换掉）
location /api/ {
    proxy_pass http://backend/;
}
```

规则：`proxy_pass` 后面带路径，就会替换掉 location 匹配到的前缀。

### 7.2 转发头

后端通常需要这几个头才能拿到真实客户端信息：

- `Host`：原始域名。
- `X-Real-IP`：客户端 IP。
- `X-Forwarded-For`：经过的代理链。
- `X-Forwarded-Proto`：原始协议（http/https）。

### 7.3 WebSocket

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:9000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

---

## 8. 负载均衡

先定义 `upstream`，再在 `proxy_pass` 里引用：

```nginx
upstream app_backend {
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;

    # 可选：按权重分发
    # server 10.0.0.13:8080 weight=3;
}

server {
    listen 80;

    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

三种最常用的调度方式：

| 写法 | 说明 |
| --- | --- |
| 默认 | 轮询，可按 `weight` 加权 |
| `least_conn;` | 优先给连接数最少的实例 |
| `ip_hash;` | 同一 IP 固定到同一实例（会话保持） |

补充参数：

```nginx
upstream app_backend {
    server 10.0.0.11:8080 max_fails=3 fail_timeout=10s;
    server 10.0.0.12:8080 backup;
    server 10.0.0.13:8080 down;
}
```

- `max_fails` + `fail_timeout`：失败几次后暂时摘除。
- `backup`：备用节点，主节点都挂了才用。
- `down`：手动下线。

> 多实例要保证结果一致，后端必须**无状态**：Session、缓存、文件、锁都要放到 Redis / 数据库 / 对象存储，不能放本机内存或磁盘。

---

## 9. HTTPS

测试用自签名证书：

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/example.key \
  -out /etc/nginx/ssl/example.crt \
  -subj "/CN=example.com"
```

生产环境建议用 Let's Encrypt：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

配置：

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;                       # nginx >= 1.25.1
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/example.crt;
    ssl_certificate_key /etc/nginx/ssl/example.key;

    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        root /var/www/example;
        try_files $uri $uri/ =404;
    }
}
```

> 旧版本写法是 `listen 443 ssl http2;`；新版本推荐拆成 `listen 443 ssl;` + `http2 on;`。

---

## 10. 常用配置

### 10.1 gzip 压缩

```nginx
gzip on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_vary on;
gzip_types text/css application/javascript application/json image/svg+xml;
```

图片、视频、字体一般已经压缩过，不需要再 gzip。

### 10.2 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

入口 HTML 不要长缓存：

```nginx
location = /index.html {
    add_header Cache-Control "no-cache";
}
```

### 10.3 上传大小限制

```nginx
client_max_body_size 20m;   # 默认 1m，超限会返回 413
```

### 10.4 隐藏版本号

```nginx
server_tokens off;
```

---

## 11. 日志与排错

```nginx
log_format main '$remote_addr [$time_local] "$request" '
                '$status $body_bytes_sent rt=$request_time '
                'ua=$upstream_addr';

access_log /var/log/nginx/access.log main;
error_log  /var/log/nginx/error.log warn;
```

排错顺序：

```bash
nginx -t                 # 1. 配置有没有语法错误
nginx -T                 # 2. 看实际生效的配置
systemctl status nginx   # 3. 进程在不在
tail -f /var/log/nginx/error.log   # 4. 看错误日志
ss -lntp | grep nginx    # 5. 端口有没有监听
```

常见错误：

| 现象 | 常见原因 | 处理 |
| --- | --- | --- |
| `502 Bad Gateway` | 后端没启动、地址/端口错 | `curl` 后端，检查 `proxy_pass` |
| `504 Gateway Timeout` | 后端处理太慢 | 调大 `proxy_read_timeout`，优化后端 |
| `413` | 上传超过 `client_max_body_size` | 调大该值 |
| `403` | 文件权限不足、目录没有 `index` | 检查权限和 `index` |
| `404` | `root`/`alias` 配错 | 用 `nginx -T` 对照路径 |
| 改了配置不生效 | 没 reload 或命中另一个 server | `nginx -T` 确认后 reload |

调试小技巧：

```bash
# 带 Host 头测试虚拟主机
curl -I -H "Host: example.com" http://127.0.0.1

# 跟踪重定向
curl -IL http://example.com/old
```

---

## 12. Docker 部署

多阶段构建：先用 Node 打包，再把产物放进 Nginx 镜像。

```dockerfile
# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`deploy/nginx.conf`（放在 `conf.d/` 里，所以不要再写 `http` / `events`）：

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://api:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
docker build -t learn-book-web .
docker run -d --name learn-book-web -p 8080:80 learn-book-web
```

用 `docker-compose` 同时起前端和后端：

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - api

  api:
    build: ../backend
    expose:
      - "8080"
```

> Compose 里 Nginx 用服务名 `api:8080` 访问后端，不要写 `127.0.0.1`。

---

## 13. 部署本仓库

本仓库是 Vue 3 + Vite 的 SPA，关键点：

1. 所有前端路由回退到 `index.html`。
2. `assets/` 带 hash，可以长缓存。
3. `index.html` 不缓存，发版立即生效。
4. `/api/` 反代到 Spring Boot（本仓库默认未连接后端，按需开启）。

构建：

```bash
npm run build    # 生成 dist/
```

上传到服务器，例如 `/var/www/learn-book`，配置：

```nginx
server {
    listen 80;
    server_name learn.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name learn.example.com;

    ssl_certificate     /etc/nginx/ssl/learn.example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/learn.example.com.key;

    root  /var/www/learn-book;
    index index.html;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_vary on;

    # 带 hash 的静态资源，长缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # 入口文件不缓存
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 需要连接 Spring Boot 时开启
    # location /api/ {
    #     proxy_pass http://127.0.0.1:8080/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }
}
```

发版：

```bash
npm run build
rsync -av --delete dist/ user@server:/var/www/learn-book/
# 服务器上
sudo nginx -t && sudo nginx -s reload
```

注意：

- 只改 `dist/` 里的静态文件不需要 reload Nginx；改了 `nginx.conf` 才需要。
- 本项目数据保存在浏览器 `localStorage`（`km.*` 前缀），Nginx 只负责托管静态文件。
- 如果部署在子路径（如 `/learn-book/`），要同时设置 Vite 的 `base` 和 Nginx 的 `location`。

---

## 14. 速查表

### 常用指令

| 指令 | 作用 |
| --- | --- |
| `listen 80;` | 监听端口 |
| `server_name example.com;` | 绑定域名 |
| `root /var/www;` | 网站根目录 |
| `index index.html;` | 默认首页 |
| `try_files $uri $uri/ /index.html;` | 文件查找与 SPA 回退 |
| `location /api/ { ... }` | 路径匹配 |
| `proxy_pass http://backend;` | 反向代理 |
| `proxy_set_header Host $host;` | 转发原始 Host |
| `upstream name { server ...; }` | 定义后端集群 |
| `expires 30d;` | 浏览器缓存时间 |
| `gzip on;` | 开启压缩 |
| `client_max_body_size 20m;` | 上传大小限制 |
| `return 301 https://...;` | 重定向 |
| `ssl_certificate ...;` | HTTPS 证书 |

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `nginx -t` | 检查配置 |
| `nginx -T` | 打印完整配置 |
| `nginx -s reload` | 平滑重载 |
| `nginx -s quit` | 优雅停止 |
| `systemctl status nginx` | 查看状态 |
| `tail -f /var/log/nginx/error.log` | 看错误日志 |

### 进阶主题

需要时再查：限流（`limit_req`）、代理缓存（`proxy_cache`）、IP 白名单、灰度分流、性能调优、K8s Ingress。

---

## 参考

- Nginx 官方文档：<https://nginx.org/en/docs/>
- Vite 静态部署：<https://cn.vitejs.dev/guide/static-deploy.html>
- Let's Encrypt：<https://letsencrypt.org/zh-cn/>
