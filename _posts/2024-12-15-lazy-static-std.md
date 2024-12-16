---
layout: post
section-type: post
title: Lazy Static replacement in the standard library
tags: [ '2024' ]
---

```rust
use std::sync::LazyLock;
```

is preferred over

```rust
use lazy_static::lazy_static;
```

The rust cookbook has references to lazy_static! macro which at one point [inspired]
OnceCell, but now that the standard library has all the guts which allows for
concurrent late bound initialization, it is preferred to use the standard library.

Shout out to matklad for `OnceCell` and the community effort which drives rust forward.
I updated part of the cookbook to reflect this change.  See [Extracting Links] for the
2024 rewrite where `error-chain` is replaced with `thiserror`.  Each recipe is a module
and tests are functionally the same as the recipes.

main functions are reduced in size and convenient interfaces are made public.  More
structs show types along the way.  Maybe the rust is more verbose.  See [web] crate
for 2024 examples.

Here is a simple example of using `LazyLock` with `Regex`:

```rust
use std::sync::LazyLock;
use regex::Regex;

static HTML_FILES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\.html$").unwrap()
});
```

[Extracting Links]: https://rust-lang-nursery.github.io/rust-cookbook/web/scraping.html
[inspired]: https://internals.rust-lang.org/t/pre-rfc-lazy-static-move-to-std/7993/37?u=matklad
[web]: https://github.com/rust-lang-nursery/rust-cookbook/tree/master/crates/web
