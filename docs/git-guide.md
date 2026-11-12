# Git 开发手册

> 本文档整理自本次会话中关于 Git 的讨论，并补充日常开发中的标准流程、常用命令、常见问题与解决办法。
> 涉及两个仓库：
> - 前端：`learn-book`（`learn-book-front`）
> - 后端：`learn-book-background`（`backend`）

---

## 目录

1. [核心概念](#1-核心概念)
2. [初始配置](#2-初始配置)
3. [日常开发标准流程](#3-日常开发标准流程)
4. [常用命令](#4-常用命令)
5. [分支策略与协作](#5-分支策略与协作)
6. [撤销、回退与恢复](#6-撤销回退与恢复)
7. [.gitignore 配置](#7-gitignore-配置)
8. [认证方式](#8-认证方式)
9. [本次实操与对话整理](#9-本次实操与对话整理)
10. [常见问题与解决办法](#10-常见问题与解决办法)
11. [安全规范](#11-安全规范)
12. [速查表](#12-速查表)

---

## 1. 核心概念

```text
工作区（Working Directory）
   │  git add
   ▼
暂存区（Index / Staging Area）
   │  git commit
   ▼
本地仓库（Local Repository，.git）
   │  git push
   ▼
远程仓库（Remote，如 GitHub / GitLab）
```

| 概念 | 含义 |
| --- | --- |
| 工作区 | 你正在编辑的文件目录 |
| 暂存区 | 下一次提交要包含的内容 |
| 本地仓库 | `.git` 目录，保存提交历史 |
| 远程仓库 | 云端仓库，通常命名为 `origin` |
| `HEAD` | 当前所在提交/分支的指针 |
| `main` / `master` | 主分支名（新项目推荐 `main`） |
| 提交（commit） | 一次快照，有唯一 hash 和提交信息 |
| 分支（branch） | 指向某个提交的可移动指针 |

最小心智模型：

- `add` 是“挑选要提交的内容”。
- `commit` 是“在本地拍一张快照”。
- `push` 是“把本地快照同步到云端”。
- `pull` 是“把云端更新拿下来并合并”。

---

## 2. 初始配置

首次使用 Git 必须配置身份：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

推荐配置：

```bash
# 新仓库默认分支叫 main
git config --global init.defaultBranch main

# 换行符处理（Linux/macOS 推荐 input，Windows 可选 true）
git config --global core.autocrlf input

# 更好看的日志
git config --global alias.lg "log --graph --oneline --decorate --all"
```

查看配置：

```bash
git config --list
git config --get user.name
git config --get user.email
```

| 级别 | 命令 | 作用范围 |
| --- | --- | --- |
| 系统 | `git config --system` | 整台机器 |
| 全局 | `git config --global` | 当前用户 |
| 仓库 | `git config`（不加 `--global`） | 当前仓库 |

> 公司仓库建议在当前仓库单独配置身份，避免 personal 账号和公司账号混用。

---

## 3. 日常开发标准流程

### 3.1 第一次加入项目

```bash
# 1. 克隆仓库
git clone https://github.com/团队/仓库.git
cd 仓库

# 2. 配置当前仓库身份（可选，推荐）
git config user.name "你的名字"
git config user.email "你的邮箱"

# 3. 查看分支和远程
git branch -a
git remote -v

# 4. 安装依赖（以本项目为例）
npm ci
```

### 3.2 开发一个新功能（标准流程）

```text
同步 main → 建功能分支 → 开发 → 小步提交 → 同步 main → 推送 → PR → 评审 → 合并 → 清理
```

**第 1 步：同步主分支**

```bash
git switch main
git pull --rebase origin main
```

**第 2 步：创建功能分支**

```bash
git switch -c feature/note-search
```

分支命名建议：

```text
feature/xxx    新功能
fix/xxx        缺陷修复
hotfix/xxx     紧急修复
refactor/xxx   重构
docs/xxx       文档
chore/xxx      构建/工具
```

**第 3 步：开发并小步提交**

```bash
git status
git diff
git add src/views/NoteListView.vue
git commit -m "feat: 支持按标签筛选笔记"
```

不要攒一个巨大的提交。一个提交只做一件事，方便 review 和回滚。

**第 4 步：提交前自查**

```bash
git status --short
git diff --staged
git ls-files | grep -E 'node_modules|dist/|\.env|session-|\.opencode' || echo "检查通过"
```

重点确认：

- 没有 `node_modules/`、`dist/`、`target/`。
- 没有 `.env`、Token、私钥。
- 没有无关的 IDE 配置、日志、会话导出。

**第 5 步：同步主分支（减少冲突）**

```bash
git fetch origin
git rebase origin/main
```

如果有冲突：

```bash
git status
# 手动解决冲突
git add <冲突文件>
git rebase --continue
```

> 功能分支可以 rebase；**已经推送到共享分支的提交不要随便 rebase**。

**第 6 步：推送功能分支**

```bash
git push -u origin feature/note-search
```

**第 7 步：发起 Pull Request**

在 GitHub/GitLab 页面：

- 源分支：`feature/note-search`
- 目标分支：`main`
- 填写变更说明、测试方式、影响范围
- 指定 reviewer

**第 8 步：代码评审**

评审关注：

- 功能是否符合需求。
- 是否有明显 bug、边界条件。
- 是否有安全问题（密钥、注入、权限）。
- 是否有测试或验证方式。
- 命名、结构、可维护性。

**第 9 步：合并**

- 优先使用 Squash merge 或 Merge commit（按团队规范）。
- 合并后删除功能分支。

**第 10 步：本地清理**

```bash
git switch main
git pull --rebase origin main
git branch -d feature/note-search
git fetch --prune
```

### 3.3 提交信息规范

```text
<type>: <简短描述>

<可选：详细说明>
```

常用 `type`：

| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档 |
| `refactor` | 重构（不改行为） |
| `test` | 测试 |
| `chore` | 构建、依赖、工具 |
| `style` | 格式调整 |
| `perf` | 性能优化 |

示例：

```text
feat: 笔记列表支持按标签筛选
fix: 修复刷新编辑页后标题丢失
docs: 补充 Nginx 部署说明
chore: 更新依赖版本
```

### 3.4 处理合并冲突

冲突文件里会出现：

```text
<<<<<<< HEAD
当前分支的内容
=======
要合并进来的内容
>>>>>>> feature/xxx
```

处理步骤：

```bash
git status                    # 查看冲突文件
# 编辑文件，保留需要的内容，删除冲突标记
git add <冲突文件>
git commit                    # merge 场景
# 或 git rebase --continue    # rebase 场景
```

放弃合并：

```bash
git merge --abort
# 或
git rebase --abort
```

### 3.5 发布版本

```bash
# 打附注标签
git tag -a v1.0.0 -m "release: v1.0.0"
git push origin v1.0.0

# 推送所有标签
git push --tags
```

查看标签：

```bash
git tag
git show v1.0.0
```

### 3.6 紧急修复（hotfix）

```bash
git switch main
git pull --rebase origin main
git switch -c hotfix/login-error

# 修复、提交、推送
git add .
git commit -m "fix: 修复登录失败"
git push -u origin hotfix/login-error
```

修复合并回 `main` 后，如果还有 `develop` 等分支，记得同步回去。

### 3.7 每天开始和结束时的习惯

开始：

```bash
git switch main
git pull --rebase origin main
git status
```

结束：

```bash
git status
git diff
# 提交或 stash，不要带着一堆未提交修改过夜
```

---

## 4. 常用命令

### 4.1 查看状态

```bash
git status            # 完整状态
git status -sb        # 简洁状态（分支 + 文件）
git status --short    # 只列文件
```

### 4.2 添加与提交

```bash
git add file.txt      # 添加单个文件
git add src/          # 添加目录
git add .             # 添加当前目录所有变化
git add -p            # 交互式选择片段

git commit -m "feat: 新增功能"
git commit -am "fix: 修复问题"   # 仅对已跟踪文件生效
git commit --amend --no-edit    # 修改最后一次提交（未推送时）
```

### 4.3 差异与历史

```bash
git diff                  # 工作区 vs 暂存区
git diff --staged         # 暂存区 vs 最后一次提交
git diff HEAD             # 工作区 vs 最后一次提交

git log                       # 完整历史
git log --oneline -10         # 最近 10 条
git log --graph --oneline     # 图形化分支
git log --stat                # 每次提交改了哪些文件
git log -p file.txt           # 某文件的历史改动
git show <commit>             # 查看某次提交
git blame file.txt            # 每行最后是谁改的
```

### 4.4 文件与跟踪

```bash
git ls-files                       # 所有已跟踪文件
git ls-files | wc -l               # 数量
git rm file.txt                    # 删除并暂存
git rm --cached file.txt           # 取消跟踪但保留文件
git mv old.txt new.txt             # 重命名并暂存
git check-ignore -v file           # 查看某文件被哪条规则忽略
```

### 4.5 远程

```bash
git remote -v                      # 查看远程地址
git remote add origin <url>        # 添加远程
git remote set-url origin <url>    # 修改远程地址
git remote remove origin           # 删除远程

git fetch origin                   # 只下载，不改工作区
git fetch --prune                  # 拉取并清理失效分支
git pull                           # fetch + merge
git pull --rebase                  # fetch + rebase
git push                           # 推送当前分支
git push -u origin main            # 首次推送并关联
git push origin feature/xxx        # 推指定分支
git push origin --delete feature/xxx  # 删除远程分支
```

---

## 5. 分支策略与协作

### 5.1 常见分支模型

```text
main        稳定分支，受保护，随时可发布
develop     集成分支（可选）
feature/*   功能分支，从 main/develop 拉出
fix/*       缺陷修复
hotfix/*    线上紧急修复
release/*   发布准备（可选）
```

小团队可以简化为：

```text
main + feature/* + fix/*
```

### 5.2 分支操作

```bash
git branch                    # 查看本地分支
git branch -a                 # 查看本地 + 远程分支
git branch feature/login      # 创建分支
git switch feature/login      # 切换分支
git switch -c feature/login   # 创建并切换
git branch -d feature/login   # 删除已合并分支
git branch -D feature/login   # 强制删除未合并分支
git branch -m new-name        # 重命名当前分支
```

### 5.3 合并与变基

```bash
git switch main
git merge feature/login       # 合并，保留分支历史
git merge --abort             # 放弃合并

git switch feature/login
git rebase main               # 把功能分支接到 main 之后
git rebase --continue         # 解决冲突后继续
git rebase --abort            # 放弃变基
```

选择建议：

| 场景 | 推荐 |
| --- | --- |
| 功能分支合并到 main | Merge（保留上下文）或 Squash（历史干净） |
| 功能分支同步 main | Rebase（历史线性） |
| 已推送的共享分支 | 不要 rebase，用 merge |
| 单个提交复制到别的分支 | `cherry-pick` |

### 5.4 Cherry-pick

```bash
git cherry-pick <commit>
```

把某次提交单独复制到当前分支，适合把 hotfix 同步到多个分支。

---

## 6. 撤销、回退与恢复

### 6.1 丢弃工作区修改

```bash
git restore file.txt          # 丢弃未暂存的修改（无法恢复）
git restore .                 # 丢弃所有未暂存修改
```

### 6.2 取消暂存

```bash
git restore --staged file.txt
# 旧写法
git reset HEAD file.txt
```

### 6.3 撤销提交

```bash
# 撤销最近一次提交，保留修改在暂存区
git reset --soft HEAD~1

# 撤销最近一次提交，保留修改在工作区（默认）
git reset --mixed HEAD~1

# 撤销最近一次提交，并丢弃所有修改（危险）
git reset --hard HEAD~1
```

| 参数 | HEAD | 暂存区 | 工作区 |
| --- | --- | --- | --- |
| `--soft` | 回退 | 保留 | 保留 |
| `--mixed` | 回退 | 重置 | 保留 |
| `--hard` | 回退 | 重置 | 丢弃 |

> 已经推送的提交不要用 `reset` 后强推，优先用 `git revert`。

### 6.4 生成反向提交

```bash
git revert <commit>
```

新建一个“抵消该提交”的提交，历史不被改写，适合公共分支。

### 6.5 暂存当前修改

```bash
git stash push -m "临时保存"
git stash list
git stash pop                 # 恢复并删除 stash
git stash apply               # 恢复但保留 stash
git stash drop                # 删除某条 stash
```

### 6.6 找回误删的提交

```bash
git reflog
git reset --hard <reflog 中的 hash>
```

`reflog` 记录了 HEAD 的移动，是误操作后的救命稻草。

### 6.7 清理未跟踪文件

```bash
git clean -nd                 # 先预览会删什么
git clean -fd                 # 删除未跟踪文件/目录（危险）
```

> `git clean -fd` 删掉的文件无法从 Git 恢复。

---

## 7. .gitignore 配置

### 7.1 规则要点

```gitignore
# 忽略目录
node_modules/
dist/

# 忽略所有 .log
*.log

# 忽略环境变量
.env
.env.*
!.env.example

# 忽略 IDE
.idea/
.vscode/
```

- `/` 结尾表示目录。
- `!` 表示例外（不忽略）。
- `#` 是注释。
- 已被 Git 跟踪的文件，加入 `.gitignore` **不会**自动取消跟踪。

### 7.2 前端 `learn-book-front/.gitignore`

```gitignore
node_modules/
dist/
*.local
.env
.env.*
!.env.example
.idea/
.vscode/
*.log
.DS_Store
session-*.md
learn-book.conf
.opencode/
```

说明：

- `dist/` 是构建产物，由 CI 重新构建。
- `session-*.md` 是本地会话导出。
- `.opencode/` 是本地工具目录。
- `learn-book.conf` 是误放在工程根目录的 Nginx 软链。

### 7.3 后端 `backend/.gitignore`

```gitignore
# 构建产物
target/
*.class
*.jar
*.war
*.ear

# IDE
.idea/
*.iml
.vscode/

# 环境变量与密钥（绝对不能提交）
.env
.env.*
*.local
application-local.*
!.env.example
*.pem
*.key
*.p12

# 日志
*.log
logs/

# 操作系统
.DS_Store
Thumbs.db

# 临时文件
*.tmp
*.bak
```

重点：

- `target/`：Maven 构建输出。
- `.env.local`：本地环境变量，**绝对不能提交**。
- `application-local.*`：本地 Spring 配置，可能含数据库密码。
- `.idea/`：IntelliJ 配置。

### 7.4 验证是否生效

```bash
git check-ignore -v .env.local
git status --ignored
git ls-files | grep -E '\.env|(^|/)target/|\.idea' || echo "没有误跟踪"
```

当前后端仓库的验证结果：

```text
.gitignore:16:*.local	.env.local
.gitignore:2:target/	target
.gitignore:9:.idea/	.idea
```

说明 `.env.local`、`target/`、`.idea/` 都已被忽略，且没有被跟踪。

### 7.5 文件已经被跟踪了怎么办

```bash
git rm --cached file.txt
git commit -m "chore: stop tracking file.txt"
```

如果误把整个目录提交了：

```bash
git rm -r --cached node_modules
git commit -m "chore: remove node_modules from git"
```

> 不要用 `git rm -r --cached .` 一把梭，容易把该跟踪的文件也取消掉。

---

## 8. 认证方式

### 8.1 HTTPS + Token（本机无 SSH 密钥时推荐）

GitHub 从 2021 年起不再支持账号密码，必须用 **Personal Access Token（PAT）**。

步骤：

1. GitHub → Settings → Developer settings → Personal access tokens。
2. 创建 Token，勾选 `repo` 权限（Fine-grained Token 需授权对应仓库）。
3. `git push` 提示时：
   - `Username`：GitHub 用户名
   - `Password`：粘贴 Token（不是登录密码）

避免每次输入：

```bash
# 临时缓存（推荐）
git config --global credential.helper 'cache --timeout=3600'

# 永久保存（明文存储，注意安全）
git config --global credential.helper store
```

**不要把 Token 拼进远程地址：**

```bash
# 错误示范：Token 会留在 .git/config 和 shell 历史里
git remote add origin https://<token>@github.com/team/repo.git
```

### 8.2 SSH

```bash
ssh-keygen -t ed25519 -C "你的邮箱"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub      # 复制公钥到 GitHub → Settings → SSH keys
ssh -T git@github.com          # 验证
```

切换远程地址：

```bash
git remote set-url origin git@github.com:团队/仓库.git
```

---

## 9. 本次实操与对话整理

### 9.1 前端仓库：`learn-book`

远程地址：

```text
https://github.com/guoyuhong123456789/learn-book.git
```

当时的背景：

- 本地 `learn-book-front` 不是 Git 仓库，也没有 `.gitignore`。
- 远程仓库不是空的：GitHub 自动创建了 `README.md` 和 `LICENSE`。
- 本机没有 SSH 私钥，使用 HTTPS + Token。

遇到的问题：

```text
git push -u origin main
To https://github.com/guoyuhong123456789/learn-book.git
 ! [rejected]        main -> main (fetch first)
error: 无法推送一些引用到 '...'
提示：Updates were rejected because the remote contains work that you do not
提示：have locally.
```

**原因**：远程 `main` 上已经有 `README.md` 和 `LICENSE`，本地是独立初始化的，两边没有共同祖先，不能快进推送。**不是认证问题。**

**解决**：

```bash
# 1. 先提交本地未跟踪的 .gitignore 和 .github
git add .gitignore .github
git commit -m "chore: add gitignore and CI"

# 2. 拉取远程并合并（允许无共同祖先）
git fetch origin
git merge origin/main --allow-unrelated-histories -m "chore: merge remote README and LICENSE"

# 3. 检查
git log --graph --oneline --decorate -6
git status

# 4. 推送
git push -u origin main
```

当前状态：

- `main` 与 `origin/main` 已同步。
- 历史中有：`827fa44 Initial commit`（远端）、`4c8513e initial commit`（本地）、`3badd79 chore: merge remote README and LICENSE`（合并提交）。
- **注意**：本地 `.github/` 和 `.gitignore` 目前仍是未跟踪状态，需要补一次提交：

```bash
git add .gitignore .github
git commit -m "chore: add gitignore and CI"
git push
```

### 9.2 后端仓库：`learn-book-background`

远程地址（当前 remote 名为 `origin-back`）：

```text
https://github.com/guoyuhong123456789/learn-book-background.git
```

原本的 `.gitignore` 只有：

```gitignore
target/
*.class

.idea/
```

问题是 **没有忽略 `.env.local`**，存在密钥泄露风险。已补充为第 7.3 节的完整版本，并验证通过：

```bash
git check-ignore -v .env.local
# .gitignore:16:*.local	.env.local
```

当前状态：

- 分支：`master`
- `.env.local`：未跟踪且已被忽略。
- `target/`、`.idea/`：未被跟踪。
- `.gitignore`：已修改，尚未提交。

建议提交：

```bash
cd /home/gyh/code/learn-book/backend
git add .gitignore
git commit -m "chore: ignore local env and build output"
git push origin master
```

可选：把远程名从 `origin-back` 改成更常见的 `origin`：

```bash
git remote rename origin-back origin
```

---

## 10. 常见问题与解决办法

### 10.1 `! [rejected] main -> main (fetch first)`

**原因**：远程有你本地没有的提交，不能快进。

**解决**：

```bash
git pull --no-rebase origin main      # 合并
# 或
git pull --rebase origin main         # 变基
git push -u origin main
```

不要一上来就 `git push -f`。

### 10.2 `fatal: refusing to merge unrelated histories`

**原因**：本地和远程是两次独立 `git init`，没有共同祖先。

**解决**：

```bash
git pull origin main --allow-unrelated-histories
# 或
git merge origin/main --allow-unrelated-histories
```

### 10.3 `remote origin already exists`

**原因**：已经添加过名为 `origin` 的远程。

**解决**：

```bash
git remote set-url origin <新地址>
# 或先删除再添加
git remote remove origin
git remote add origin <新地址>
```

### 10.4 `Authentication failed` / `403` / 一直提示输入密码

**原因**：用了账号密码，或 Token 权限不足。

**解决**：

- 密码处填 **Personal Access Token**。
- 确认 Token 有 `repo` 权限，且未过期。
- Fine-grained Token 要授权到具体仓库。
- 清除旧凭据后重试：

```bash
git config --global --unset credential.helper
git config --global credential.helper 'cache --timeout=3600'
```

### 10.5 `Permission denied (publickey)`

**原因**：使用 SSH 地址，但本机没有配置密钥。

**解决**：

```bash
ssh-keygen -t ed25519 -C "你的邮箱"
cat ~/.ssh/id_ed25519.pub   # 添加到 GitHub SSH keys
ssh -T git@github.com       # 验证
```

或改用 HTTPS 地址。

### 10.6 `fatal: The current branch main has no upstream branch`

**原因**：本地分支没有关联远程分支。

**解决**：

```bash
git push -u origin main
```

### 10.7 `error: src refspec main does not match any`

**原因**：本地没有 `main` 分支，或还没有任何提交。

**解决**：

```bash
git branch -M main          # 把当前分支改名为 main
git add .
git commit -m "chore: initial commit"
git push -u origin main
```

### 10.8 `fatal: not a git repository`

**原因**：当前目录不在 Git 仓库里，或 `.git` 被删了。

**解决**：

```bash
cd 项目目录
git init
# 或从远程克隆
git clone <地址>
```

### 10.9 合并冲突（`CONFLICT`）

**解决**：

```bash
git status                  # 查看冲突文件
# 编辑文件，删除 <<<<<<< ======= >>>>>>> 标记
git add <冲突文件>
git commit                  # 完成合并
```

放弃合并：

```bash
git merge --abort
```

### 10.10 rebase 冲突

```bash
git status
# 解决冲突
git add <文件>
git rebase --continue

# 放弃 rebase
git rebase --abort
```

### 10.11 `error: Your local changes would be overwritten by merge`

**原因**：工作区有未提交修改，和要拉取的内容冲突。

**解决**：

```bash
git stash push -m "暂存本地修改"
git pull
git stash pop
```

或先提交本地修改。

### 10.12 detached HEAD

**现象**：

```text
HEAD detached at <commit>
```

**原因**：切到了某个提交而不是分支。

**解决**：保留当前改动新建分支：

```bash
git switch -c fix-temp
```

### 10.13 提交到了错误的分支

```bash
# 情况 1：还没推送，撤销提交并保留修改
git reset --soft HEAD~1
git switch 正确分支
git add .
git commit -m "..."

# 情况 2：把这次提交复制到另一个分支
git switch 正确分支
git cherry-pick <commit>
```

### 10.14 想撤销最近一次提交

```bash
# 保留修改在暂存区
git reset --soft HEAD~1

# 保留修改在工作区
git reset --mixed HEAD~1

# 丢弃修改（危险）
git reset --hard HEAD~1
```

已经推送的提交：

```bash
git revert <commit>
```

### 10.15 提交时漏了文件

```bash
git add 漏掉的文件
git commit --amend --no-edit
```

`--amend` 会改写最后一次提交的 hash，**不要对已推送的提交使用**。

### 10.16 `.gitignore` 不生效

**原因**：文件已经被 Git 跟踪，`.gitignore` 只对未跟踪文件生效。

**解决**：

```bash
git rm --cached 文件或目录
git commit -m "chore: untrack ..."
```

### 10.17 误提交了密钥 / 密码

1. 立即**作废并轮换**该密钥（最重要）。
2. 从仓库删除：

```bash
git rm --cached .env.local
git commit -m "chore: remove secret"
git push
```

3. 如果密钥已经推到远程，仅删除文件不够，历史里仍然存在，需要用 `git filter-repo` 或 BFG 清理历史并强制推送。
4. 通知团队，检查 CI/CD 和日志中是否泄露。

> 本次后端 `.env.local` 已被正确忽略，没有被跟踪，属于安全状态。

### 10.18 文件太大被拒绝

**现象**：`remote: error: File ... is ... MB; this exceeds GitHub's file size limit`

**解决**：

- 从提交中移除大文件。
- 使用 Git LFS：

```bash
git lfs install
git lfs track "*.zip"
git add .gitattributes
```

- 如果大文件已在历史中，需要重写历史。

### 10.19 LF / CRLF 警告

```text
warning: LF will be replaced by CRLF
```

**解决**：

```bash
# Linux/macOS
git config --global core.autocrlf input

# Windows
git config --global core.autocrlf true
```

### 10.20 文件权限变化（`mode change 100644 => 100755`）

**原因**：文件可执行位变了。

**解决**：

```bash
git config core.filemode false   # 忽略权限变化（按需）
```

### 10.21 只改大小写的重命名没被识别

Linux 默认区分大小写，Windows/macOS 可能不区分。改名时用两步：

```bash
git mv OldName.java temp.java
git mv temp.java NewName.java
```

### 10.22 SSL 证书错误

**现象**：`SSL certificate problem: unable to get local issuer certificate`

**解决**：配置公司 CA 证书，而不是关闭校验：

```bash
git config --global http.sslCAInfo /path/to/ca.crt
```

不建议 `http.sslVerify false`。

### 10.23 无法解析主机 / 连接超时

**现象**：`Could not resolve host` / `Connection timed out`

**解决**：

- 检查网络和 DNS。
- 公司网络可能需要代理：

```bash
git config --global http.proxy http://proxy:port
git config --global https.proxy http://proxy:port
```

- 关闭代理：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 10.24 推送被保护分支拒绝

**现象**：`protected branch hook declined`

**解决**：不要直接推 `main`，走分支 + Pull Request；或联系管理员调整分支保护规则。

### 10.25 `fatal: branch 'main' does not exist`

**原因**：分支名不对，或远程默认分支是 `master`。

**解决**：

```bash
git branch -a
git switch -c main origin/main
```

### 10.26 把 `master` 改为 `main`

```bash
git branch -m master main
git push -u origin main
# 再到远程设置默认分支为 main，并删除旧的 master
```

---

## 11. 安全规范

### 11.1 提交前检查

```bash
git status
git diff --staged
git ls-files | grep -E 'node_modules|dist/|target/|\.env|\.pem|\.key' || echo "检查通过"
```

确认：

- 没有 `node_modules/`、`dist/`、`target/`。
- 没有 `.env`、Token、私钥、证书。
- 没有无关的本地文件（IDE 配置、会话导出、日志）。

### 11.2 不要强推共享分支

```bash
# 尽量不用
git push -f origin main

# 如果必须，使用更安全的
git push --force-with-lease origin 分支名
```

`--force-with-lease` 会在远程有你没见过的提交时拒绝覆盖。

### 11.3 永远不要提交

- `.env`、`.env.local`、密钥文件（`*.pem`、`id_rsa`）。
- 数据库密码、云厂商 AK/SK、Token。
- `node_modules/`、构建产物、日志。
- 大的二进制文件（用 LFS 或对象存储）。

### 11.4 密钥泄露后的处理顺序

1. 立即在云平台作废/轮换密钥。
2. 从当前代码中删除。
3. 清理 Git 历史（`git filter-repo` / BFG）。
4. 强制推送并通知团队。
5. 排查日志、CI 变量、构建产物是否泄露。

---

## 12. 速查表

### 12.1 仓库与提交

| 命令 | 作用 |
| --- | --- |
| `git init -b main` | 初始化仓库，主分支为 main |
| `git clone <url>` | 克隆远程仓库 |
| `git status -sb` | 简洁状态 |
| `git add .` | 添加所有变化 |
| `git add -p` | 交互式添加 |
| `git commit -m "msg"` | 提交 |
| `git commit --amend` | 修改最后一次提交 |
| `git log --graph --oneline --all` | 查看分支历史 |
| `git diff --staged` | 查看暂存区差异 |
| `git show <commit>` | 查看某次提交 |
| `git blame <file>` | 查看每行作者 |

### 12.2 分支

| 命令 | 作用 |
| --- | --- |
| `git branch` | 查看本地分支 |
| `git branch -a` | 查看所有分支 |
| `git switch <branch>` | 切换分支 |
| `git switch -c <branch>` | 创建并切换 |
| `git merge <branch>` | 合并分支 |
| `git rebase <branch>` | 变基 |
| `git cherry-pick <commit>` | 复制提交 |
| `git branch -d <branch>` | 删除已合并分支 |
| `git branch -m <new>` | 重命名当前分支 |

### 12.3 远程

| 命令 | 作用 |
| --- | --- |
| `git remote -v` | 查看远程地址 |
| `git remote add origin <url>` | 添加远程 |
| `git remote set-url origin <url>` | 修改远程地址 |
| `git fetch origin` | 拉取远程更新 |
| `git fetch --prune` | 拉取并清理失效分支 |
| `git pull` | 拉取并合并 |
| `git pull --rebase` | 拉取并变基 |
| `git push` | 推送 |
| `git push -u origin main` | 首次推送并关联 |
| `git push origin --delete <branch>` | 删除远程分支 |

### 12.4 撤销

| 命令 | 作用 |
| --- | --- |
| `git restore <file>` | 丢弃工作区修改 |
| `git restore --staged <file>` | 取消暂存 |
| `git reset --soft HEAD~1` | 撤销提交，保留暂存 |
| `git reset --mixed HEAD~1` | 撤销提交，保留工作区 |
| `git reset --hard HEAD~1` | 撤销提交并丢弃修改 |
| `git revert <commit>` | 生成反向提交 |
| `git stash push -m "msg"` | 暂存修改 |
| `git stash pop` | 恢复暂存 |
| `git reflog` | 查看 HEAD 移动记录 |
| `git clean -nd` | 预览未跟踪文件清理 |

### 12.5 配置与忽略

| 命令 | 作用 |
| --- | --- |
| `git config --global user.name "..."` | 设置用户名 |
| `git config --global user.email "..."` | 设置邮箱 |
| `git config --list` | 查看配置 |
| `git rm --cached <file>` | 取消跟踪但保留文件 |
| `git ls-files` | 查看已跟踪文件 |
| `git check-ignore -v <file>` | 查看某文件被哪条规则忽略 |

---

## 参考

- Git 官方文档：<https://git-scm.com/doc>
- Pro Git（中文）：<https://git-scm.com/book/zh/v2>
- GitHub 认证文档：<https://docs.github.com/zh/authentication>
- Git LFS：<https://git-lfs.com/>
