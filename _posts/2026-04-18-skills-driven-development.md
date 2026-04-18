---
layout: post
section-type: post
title: Skills-Driven Development - Why Agentic Systems Need Waterfall
tags: [ '2026', 'ai', 'architecture', 'skills-driven-development', 'authorization', 'security' ]
---

Agile solved a human problem.

Humans are slow. Humans forget. Humans misread specs, skip details, and learn by touching the thing.

So we learned to ship slices. Make it visible. Get feedback. Adjust.

That made sense.

But agentic systems fail in a different way.

Agents are fast. They do not get tired. They do not complain. They will write clean code all night long.

And they will still wreck your architecture if you let them run without a complete plan.

That is the new failure mode: local correctness, global incoherence.

## Waterfall is right for agentic systems

The old argument against waterfall was cost. Exhaustive planning took too long, so teams coded first and discovered intent later.

That argument is obsolete when planning can be generated, reviewed, and refined quickly.

Now we can produce formal models, boundary maps, interface contracts, threat models, failure trees, and decision tables before the first implementation prompt is sent.

Planning is no longer the expensive part.

Repairing misaligned code across dozens of agent-generated diffs is the expensive part.

So yes, for agentic delivery, waterfall is right.

Not because we worship process.

Because we need control.

The order is simple:

1. Finish the plan.
2. Review the plan.
3. Freeze the plan as a baseline.
4. Let agents implement.
5. Reject any implementation that drifts from baseline without an approved plan change.

That is not anti-iteration. It is disciplined iteration.

You still iterate. You just iterate from architecture into code, not from code into accidental architecture.

## Skills-Driven Development

This is the pattern: **Skills-Driven Development (SDD)**.

In SDD, the skill commits before the code.

The skill is not a vibe and not a prompt fragment. It is the reasoning artifact that carries system intent.

It defines:

- constraints,
- invariants,
- state transitions,
- boundary rules,
- and proof obligations.

Then it gets reviewed like a critical design document, because that is what it is.

After review, the skill is committed.

Only then do agents apply it to produce implementation.

This flips the burden of review.

Most teams review code to guess intent.

SDD reviews intent first, then checks code for conformance.

That one inversion changes everything.

## Authorization is where this matters most

Authorization systems rarely fail from one obvious mistake. They fail by drift.

A role check gets added in one endpoint. A tenant exception lands in another. A support bypass appears during an incident. A batch job gets privileged scope "just for now."

Months later, nobody can explain the real policy end to end.

That is why authorization should start with a formal skill.

Define principals, resources, actions, and context.

Define invariants like:

- no cross-tenant reads,
- write permissions require explicit scope,
- elevation is time-bounded, attributable, and logged.

Define deny paths, escalation paths, and required evidence for privileged actions.

Now agents are not inventing policy at the controller level. They are implementing a committed model.

Auditing does not disappear, but it changes character.

Instead of reverse-engineering intent from scattered code, you audit conformance against a known baseline.

That is faster. That is safer. That is legible.

## Practical rollout

You do not need a full process overhaul on day one.

Start with one high-risk domain.

Authorization is usually the right first target.

Then:

1. Create the first skill with explicit invariants and failure modes.
2. Add a gate: no implementation PR without an approved skill commit.
3. Require traceability from code changes back to skill clauses.
4. Track drift as an explicit metric and treat unplanned drift as a defect.

The principle is straightforward.

Centralize architecture before you parallelize coding.

Waterfall was never wrong because planning is bad.

It was wrong when planning was too slow for reality.

In agentic systems, planning is cheap and drift is expensive.

So plan first. Skill first. Then code.
