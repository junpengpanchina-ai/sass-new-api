# 技术架构

本文档基于你提供的“技术架构”Markdown 图，落地为：

- **文字结构说明**：便于快速浏览与讨论
- **Mermaid 架构图**：便于在 GitHub/文档站渲染与维护

---

## 架构概览（文字版）

- **Deployment**
  - Docker
  - Docker Compose

- **请求入口**
  - Client Requests → Frontend (React)

- **Frontend (React)**
  - Web Application
  - Pages（User / Channel / Token 等）
  - Components
  - i18n Internationalization
  - Context（User / Theme / Status）

- **Backend (Go)**
  - Router
  - Controllers
  - Middleware Layer
  - Services
  - Models

- **Data Storage**
  - Database
  - Redis Cache

- **AI Relay System**
  - Relay Router → Relay Handlers → Model Adapters
  - AI Service Channels（OpenAI / Claude / Gemini / Midjourney / Baidu / Zhipu / Other）
  - 下游：External AI Service APIs

---

## 架构图（Mermaid）

```mermaid
flowchart TB
  subgraph Deploy[Deployment]
    Docker[Docker]
    Compose[Docker Compose]
  end

  Client[Client Requests]

  subgraph FE[Frontend (React)]
    WebApp[Web Application]
    Pages[Pages (User, Channel, Token, etc.)]
    Components[Components]
    I18n[i18n Internationalization]
    Ctx[Context (User, Theme, Status)]
    WebApp --> Pages
    WebApp --> Components
    WebApp --> I18n
    WebApp --> Ctx
  end

  subgraph BE[Backend (Go)]
    Router[Router]
    Controllers[Controllers]
    MW[Middleware Layer]
    Services[Services]
    Models[Models]
    Router --> Controllers
    Router --> MW
    Controllers --> Services
    Services --> Models
  end

  subgraph Store[Data Storage]
    DB[Database]
    Redis[Redis Cache]
  end

  subgraph Relay[AI Relay System]
    RelayRouter[Relay Router]
    RelayHandlers[Relay Handlers]
    Adapters[Model Adapters]
    subgraph Channels[AI Service Channels]
      OpenAI[OpenAI]
      Claude[Claude]
      Gemini[Gemini]
      Midjourney[Midjourney]
      Baidu[Baidu]
      Zhipu[Zhipu]
      Other[Other AI Services...]
    end
    RelayRouter --> RelayHandlers --> Adapters --> Channels
  end

  External[External AI Service APIs]

  Deploy -.-> FE
  Client --> FE --> BE
  BE --> Store
  BE --> Relay --> External
```

