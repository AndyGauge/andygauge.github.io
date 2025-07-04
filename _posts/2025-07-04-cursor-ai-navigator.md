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

A perfect example was updating the Rust Cookbook to use `LazyLock` instead of the deprecated `lazy_static!` macro. Cursor helped me:
- Identify all instances of the old pattern
- Generate the new `LazyLock` implementations
- Update related imports and dependencies
- Ensure the changes maintained the same functionality

What would have been a day of careful manual updates became a focused afternoon of review and refinement.

## Model Transition: Gemini to Sonnet 4

I initially used Gemini extensively but hit credit limits. Sonnet 4 became my new model of choice at 3/4 the cost. The transition was seamless - Cursor's interface abstracts away the underlying model, so I could focus on the work rather than model management.

The cost savings are significant for daily use, and Sonnet 4's performance has been excellent for my coding tasks. The ability to switch models without changing workflows is a key advantage of Cursor's architecture.

## Lessons Learned

**Clear context is crucial**: The better I explain the problem and desired outcome, the more useful the AI's suggestions.

**Review everything**: AI-generated code needs human oversight, especially for edge cases and security considerations.

**Iterate quickly**: Don't try to get the perfect solution in one go. Use AI to generate options, then refine based on experience.

**Leverage your expertise**: My background in coaching learning engineers translates well to guiding AI - clear objectives, constructive feedback, and iterative improvement.

Cursor has become an essential tool in my development workflow, not as a replacement for programming skills, but as a force multiplier that lets me focus on what humans do best: understanding problems, making decisions, and creating value. 