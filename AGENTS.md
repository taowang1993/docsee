# Docsee

## What is Docsee

Docsee is a CLI tool that downloads documentation from GitHub repos, generates compressed index blocks, and injects them into `AGENTS.md`. This enables coding agents to use retrieval-led reasoning — reading version-matched docs from local files instead of relying on stale training data.

One command does everything: `npx docsee add <github-url> --name <name>`

## Tech Stack

| Layer    | Technology | Purpose                            |
| -------- | ---------- | ---------------------------------- |
| Runtime  | Node.js 20 | Execution environment              |
| Language | TypeScript | Type-safe source code              |
| CLI      | Commander  | Command parsing and help           |
| Config   | YAML       | `docsee.yaml` read/write           |
| API      | fetch      | GitHub API and raw file download   |
| Bundler  | tsup       | Single-file CJS build with shebang |

## Software Architecture

```
User runs `npx docsee add <url>`
              │
              ▼
┌──────────────────────────┐
│    CLI (Commander)       │  src/index.ts
│    Parse command + args  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Commands              │  src/commands/
│    add, sync, status,    │
│    diff, init            │
└────────────┬─────────────┘
             │
     ┌───────┼───────────────────┐
     ▼       ▼                   ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐
│ Config  │ │ Download │ │ Index Gen   │  src/core/
│ R/W     │ │ Files    │ │ + Inject    │
│ YAML    │ │ (max 10  │ │ into        │
│         │ │ parallel)│ │ AGENTS.md   │
└─────────┘ └────┬─────┘ └─────────────┘
                  │
                  ▼
┌──────────────────────────┐
│    GitHub Utils          │  src/utils/github.ts
│    API fetch, tree,      │
│    download, compare     │
└──────────────────────────┘
             │
             ▼
       GitHub API
       raw.githubusercontent.com
```

## Project Structure

