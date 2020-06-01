---
layout: post
section-type: post
title: 'Rust Cookbook Reach 2018'
category: Rust
tags: [ '' ]
---

The [Rust Cookbook] reached a major milestone today.  The 2015 
version syntax has been replaced by the 2018 syntax.  
But what has changed?

In 2015 (and earlier) Rust would use the syntax `extern crate` to
make accessible the external libraries that `Cargo.toml` would
tell the `cargo` compilier to download and compile.  2018 syntax
simplified that process by removing this requirement.

Big shout out to [pickfire] for automating the changes required
to all the recipes.  Here's a peek at what he used:
```bash
sed -i '/extern crate/ {N;s/\n$//}' src/**.md; sed -i 's/extern crate error_chain;/use error_chain::error_chain;/; s/extern crate lazy_static;/use lazy_static::lazy_static;/; s/extern crate bitflags;/use bitflags::bitflags;/; s/extern crate serde_json;/ use serde_json::json;/; s/extern crate serde_derive;/use serde::{Serialize, Deserialize};/; /macro_use/d; /extern crate/ d; s/```rust/```rust,edition2018/; s/bail!/error_chain::&/; s/\(debug\|info\|warn\|error\)!/log::&/;' src/**.md
```

To specify the 2018 version, `Cargo.toml` includes the line
`edition = "2018"`

Aditionally, we use [mdbook] for our examples.  The source code
for Rust Cookbook is actually `md` files with inline code recipes
between sets of \`\`\` code blocks.  In order to specify within
each of those info strings that the 2018 version should be used.
These specifications come from [skeptic].  The final info string
ends up looking like \`\`\`rust,edition2018

### What we uncovered

While attempting to update to 2018, our error handling library,
`error-chain` was throwing errors like it wasn't compatible with
the 2018 version.  However, the [changelog] indicates error-chain
is indeed updated for 2018 syntax.  

Builds were completing successfully on macintosh but not on
Linux.  By using [`cargo tree`] it was uncovered that
error-chain version 0.11 was indeed included in the dependency
tree in Linux and not in Macintosh due to the following lines
in our `Cargo.toml`:

```toml
[target.'cfg(target_os = "linux")'.dependencies]
syslog = "4.0"
```

Rust touts its ability to allow multiple versions of crates
to fall into the dependency tree, but in this case, upgrading
the `syslog` dependency to 5.0 solved our test failures.  Maybe
Rust's dependency graph can cause certain use cases to fail
to find the right library.

[Rust Cookbook]: https://rust-lang-nursery.github.io/rust-cookbook/
[pickfire]: https://github.com/pickfire
[mdbook]: https://github.com/rust-lang/mdBook
[skeptic]: https://github.com/budziq/rust-skeptic
[changelog]: https://github.com/rust-lang-nursery/error-chain/blob/master/CHANGELOG.md
[`cargo tree`]: https://github.com/sfackler/cargo-tree