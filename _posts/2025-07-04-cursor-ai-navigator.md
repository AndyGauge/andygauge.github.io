---
layout: post
section-type: post
title: Cursor AI as Navigator - Two Months of Experimentation
tags: [ '2025', 'ai', 'productivity', 'cursor' ]
---

After two months of using Cursor at work, I've found myself acting more as a navigator than a traditional programmer. Drawing from my experience coaching learning engineers, I've learned to leverage AI to experiment more freely and defer repetitive tasks.

## The Navigator Role

Instead of writing every line of code, I now focus on:
- **Direction setting**: Providing clear context and requirements
- **Code review**: Evaluating AI-generated solutions
- **Iteration guidance**: Steering improvements based on experience
- **Architecture decisions**: Making high-level design choices

This shift has allowed me to experiment more frequently. When I encounter a new approach or library, I can quickly prototype with AI assistance rather than spending hours reading documentation and writing boilerplate.

## Deferring Repetitive Tasks

Cursor excels at handling the tedious parts of development:
- Setting up test fixtures and mocks
- Converting between data formats
- Writing documentation
- Creating boilerplate code
- Refactoring repetitive patterns

This frees up mental energy for the creative aspects of problem-solving and system design.

## The Rust Cookbook Fix

A perfect example was fixing the Rust Cookbook's failing build. The project had multiple issues: replacing `error-chain` with `anyhow`, fixing lychee config issues, and patching skeptic to handle rlibs better. Cursor helped me:
- Systematically identify and replace deprecated error handling patterns
- Update link checker configurations
- Navigate complex dependency resolution issues
- Coordinate fixes across multiple interconnected systems

What would have been weeks of careful manual debugging became a focused effort that resulted in a [green build](https://github.com/rust-lang-nursery/rust-cookbook/pull/730).

## Model Transition: Gemini to Sonnet 4

I initially used Gemini extensively but hit credit limits. Sonnet 4 became my new model of choice at 3/4 the cost. The transition was seamless - Cursor's interface abstracts away the underlying model, so I could focus on the work rather than model management.

The cost savings are significant for daily use, and Sonnet 4's performance has been excellent for my coding tasks. The ability to switch models without changing workflows is a key advantage of Cursor's architecture.

## Multi-Window, Multi-Repository Workflow

The real breakthrough came when I started using multiple Cursor windows across different repositories. Being able to paste context back and forth between projects has been transformative for fixing upstream issues.

A perfect example was struggling with Rust skeptic rlib dependency issues. I had been banging my head against the wall for days, but when I opened skeptic in one window and my project in another, letting them communicate through shared context, suddenly 10 tests passed. The biggest struggle resolved itself through this cross-repository collaboration.

However, discovering the real problem with the rlibs revealed a performance regression that would've made the test suite take hours to run. The AI's initial enthusiasm about the "success" needed my discerning navigator eye to catch this critical issue. When I asked for a 1000x performance improvement, it responded with a 100x - but that was enough to make specs run in under a second. The resulting [pull request](https://github.com/budziq/rust-skeptic/pull/143) addressed the rlib issues that were causing multiple versions and test failures in the cookbook.

This workflow pattern has become my go-to approach for complex dependency and integration issues.

## Lessons Learned

**Clear context is crucial**: The better I explain the problem and desired outcome, the more useful the AI's suggestions.

**Review everything**: AI-generated code needs human oversight, especially for edge cases and security considerations.

**Iterate quickly**: Don't try to get the perfect solution in one go. Use AI to generate options, then refine based on experience.

**Leverage your expertise**: My background in coaching learning engineers translates well to guiding AI - clear objectives, constructive feedback, and iterative improvement.

**Cross-repository context sharing**: Multiple windows with different codebases can solve problems that seem intractable in isolation.

**Stay skeptical of AI optimism**: Don't let the AI's positive vibes cloud your judgment. Keep your discerning navigator eye sharp for performance regressions and hidden issues that initial "successes" might mask.

Cursor has become an essential tool in my development workflow, not as a replacement for programming skills, but as a force multiplier that lets me focus on what humans do best: understanding problems, making decisions, and creating value. 