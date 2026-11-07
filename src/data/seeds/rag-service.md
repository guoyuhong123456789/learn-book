# RAG 知识库问答服务 · 后端（backend）

基于 **LangGraph Plan-and-Execute 编排模式（v3）** 的知识库问答后端：
## 目录
- [0. 项目介绍（面试口述稿）](#0-项目介绍面试口述稿)（含 **§0.0 指标卡**，先看这个）
- [1. 技术路线](#1-技术路线)
- [2. 目录结构](#2-目录结构)
- [3. 接口一览](#3-接口一览)
- [4. Plan-and-Execute 编排模式（v3，LangGraph 规划 + 并行执行 + 固定收尾）](#4-plan-and-execute-编排模式v3langgraph-规划-并行执行-固定收尾) ★ Agent 岗主线
- [5. 双库一致性设计（Milvus + MySQL）](#5-双库一致性设计milvus-mysql)
- [6. 遇到的问题及解决办法](#6-遇到的问题及解决办法) ★ 含延迟优化 §6.2
- [7. 关键配置（`.env`）](#7-关键配置env)
- [8. 快速启动](#8-快速启动)
- [9. 依赖说明（requirements.txt）](#9-依赖说明requirementstxt)
- [10. 文档解析与切分策略（含表格解析）](#10-文档解析与切分策略含表格解析) ★ 检索岗重点
- [11. 面试高频问答（口述稿）](#11-面试高频问答口述稿)
- [12. Redis 三件套：检索 KV 缓存 / 会话记忆 / 滑动窗口限流](#12-redis-三件套检索-kv-缓存-会话记忆-滑动窗口限流) ★ Agent 岗主线
- [EVAL.md 评测体系（独立文档）](EVAL.md)


## 0. 项目介绍（面试口述稿）

### 0.0 指标卡（唯一口径来源，正文一律引用本节）

> 面试时数字最容易被追问、也最容易前后对不上。**全文所有数字以本表为准，正文不再重复给具体数值**。
> ✅ 数字已定稿：**检索评测集 100 条**（Hit@1 90% / Hit@3 100%），**端到端黄金集约 50 条**（见 EVAL.md）。早期笔误已修正。

| 指标 | 口径 | 数值 | 边界 / 前提 | 出处 |
|---|---|---|---|---|
| 问答延迟 P50 | **完整回答**耗时（非首字） | **< 2s**（优化前 3.7~5.5s） | **预热 + 检索缓存命中**条件下 | §6.2 |
| 首字延迟 | 首个 token 返回 | **< 500ms** | 流式输出 | §6.2、§11.13 |
| 检索 Hit@1 | 检索评测集，Top1 命中率 | **90%**（90/100） | 检索评测集 **100 条**（人工构造） | §0.3 |
| 检索 Hit@3 | 检索评测集，Top3 命中率 | **100%**（100/100） | 同上评测集 | §0.3 |
| 评测稳定性 | 同一评测集重复跑 | **三轮结果一致** | 100 条评测集；检索链路本身确定性，故证明力有限，详见 §0.0 口径问题 3 | §0.3 |
| 上传 embedding 耗时 | 每 chunk | **≈ 516 ms/块** | 本地 Ollama，M3E q4_0 | §1.1 |
| rebuild embedding 耗时 | 每 chunk | **≈ 2.7 s/块** | 同上 | §1.1 |
| 首请求阻塞（未预热） | 图 / 模型 / 向量库首次加载 | **约 5.7 分钟** | 预热后消除，不应再复现 | §6.2、§11.13 |

**两套评测集（别混，面试官会问）**：

| 评测集 | 用途 | 条数 | 指标 |
|---|---|---|---|
| **检索评测集**（主服务内部） | 只测**检索层**的 Hit@K | **100 条** | Hit@1 90%、Hit@3 100% |
| **端到端黄金集**（评测平台） | 测**端到端**四指标 + Agent 维度 | **约 50 条** | Ragas 四指标 + 路由准确率/拒答率（见 EVAL.md） |

**5 类题型**（两个评测集共用的分类框架，人工构造，覆盖不同失效模式）：

| # | 英文代号 | 类型 | 考什么能力 |
|---|---|---|---|
| 1 | fact | 简单事实查询 | 基础召回：单文档、单 chunk 能否命中 |
| 2 | reasoning | 多段文档综合推理 | 多路召回：证据散在多 chunk / 多文档能否凑齐 |
| 3 | vague | 模糊提问 | Query 改写 + 语义召回：口语化、指代不清的问法 |
| 4 | out_of_kb | 知识库不存在的问题 | 拒答 / 防幻觉：库外问题不硬编，应触发 out_of_scope |
| 5 | edge | 易混淆边界问题 | 精排（reranker）：相似制度的边界情况能否挑对 |

> ⚠️ 每类各多少条尚未确定，面试前建议补上——面试官很可能问题型分布。

**三个必须能答上的口径问题**（面试官必问）：
1. **「2 秒是首字还是全答完？」** → 是**完整回答**；首字是 <500ms，别混。
2. **「90% 是几个对几个？」** → 检索评测集 **100 条**的 Top1 命中率，即 **90 条命中**；Hit@3 是 100 条全命中。
3. **「三轮一致说明什么？」** → 检索链路本身是确定性的，所以主要说明确定性没问题，**证明力有限**；真正有非确定性的是 LLM 生成和评审，被追问时主动承认样本量小。

### 0.1 项目背景与要解决的问题（面试版）

> 口述原文：
> 「这个项目得先说背景。我们公司有大量的管理制度、流程文件、会议纪要，另外业务数据散在台账和各种数据库里。员工以前想查个制度，得自己翻文档；想要个统计，得找人写 SQL。效率很低，而且不同人查出来的口径还经常对不上。所以就想着做一个统一的入口，制度也能问、数据也能问。
> 落到具体要解决的问题，主要是四个：第一，**检索不准**，传统 RAG 经常找不对文档；第二，**回答不可信**，模型会编，而且不给引用；第三，**能力太单一**，只能查文档，查不了库、算不了数；第四个，**整个过程是个黑盒**——用户提完问题只能干等，不知道跑到哪一步了，我们也没有质量反馈的闭环。」

### 0.3 系统整体介绍（60 秒口述）

> 口述原文：
> 「我做的是这么一套东西：员工用大白话提问，系统去检索单位内部的制度文档，然后生成一个带引用的答案。
> 底层是拿 LangGraph 的 Plan-and-Execute 搭的，整条链路是：文档入库 → 混合检索 → Agent 编排 → 流式问答，我大概分四块说。
> 第一块是**检索**。用户的问题进来先做 Query 改写，然后两路召回——一路是向量的，用 M3E 抓语义；一路是 BM25，抓关键词。两路用 RRF 融合，再用 bge-reranker 精排，最后取 Top4。
> 第二块是**Agent 这条线**。前面有个路由，先把问题分成闲聊、模糊、库外、知识四类，只有知识类才进主链路。进去之后 Planner 一次性把步骤规划好，execute 并行跑几类 worker——向量检索、只读 SQL、文档生成、数值计算、还有答案生成，最后有个评审节点把关，主要干两件事：一是查幻觉，二是打相关性分。
> 第三块是**工程化**，就是保证它真能用。答案走流式，首字 500 毫秒以内，思考过程也是实时推的，前端从原来黑盒等着变成像打印机一样一行行往外蹦。会话记忆用 LangGraph 的 Checkpoint 存。
> 第四块是用 Redis 做了三件事：一是检索的 KV 缓存，同一个 query 命中就直接跳过 embedding、向量库和 rerank；二是会话上下文放 Redis，服务就是无状态的，多实例能共享；三是滑动窗口限流，保护后面的 LLM 和向量库。
> 效果我分几块说。**性能上**，问答 P50 从 3.7 到 5.5 秒压到了 2 秒以内——预热加检索缓存命中的前提下；首字 500 毫秒以内，体感就是秒回、边出边看。**检索质量上**，离线评测集 100 条，Hit@1 是 90%、Hit@3 是 100%。**可信上**，答案是带引用的，评审节点还做幻觉检测和相关性打分。**可迭代上**，全链路 trace 都落库，接评测平台做 BadCase 闭环，上线后能持续优化。」

### 0.4 我负责的重点与难点（面试版）

> 口述原文：
> 「我主要做的是架构设计和核心链路这块，重点难点我挑四个说。
> 第一个是**混合检索加精排**。为什么要两路？向量擅长语义上的近义，BM25 擅长条款号、专有名词、数字这种精确匹配，两个各有各的盲区。难点在于两路分数没法直接比，量纲完全不一样，所以用 RRF 解决。最后 bge-reranker 精排一下，检索评测集 100 条的 Hit@1 能到 90%。
> 第二个是**编排模式的选型**。一开始用的是 Supervisor 那种逐轮主管模式，后来改成了 Plan-and-Execute。原因是主管模式下一个任务要四次主管的 LLM 往返，其中有两次是纯重复询问、根本没有决策空间。改成 Planner 一次规划多步、worker 并行执行、最后确定性收尾之后，这些没意义的调用全砍掉了，延迟和 token 成本都降下来了。
> 第三个是**流式体验**。SSE 逐 token 往外推，另外还有阶段事件，用户能实时看到路由、检索、规划、生成走到哪一步了，首字 500 毫秒以内。
> 第四个是 **Redis 三件套**。检索的 KV 缓存，同一个 query 命中就直接跳过 embedding、向量库和 rerank，这是 P50 能压进 2 秒的关键之一；会话上下文也放 Redis；再加一个滑动窗口限流，防止单个用户把 LLM 和向量库打爆。」


## 1. 技术路线

### 1.1 向量化模型选型：`yxl/m3e:base_q4_0`（本地M3E-base 中文向量模型768维）

候选对比：

| 候选 | 类型 / 维度 | 中文语义 | 部署成本 | 结论 |
|---|---|---|---|---|
| **m3e-base（Ollama q4_0 量化）** | BERT-base 系，**768 维**，max 512 token | 面向中文句对训练，口语化提问 / 换关键词问法召回好 | `ollama pull` 一条命令，本地 CPU 可跑，量化后内存占用小 | ✅ **选用** |
| m3e-base（全精度） | 768 维 | 略优于量化版 | 需 torch/GPU，或 CPU 推理更慢 | 备选（追求 Hit@1 时） |
| text2vec-base-chinese | 768 维 | 中文可用，偏短文本相似度 | 轻量 | 生态与效果不如 m3e |
| bge-large-zh-v1.5 | 1024 维 | 中文检索指标更强 | 参数量大、上传/重建延迟更高 | 升级备选（见 EVAL.md 优化方向） |
| OpenAI text-embedding-3-* | 云 API | 稳定 | 按量计费 + 数据出境 | 与「私有化、零成本」目标冲突，不选 |

**为什么选它**：

1. **中文语义召回是第一优先级**。知识库是中文的制度、文档类长文，用户又爱用口语问，M3E 本来就是拿中文句子对训练的，在「换个关键词问同一件事」「多个文档要区分开」这种场景下，明显比通用多语言向量模型强（用例见 §11.4）。
2. **本地部署，边际成本是 0**。embedding 是高频操作，每个 chunk 都要跑一次；实测上传大概 516 ms 一块、rebuild 大概 2.7 s 一块。放本地 Ollama 跑，边际成本直接压到 0，而且**原文不出内网**。换成云 API，成本和数据合规风险会一起放大。
### 1.2 检索精排模型选型：`BAAI/bge-reranker-base`（Cross-Encoder）

候选对比：

| 候选 | 类型 | 中文效果 | 成本 / 延迟 | 结论 |
|---|---|---|---|---|
| **bge-reranker-base** | Cross-Encoder（base 量级） | 中文 rerank 效果好，中英混排可用 | CPU 可跑；每次约 20 对打分，延迟可接受 | ✅ **选用** |
| bge-reranker-large | Cross-Encoder | 更强 | 参数量翻倍，**在线路径**延迟明显上升 | 延迟不敏感时的备选 |
| bge-reranker-v2-m3 | Cross-Encoder（多语言） | 三者中最强 | 显存/延迟更高 | 后续升级备选 |
| 不做精排，纯向量排序 | 双塔（embedding） | 数值 / 专有名词问题易漏 | 0 额外成本 | 保留为**降级兜底**（未装依赖 / 加载失败） |
| 用 LLM 给候选打分 | LLM 打分 | 灵活 | 每对一次 LLM 调用，成本与延迟高 | 不选 |

为什么选它：

1. **精排的收益最大**。「先召回 20 条、再精排取 4 条」，召回率的提升非常明显。
2. **Cross-Encoder 天然比双塔准**。embedding 是离线把 query 和 chunk 各自编码成向量，两者之间没有交互；Cross-Encoder 是把 `(query, chunk)` 拼在一起整个过模型，所以它能判断「数值对不对得上、限定词满没满足、否定是不是被误召了」，正好补上数值型、弱语义这块的短板。


## 2. 目录结构

```
backend/
├── app/
│   ├── api/
│   │   ├── main.py                 # FastAPI 入口：CORS、路由注册、启动校验、健康检查
│   │   ├── deps.py                 # 公共依赖：多租户解析与校验（X-Tenant-Id / X-Tenant-Key，见 §4 多租户）
│   │   ├── schemas.py              # 请求 / 响应模型（ChatRequest / ChatStreamRequest / ChatResponse 等）
│   │   └── routes/
│   │       ├── rag.py              # 前端接口：知识库（上传/检索/问答/管理/重建）
│   │       └── eval.py             # 评测接口：三链路评测 / trace / 回放 / 批量与异步（见 EVAL.md）
│   ├── agents/
│   │   ├── rag_agent_v3.py         # ★★ Plan-and-Execute 编排模式（v3，唯一引擎）：Planner 规划 + execute 并行执行检索/SQL/文档生成/数值计算/答案生成/校验评审 worker）· 人在回路 · 全链路 Trace · 多租户 · 流式问答（§4）
│   │   ├── prompts.py              # 提示词集中管理（路由 / Planner / 回答 / 校验评审 / SQL / 文档生成 / 数值计算，与引擎解耦）
│   │   ├── tools.py                # 工具构建（vector_search / sql_query，含 trace 埋点）
│   │   └── routing.py              # 前置路由（规则快通道 + JSON 解析）
│   ├── services/
│   │   ├── rag_service.py          # RAG 底座：加载/OCR/表格解析/双库入库/检索/重排/管理
│   │   ├── rag_trace.py            # trace 存储（MySQL rag_traces 表）：Agent 运行轨迹供评测平台读取（见 EVAL.md）
│   │   └── table_parser.py         # 表格解析 + 表格感知切分（PDF/Word/Excel/CSV/Markdown → Markdown 表）
│   ├── models/
│   │   ├── schemas.py              # Pydantic 响应模型
│   │   ├── AgentLLMClint.py        # OpenAI 兼容客户端（流式，支持 stop 停止词）
│   │   └── llm_wrapper.py          # 适配成 LangChain Runnable（create_llm_runnable）
│   └── config.py                   # 配置管理（读取 .env）
├── run.py                          # 启动脚本（等价于 uvicorn app.api.main:app）
├── requirements.txt                # 依赖清单
├── .env.example                    # 环境变量模板
├── README.md                       # 本文件（主说明文档）
├── EVAL.md                         # 评测体系文档（评测接口 / 性能评测 / 优化方向 / 迭代闭环）
├── INTERVIEW.md                    # 面试速用：项目自述 / 演示清单 / 高频追问（口述版）
├── Dockerfile                      # 后端容器镜像（可选部署方式，快速启动章节待补）
├── docker-compose.yml              # 一键编排：backend + MySQL + Ollama（可选）
├── uploads/                        # 上传文件目录（运行时自动创建）
└── milvus_db/                      # Milvus 持久化目录（运行时自动创建）
```

---

## 3. 接口一览

| 方法 | 路径 | 说明 | 前端使用场景 |
|---|---|---|---|
| POST | `/api/rag/upload` | 上传文档：解析（含**表格结构化**）→ 切分 → 双库入库 | 「导入文档」 |
| GET | `/api/rag/files` | 文档列表（含切片数统计） | 文档管理 Tab |
| GET | `/api/rag/files/{file_id}/chunks` | 指定文档的全部分块 | 分块管理 Tab |
| DELETE | `/api/rag/files/{file_id}` | 删除文档（MySQL + Milvus 级联清理） | 文档管理 Tab |
| DELETE | `/api/rag/chunks/{chunk_id}` | 删除单个分块（双库同步清理） | 分块管理 Tab |
| GET | `/api/rag/search` | 关联检索（Milvus 召回 + MySQL 关联 + Rerank） | 检索测试 Tab |
| POST | `/api/rag/chat/stream` | **智能问答（SSE 真流式，v3 Plan-and-Execute 引擎）**：LangGraph 原生流式执行（`graph.astream`，updates→思考过程、custom→引用/逐 token 答案）+ AsyncSqliteSaver 会话记忆；前置路由 → Planner 一次规划 → execute 并行执行 5 类 worker（检索/SQL/文档生成/数值计算/答案生成/校验评审）→ done（事件契约见 EVAL.md Step 3） | 智能问答 Tab（真流式 + 思考过程打印，默认） |
| POST | `/api/rag/chat_v3` | **Plan-and-Execute 编排模式问答（v3 唯一引擎，非流式 JSON）**：Planner 只规划取素材（retrieval/sql/doc/calc），answer/review/finish 走固定收尾链；5 类 worker（普通节点，独立降级）+ 人在回路（高危 SQL / 高风险结论双 interrupt）+ 全链路 Trace + 多租户（`tenant_id`，见 §4）；需要流式时用 `/api/rag/chat/stream` | 智能问答 Tab（非流式 / 人在回路） |
| POST | `/api/rag/rebuild` | 从 MySQL 重建 Milvus 向量库（修复双库不一致） | 运维修复接口 |
| `/api/eval/*` | 评测 / trace / 回放 / 批量异步接口（请求体、返回字段、RAGAS 对接详见 **EVAL.md**） | 评测平台接入 |
| GET | `/health` | 服务健康检查 | 运维 / 探活 |
| GET | `/` | 服务信息 | 运维 |

> 前端页面 `frontend/src/views/Rag.vue` 共 4 个 Tab（文档管理 / 分块管理 / 检索测试 / 智能问答），对应上表 `api.ts` 中封装的方法。

---

## 4. Plan-and-Execute 编排模式（v3，LangGraph 规划 + 并行执行 + 固定收尾） ★ Agent 岗主线


**架构图**：

```text
用户问题
   │
   ▼
router（前置路由：规则快通道 + LLM 四分类 chitchat/ambiguous/out_of_scope/knowledge）
   │  条件边 route_branch
   ├─ chitchat / ambiguous / out_of_scope ──→ finalize（直接回复，跳过工具）
   └─ knowledge ──→ planner（Planner 规划节点：一次输出 steps=["retrieval","sql","doc","calc"...]，
                            带确定性裁决前置 + 后置纠偏，max_rounds=10）
                      │ plan_steps 非空              │ plan_steps 空（状态已确定）
                      ▼                              ▼
                   execute（并行执行节点）        review_worker / finalize
                      │ 批1 并行：retrieval / sql / calc（ThreadPoolExecutor）
                      │ 批2 顺序：doc（依赖素材；sql 在 human_in_the_loop=True 时也顺序执行，
                      │          因为 interrupt() 必须在主线程——子线程丢失 LangGraph 上下文）
                      ▼
              assess（确定性评估条件边）
                      ├─ 素材不足 → 回 planner 重规划（补证据，最多 1 次）
                      ├─ 已有候选/文档 → review_worker
                      └─ 素材足 → answer_worker
                      ▼
            answer_worker（生成候选答案 draft_answer）
                      ▼  条件边（确定性收尾链）
            review_worker（校验把关：幻觉检测 + 相关性打分 + 风险判定，risk=high 时 interrupt）
                      │  pass/passed_by_human/rejected → finalize
                      │  fail → 回 planner 重规划补证据（review_fail_count < 2，超限 → finalize 返回兜底话术）
                      ▼
                  finalize（doc_result/draft_answer 出最终答案 → trace 落库 → 返回）→ END
```

**节点图速记（7 个主节点 + execute 内 5 类 worker）**：

| 节点 | 职责 |
|---|---|
| router | 前置路由：规则快通道 + LLM 四分类 |
| planner | 一次规划多步，输出 steps |
| execute | 并行执行 worker（retrieval / sql / doc / calc / answer） |
| assess | 确定性评估条件边：判断素材够不够 |
| answer_worker | 生成候选答案 draft_answer |
| review_worker | 校验把关：幻觉检测 + 相关性打分 |
| finalize | 出最终答案 → trace 落库 → 返回 |

流转主线：`router → planner → execute → assess → answer_worker → review_worker → finalize`。两个回环：assess「素材不足 → 回 planner（最多 1 次）」、review「fail → 回 planner（限 1 次）」，都限轮次防死循环；过了 assess 之后是纯确定性的收尾链，不再调 LLM。

**路由与改写的顺序（先路由、后改写）**：Query 改写不是问题一进来就做，而是发生在**路由之后**——路由先判断问题类型，只有 `knowledge` 类才进主链路；改写是在 execute 阶段的 `vector_search` 检索工具**内部**才触发（把口语 / 指代问题改写成检索友好问法）。闲聊 / 库外问题不进检索，也就不会触发改写。两者是两个独立的 LLM 调用点（路由在 `routing.py`，改写是 `vector_search` 内的 `query_rewrite`）。

**③ 全链路 Trace 埋点**

埋点分三层：

- `node_traces` 是节点级的，`router / planner / execute / answer_worker / review_worker / finalize` 各记一条，execute 里面每个 worker 再用自己的名字记一条子埋点；
- `llm_calls` 记每次 LLM 调用的输入输出摘要——用的哪个模型、输入多少 token、响应摘要、耗时、成没成功，`caller` 字段标明是谁调的（`planner` / `sql_agent` / `retrieval_agent` / `answer_agent` / `review_agent` / `doc_generate` / `calc_generate` / `router` / `query_rewrite`）；
- 工具调用、references、route、review（里面带 `hallucination` 和 `relevance_score`）统一落 `rag_traces` 表。

有一点要说清楚：**`plan` 没有单独的列**，它是随 `node_traces` 里 `planner` 节点的输出摘要、加上 `llm_calls` 里 `caller="planner"` 那条一起落库的。评测平台那边只要按 `engine=langgraph_v3` 一过滤，就能算指标（幻觉率、相关性打分、工具调用准确率），也能做 BadCase 排查。



## 6. 遇到的问题及解决办法

### 6.1 无法解析扫描版（影印版）PDF

**问题**：影印版 PDF 是没有文本层的，`PyPDFLoader` 提取出来全是空文本，再往下切就是一堆空切片，根本入不了库。

**解决**：我在 `app/services/rag_service.py` 里加了一套「自动检测 + OCR」的流程。

1. **先自动检测**（`_is_scanned_pdf`）：先把文本层提出来，统计一下**平均每页能提到多少个字符**：
   - 小于 `OCR_MIN_CHARS_PER_PAGE`（默认 5）→ 就判定成影印版；
   - 一页文本都提不出来（`documents` 为空）→ 直接按影印版处理。
2. **再做 OCR**（`load_scanned_pdf`）：选型是 **RapidOCR + PyMuPDF**，纯 Python/ONNX，支持中文，不用装 Tesseract、Poppler 这些系统级依赖：
   - 用 PyMuPDF(`fitz`) 按 `OCR_DPI`（默认 200，模糊件可以调到 300）把每页渲染成 PNG；
   - RapidOCR 识别文字，按识别框的顺序拼成整页文本；
   - 每页生成一个 `Document`，`metadata` 里打标 `extraction="ocr"`，空页自动跳过。
3. **切分也得换一套**（`create_text_splitter`）：OCR 出来的文本**一般没有自然段落，还残留空格和误识别符号**，原来那套分隔符（`\n\n`、`\n`、`。`、`，`）根本切不干净。所以 OCR 文档我换成了更细的分隔符：`["\n\n", "\n", "。", "！", "？", "；", "：", "，", " ", ""]`（带上全角标点、英文空格，最后一个空串兜底），保证切片不超过 `chunk_size`；普通文档还是原来的切法。
4. **全线接入**：`upload_file` 和 `load_single_file` 都接上了。`load_single_file` 在 PDF 提不出文本的时候会自动回退到 OCR，所以网页上传（`/api/rag/upload`）这条主路径直接生效。

> 第一次上传影印版 PDF 时，后台日志会打出 `🔍 检测到影印版/扫描版PDF` 和每页识别的字符数；整本扫描书跑 OCR 慢是正常的，可以用 `OCR_DPI` 在速度和精度之间找个平衡。

### 6.2 问答接口比较慢（面试版：结论 → 拆解 → 动作）

**① 结论**

问答延迟 P50 从秒级优化到了 2 秒以内（**具体数值见 §0.0 指标卡**，前提是预热 + 检索缓存命中）。核心不是单点提速，而是「**先定位真实瓶颈，再分层优化**」。

**② 拆解：慢在哪**

Plan-and-Execute 链路长（路由 → Planner 规划 → execute 并行检索/SQL/文档生成/数值计算 → 生成 → 校验评审），拆开看主要有四笔开销：

1. **模型加载**：图 / 向量模型 / reranker 首次请求才加载，首请求曾阻塞到 5.7 分钟；
2. **检索环节重**：embedding + 向量库召回 + 跨库回表 + Cross-Encoder 精排，每一步都要时间；
3. **同步阻塞**：早期同步 LLM / 检索 / DB 调用占死事件循环，请求相互排队（「伪异步」）；
4. **重复计算**：相同 query 每次都重跑完整检索链路（embedding → 向量库 → rerank）。

**③ 动作：四类优化（均已落地）**

| 方向 | 动作 | 效果 |
|---|---|---|
| **预热** | 启动时预热图 / 模型 / 向量库，请求不再背模型加载的锅 | 消除首请求 5.7 分钟级阻塞 |
| **缓存** | Redis 检索 KV 缓存（Key `rag:cache:{query_md5}`），相同 query 命中直接**跳过 embedding / 向量库 / rerank**，进 LLM 生成 | P50 压进 2s 的关键之一（见 §12.1） |
| **异步化** | LLM 走 `AsyncOpenAI.astream_chat`；同步检索 / DB 用 `await asyncio.to_thread` 包裹（「伪异步 → 真异步」改造） | 不再占死事件循环 |
| **流式体验** | SSE 逐 token + 阶段事件推送，首字 <500ms | 降低「感知延迟」，总生成量不变 |

> 补充：并发限制建议 ≤4（LLM 线程池 + checkpoints.db 写锁竞争）；二阶规划为 embedding / DB 换 async 库、CPU 密集环节加 Semaphore 限流。

🟢 出处：§11.13（流式与高并发优化）、§12.1（检索 KV 缓存）、§0.3（P50 指标）、EVAL.md §7。

### 6.3 前端问答等待是"黑盒"（面试版：现象 → 根因 → 方案 → 效果）

**① 现象和根因**

一句话说：Plan-and-Execute 这条链路太长了——路由、Planner 规划、execute 并行跑检索/SQL/文档生成/数值计算这些 worker、生成、最后校验评审，整个下来秒级到十几秒。可前端以前就挂一个 loading，**用户根本不知道跑到哪一步了**，干等十几秒，体验非常差。所以我的解法是 **SSE 真流式 + 思考过程（process）事件实时推送**，把「看不见的等待」变成「看得见的进度」。

**② 解法：LangGraph 原生流式执行（代码已落地，实现与事件契约见 §11.13）**

**30 秒口述**

> Plan-and-Execute 这条链路很长，前端要是只挂一个 loading，用户几秒到十几秒什么都看不到，体验特别差。
> 我是分两层解决的。第一层，答案改成 SSE 流式，逐 token 往外吐，首字延迟直接降到首 token 那个时间点。
> 第二层，我又加了一个 process 思考过程事件——每个阶段一开始推 running，跑完推 done，前端就能按阶段实时打印出来，像"正在路由判断""正在规划""检索到 N 条""正在生成""评审通过"这些。

**具体怎么实现的**

> 实现上我没手工去串节点，而是直接用 LangGraph 原生的流式执行：图的构建跟 invoke 那条路径是同一套，用 `graph.astream(stream_mode=["updates","custom"])` 驱动，节点一跑完，思考过程事件立马就能拿到。流式那个 answer 节点用 `get_stream_writer()` 把引用和逐 token 的增量推出去。好处是图按自己的边和分支跑，流式和 invoke 两条路径行为完全一致，不会漂移。


### 6.4 闲聊 / 知识分流机制、准确率与误判优化

**方法（两层）**：
1. **规则快速通道**（零成本）：正则匹配纯问候语 → chitchat；命中知识库 / 文档生成 / 数值计算关键词 → knowledge。省一次 LLM 调用。
2. **LLM 四分类**：`ROUTER_SYSTEM_PROMPT` 输出 JSON（chitchat / ambiguous / out_of_scope / knowledge），**优先级排序**（chitchat → ambiguous → knowledge → out_of_scope）+ **兜底原则**：拿不准一律 knowledge（宁可多查库，不可漏答）；路由 LLM 失败默认 knowledge。

**准确率口径**：我不拍脑袋报数字，我会讲这里是个**代价不对称**的设计——该答没答（误判成 out_of_scope）代价很高，多查一次库（误判成 knowledge）代价很低，所以整个路由我是刻意往 knowledge 偏的。

**一个真实的误判案例**：初版 prompt 里，我把 out_of_scope 定义成「与知识库领域、也就是管理规定、制度流程明显无关」。结果像「报销流程怎么走」「发票丢了还能报销吗」这种**业务边缘问题，全被划成 out_of_scope 给拒答了**。回头找原因，三个：一是领域锚定太窄，那个括号被模型当成了硬边界；二是「明显无关」本身约束太弱；三是 0-shot，一个例子都没给。后来我改了四处：① 分支按优先级排；② 把 knowledge 的定义放宽成「公司内部任何业务信息」，并且明确写「不确定就选 knowledge」；③ 把 out_of_scope 收紧成「跟公司业务完全无关的外部话题」；④ 补了 7 条 few-shot，边缘题统一标成 knowledge。验证就是拿 20~30 条路由测试集对比，再加线上 trace 里 route 字段的监控——out_of_scope 占比一旦超过 15%，基本就是误伤信号。出过错的 BadCase 我都会标进测试集，防止回归。