```
docsee/
├── src/
│   ├── index.ts               # CLI entry point (Commander setup)
│   ├── commands/
│   │   ├── add.ts             # Add source, auto-create config, download, inject
│   │   ├── sync.ts            # Re-download + regenerate index
│   │   ├── status.ts          # Compare local commit vs upstream
│   │   ├── diff.ts            # Show files changed upstream
│   │   └── init.ts            # Create docsee.yaml
│   ├── core/
│   │   ├── config.ts          # Read/write docsee.yaml, types
│   │   ├── download.ts        # Download files with concurrency limit
│   │   ├── index-gen.ts       # Walk local docs, generate pipe-delimited index
│   │   └── inject.ts          # Marker-based AGENTS.md injection, .gitignore
│   └── utils/
│       ├── github.ts          # GitHub API wrapper (fetch, tree, download, compare)
│       ├── parse-source.ts    # Parse GitHub URLs into repo/branch/path
│       └── cli.ts             # Error formatting, common error handling
├── docsee-skill/
│   └── SKILL.md               # Agent skill for coding agents
├── docsee.yaml                # Config (committed)
├── .docsee/                   # Downloaded docs (gitignored)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Example

<!-- AI-SDK-Docs-START -->

[AI SDK Docs Index]|root: ./.docsee/ai-sdk
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for AI SDK tasks.
|00-introduction:{index.mdx}
|02-foundations:{01-overview.mdx,02-providers-and-models.mdx,03-prompts.mdx,04-tools.mdx,05-streaming.mdx,index.mdx}
|02-getting-started:{00-choosing-a-provider.mdx,01-navigating-the-library.mdx,02-nextjs-app-router.mdx,03-nextjs-pages-router.mdx,04-svelte.mdx,05-nuxt.mdx,06-nodejs.mdx,07-expo.mdx,08-tanstack-start.mdx,index.mdx}
|03-agents:{01-overview.mdx,02-building-agents.mdx,03-workflows.mdx,04-loop-control.mdx,05-configuring-call-options.mdx,06-subagents.mdx,index.mdx}
|03-ai-sdk-core:{01-overview.mdx,05-generating-text.mdx,10-generating-structured-data.mdx,15-tools-and-tool-calling.mdx,16-mcp-tools.mdx,20-prompt-engineering.mdx,25-settings.mdx,30-embeddings.mdx,31-reranking.mdx,35-image-generation.mdx,36-transcription.mdx,37-speech.mdx,38-video-generation.mdx,40-middleware.mdx,45-provider-management.mdx,50-error-handling.mdx,55-testing.mdx,60-telemetry.mdx,65-devtools.mdx,index.mdx}
|04-ai-sdk-ui:{01-overview.mdx,02-chatbot.mdx,03-chatbot-message-persistence.mdx,03-chatbot-resume-streams.mdx,03-chatbot-tool-usage.mdx,04-generative-user-interfaces.mdx,05-completion.mdx,08-object-generation.mdx,20-streaming-data.mdx,21-error-handling.mdx,21-transport.mdx,24-reading-ui-message-streams.mdx,25-message-metadata.mdx,50-stream-protocol.mdx,index.mdx}
|05-ai-sdk-rsc:{01-overview.mdx,02-streaming-react-components.mdx,03-generative-ui-state.mdx,03-saving-and-restoring-states.mdx,04-multistep-interfaces.mdx,05-streaming-values.mdx,06-loading-state.mdx,08-error-handling.mdx,09-authentication.mdx,10-migrating-to-ui.mdx,index.mdx}
|06-advanced:{01-prompt-engineering.mdx,02-stopping-streams.mdx,03-backpressure.mdx,04-caching.mdx,05-multiple-streamables.mdx,06-rate-limiting.mdx,07-rendering-ui-with-language-models.mdx,08-model-as-router.mdx,09-multistep-interfaces.mdx,09-sequential-generations.mdx,10-vercel-deployment-guide.mdx,index.mdx}
|07-reference:{index.mdx}
|07-reference/01-ai-sdk-core:{01-generate-text.mdx,02-stream-text.mdx,03-generate-object.mdx,04-stream-object.mdx,05-embed.mdx,06-embed-many.mdx,06-rerank.mdx,10-generate-image.mdx,11-transcribe.mdx,12-generate-speech.mdx,13-generate-video.mdx,15-agent.mdx,16-tool-loop-agent.mdx,17-create-agent-ui-stream.mdx,18-create-agent-ui-stream-response.mdx,18-pipe-agent-ui-stream-to-response.mdx,20-tool.mdx,22-dynamic-tool.mdx,23-create-mcp-client.mdx,24-mcp-stdio-transport.mdx,25-json-schema.mdx,26-zod-schema.mdx,27-valibot-schema.mdx,28-output.mdx,30-model-message.mdx,31-ui-message.mdx,32-validate-ui-messages.mdx,33-safe-validate-ui-messages.mdx,40-provider-registry.mdx,42-custom-provider.mdx,50-cosine-similarity.mdx,60-wrap-language-model.mdx,61-wrap-image-model.mdx,65-language-model-v2-middleware.mdx,66-extract-reasoning-middleware.mdx,67-simulate-streaming-middleware.mdx,68-default-settings-middleware.mdx,69-add-tool-input-examples-middleware.mdx,70-extract-json-middleware.mdx,70-step-count-is.mdx,71-has-tool-call.mdx,75-simulate-readable-stream.mdx,80-smooth-stream.mdx,90-generate-id.mdx,91-create-id-generator.mdx,92-default-generated-file.mdx,index.mdx}
|07-reference/02-ai-sdk-ui:{01-use-chat.mdx,02-use-completion.mdx,03-use-object.mdx,31-convert-to-model-messages.mdx,32-prune-messages.mdx,40-create-ui-message-stream.mdx,41-create-ui-message-stream-response.mdx,42-pipe-ui-message-stream-to-response.mdx,43-read-ui-message-stream.mdx,46-infer-ui-tools.mdx,47-infer-ui-tool.mdx,50-direct-chat-transport.mdx,index.mdx}
|07-reference/03-ai-sdk-rsc:{01-stream-ui.mdx,02-create-ai.mdx,03-create-streamable-ui.mdx,04-create-streamable-value.mdx,05-read-streamable-value.mdx,06-get-ai-state.mdx,07-get-mutable-ai-state.mdx,08-use-ai-state.mdx,09-use-actions.mdx,10-use-ui-state.mdx,11-use-streamable-value.mdx,20-render.mdx,index.mdx}
|07-reference/05-ai-sdk-errors:{ai-api-call-error.mdx,ai-download-error.mdx,ai-empty-response-body-error.mdx,ai-invalid-argument-error.mdx,ai-invalid-data-content-error.mdx,ai-invalid-message-role-error.mdx,ai-invalid-prompt-error.mdx,ai-invalid-response-data-error.mdx,ai-invalid-tool-approval-error.mdx,ai-invalid-tool-input-error.mdx,ai-json-parse-error.mdx,ai-load-api-key-error.mdx,ai-load-setting-error.mdx,ai-message-conversion-error.mdx,ai-no-content-generated-error.mdx,ai-no-image-generated-error.mdx,ai-no-object-generated-error.mdx,ai-no-output-generated-error.mdx,ai-no-speech-generated-error.mdx,ai-no-such-model-error.mdx,ai-no-such-provider-error.mdx,ai-no-such-tool-error.mdx,ai-no-transcript-generated-error.mdx,ai-no-video-generated-error.mdx,ai-retry-error.mdx,ai-too-many-embedding-values-for-call-error.mdx,ai-tool-call-not-found-for-approval-error.mdx,ai-tool-call-repair-error.mdx,ai-type-validation-error.mdx,ai-ui-message-stream-error.mdx,ai-unsupported-functionality-error.mdx,index.mdx}
|08-migration-guides:{00-versioning.mdx,24-migration-guide-6-0.mdx,25-migration-guide-5-0-data.mdx,26-migration-guide-5-0.mdx,27-migration-guide-4-2.mdx,28-migration-guide-4-1.mdx,29-migration-guide-4-0.mdx,36-migration-guide-3-4.mdx,37-migration-guide-3-3.mdx,38-migration-guide-3-2.mdx,39-migration-guide-3-1.mdx,index.mdx}
|09-troubleshooting:{01-azure-stream-slow.mdx,03-server-actions-in-client-components.mdx,04-strange-stream-output.mdx,05-streamable-ui-errors.mdx,05-tool-invocation-missing-result.mdx,06-streaming-not-working-when-deployed.mdx,06-streaming-not-working-when-proxied.mdx,06-timeout-on-vercel.mdx,07-unclosed-streams.mdx,08-use-chat-failed-to-parse-stream.mdx,09-client-stream-error.mdx,10-use-chat-tools-no-response.mdx,11-use-chat-custom-request-options.mdx,12-typescript-performance-zod.mdx,12-use-chat-an-error-occurred.mdx,13-repeated-assistant-messages.mdx,14-stream-abort-handling.mdx,14-tool-calling-with-structured-outputs.mdx,15-abort-breaks-resumable-streams.mdx,15-stream-text-not-working.mdx,16-streaming-status-delay.mdx,17-use-chat-stale-body-data.mdx,18-ontoolcall-type-narrowing.mdx,19-unsupported-model-version.mdx,20-no-object-generated-content-filter.mdx,21-missing-tool-results-error.mdx,30-model-is-not-assignable-to-type.mdx,40-typescript-cannot-find-namespace-jsx.mdx,50-react-maximum-update-depth-exceeded.mdx,60-jest-cannot-find-module-ai-rsc.mdx,70-high-memory-usage-with-images.mdx,index.mdx}

<!-- AI-SDK-Docs-END -->
