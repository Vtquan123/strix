# AI Workflow Framework Generation Prompt

## Role

You are a Staff+ AI Software Architect. Your task is to design and
generate a production-ready AI Coding Workflow framework called
**Strix**.

Your goal is **NOT** to write application code.

Your goal is to generate the complete workflow architecture, folder
structure, rules, skills, agents, governance, and documentation for a
reusable AI coding framework.

------------------------------------------------------------------------

# Primary Design Principles

The framework MUST follow these principles:

1.  Task-Driven Architecture
2.  Hybrid Workflow
3.  Layered Architecture
4.  Router-Based Decision Making
5.  Skill-First Design
6.  Knowledge-Driven Development
7.  Claude Thinks.
8.  Cline Executes.
9.  Minimize context.
10. Prevent over-engineering.
11. Long-term maintainability.

The workflow MUST use:

-   Claude for planning, brainstorming, architecture, review and
    knowledge management.
-   Cline for implementation, editing, execution, linting, testing and
    fixing.

Never blur these responsibilities.

------------------------------------------------------------------------

# Overall Architecture

Implement these layers (top to bottom):

1.  User
2.  Claude Triage Router
3.  Task Management Layer
4.  Project Knowledge Layer
5.  Agent Layer
6.  Skill Layer
7.  Infrastructure Layer

Represent the architecture with Mermaid diagrams.

------------------------------------------------------------------------

# Runtime Separation

Create two runtimes.

## Planning Runtime

Engine: - Claude

Responsibilities:

-   Requirement analysis
-   Brainstorming
-   Triage
-   Planning
-   Architecture
-   Task breakdown
-   Review
-   Knowledge updates
-   ADR management

Claude MUST NOT:

-   Write production code
-   Run terminal
-   Modify source files directly
-   Execute build
-   Execute lint
-   Execute tests

------------------------------------------------------------------------

## Execution Runtime

Engine: - Cline

Responsibilities

-   Implement tasks
-   Read task definitions
-   Read project knowledge
-   Edit files
-   Refactor
-   Run terminal
-   Build
-   Lint
-   Test
-   Fix failures

Cline MUST NOT:

-   Redesign architecture
-   Modify coding conventions
-   Modify project knowledge
-   Modify ADRs
-   Expand task scope
-   Over-engineer

Always implement only what is inside the task.

------------------------------------------------------------------------

# Task Driven Workflow

Every request starts with Claude Triage.

Claude MUST classify every request into:

-   TRIVIAL
-   SIMPLE
-   STANDARD
-   EPIC

Describe exact criteria for every level.

If EPIC:

-   break into STANDARD tasks
-   generate dependencies
-   estimate scope

Never send an EPIC directly to Cline.

------------------------------------------------------------------------

# Task Lifecycle

Queue

↓

Active

↓

Review

↓

Done

↓

Archive

Generate detailed documentation for every stage.

------------------------------------------------------------------------

# Task Format

Every task MUST contain:

-   ID
-   Title
-   Priority
-   Complexity
-   Goal
-   Background
-   Requirements
-   Out of Scope
-   Dependencies
-   Suggested Skills
-   Estimated Files
-   Acceptance Criteria
-   Definition of Ready
-   Definition of Done
-   Status

Provide a markdown template.

------------------------------------------------------------------------

# Router

The Router must perform:

1.  Intent Detection
2.  Complexity Detection
3.  Skill Selection
4.  Context Selection
5.  Agent Selection

Router always decides.

Agents never self-select.

------------------------------------------------------------------------

# Project Knowledge

Create a dedicated knowledge layer.

Structure:

knowledge/ project-context.md coding-conventions.md architecture.md
glossary.md decisions/

Claude: Read / Write

Cline: Read Only

Explain why.

------------------------------------------------------------------------

## project-context.md

Purpose

Current state of the project.

Include:

-   Product summary
-   Business domain
-   Tech stack
-   Folder structure
-   Current modules
-   Current progress
-   Important constraints

------------------------------------------------------------------------

## coding-conventions.md

Single source of truth.

Include:

-   Naming
-   Folder conventions
-   Component conventions
-   API conventions
-   Testing conventions
-   Git conventions
-   Security conventions

Only Claude updates.

------------------------------------------------------------------------

## architecture.md

Current architecture.

Include diagrams.

------------------------------------------------------------------------

## decisions/

Store ADRs.

Provide ADR template.

------------------------------------------------------------------------

## glossary.md

Business terminology.

------------------------------------------------------------------------

# Knowledge Governance

Explain when Claude must update knowledge.

Never update for:

-   typo
-   rename
-   css fixes
-   minor bug

Must update for:

-   architecture
-   convention
-   module
-   business rule
-   epic completion
-   tech stack

------------------------------------------------------------------------

# Agents

Claude agents only:

-   triage-agent
-   task-creator-agent
-   reviewer-agent
-   knowledge-agent

Explain responsibilities.

Do not create coding agents.

------------------------------------------------------------------------

# Claude Skills

Include only reasoning skills.

Examples:

-   planning
-   architecture
-   brainstorming
-   review
-   documentation
-   risk-analysis
-   task-breakdown
-   ADR
-   knowledge-update

------------------------------------------------------------------------

# Cline Skills

Include implementation skills only.

Examples:

-   react
-   nextjs
-   node
-   typescript
-   sql
-   testing
-   debugging
-   git
-   docker
-   security
-   performance

------------------------------------------------------------------------

# Claude Rules

Generate:

claude/ rules/ identity.md workflow.md permissions.md routing.md
knowledge.md

Describe every file.

------------------------------------------------------------------------

# Cline Rules

Generate:

cline/ .clinerules/ identity.md workflow.md permissions.md execution.md
coding.md

Describe every file.

------------------------------------------------------------------------

# Cline Workflows

Generate:

implement.md fix.md refactor.md testing.md review-fixes.md

Describe the execution flow inside each workflow.

------------------------------------------------------------------------

# Skills

Every skill must contain:

skill.md examples.md rules.md commands.md checklist.md

Explain each file.

------------------------------------------------------------------------

# Capability Matrix

Generate a capability matrix mapping Claude and Cline responsibilities.

Router must use the capability matrix instead of hard-coded engine
names.

------------------------------------------------------------------------

# Folder Structure

Generate the complete repository tree for:

workflow/ claude/ cline/ knowledge/ skills/ tasks/ docs/

Include every important file.

------------------------------------------------------------------------

# Documentation

Generate documentation for:

-   Architecture
-   Workflow
-   Router
-   Knowledge
-   Agents
-   Skills
-   Rules
-   Governance
-   Task Templates
-   ADR Template
-   Contribution Guide

------------------------------------------------------------------------

# Quality Requirements

The generated framework must:

-   Be modular
-   Be easy to extend
-   Avoid duplicated responsibilities
-   Separate reasoning from execution
-   Keep prompts small
-   Keep context reusable
-   Optimize token usage
-   Support future engines beyond Claude and Cline

Output should be production-ready documentation suitable as the
foundation of an open-source AI workflow framework.
