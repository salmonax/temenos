# Temenos

A TypeScript framework for building multi-agent AI systems over any retrievable context: documents, market data, images, APIs, logs.

Temenos is an engine that plans and executes chains of specialized agents against a domain's context, allowing the caller to retrieve evidence, synthesizing across sources, and producing outputs whose every step is cited and traced.

The architecture implements the context-engineering pattern developed in Denis Rothman's *Context Engineering for Multi-Agent Systems*: a Planner that turns a high-level goal into a typed JSON execution plan, an Executor that walks it with dependency resolution, an Agent Registry where new capabilities are added by authoring blueprints rather than changing code, and a Tracer that records every run for inspection. The engine is domain-agnostic; instances adapt it to specific domains and corpora.

Because the Planner composes arbitrary agents over the same query, a single plan can fan out into multiple agents running in parallel whose outputs are preserved side by side rather than collapsed, included in this repo as a small demo.

## Why

Building a multi-agent AI pipeline normally means writing a lot of orchestration code, which typically means sequencing the agents, threading their outputs into each other's inputs, handling retries, logging what happened. And every time you want to add a new agent, you change the code.

Temenos does this work once. You describe each agent in a short JSON blueprint (what it's for, what inputs it needs, what it outputs), register it, and the engine handles the rest — an LLM-powered Planner builds an execution plan from your query, the Executor walks the plan and passes data between agents, a Tracer records the whole run for inspection.

Adding a new agent is authoring a blueprint, not rewriting orchestration. Running the same query through multiple agents in parallel is a plan with more steps. Swapping one agent for another is changing which blueprint is loaded.

This is useful when:

- You want to run several different kinds of analysis on the same material and compare outputs
- Your team or practice needs to extend the tool regularly and you want to avoid touching core code each time
- You want every output's reasoning visible and auditable, with citations back to source context

## Architecture

```
src/
  core/              domain-agnostic engine
    types/           typed schemas (Zod)
    helpers/         LLM calls, tokens, logging
    engine/          Planner, Executor, Registry, Trace
    stance-framework/  handler factory

  instances/         configurations for specific domains/corpora

  components/        React GUI
  demos/             CLI entry points
```

## How an instance works

An instance of Temenos consists of:

1. **Context sources** — documents, market feeds, images, APIs, or whatever the domain provides, ingested and indexed with source metadata
2. **Agents (stances)** — JSON blueprints describing the agents this instance uses
3. **Voice sample** — optional, for preserving tone in generated outputs
4. **Configuration** — paths, model choices, retrieval parameters

The included `research-vault` and `forex-gann` instances demonstrate the framework in two different domains.

## Getting started

```bash
npm install
cp .env.example .env    # set ANTHROPIC_API_KEY
npm run dev             # Vite dev server with HMR
npm test                # vitest
```

## Status

Under active development.

## License

MIT
