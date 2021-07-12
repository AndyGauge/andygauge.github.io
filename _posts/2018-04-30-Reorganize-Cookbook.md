---
layout: post
section-type: post
title: Rust Cookbook Reorganization
category: Rust
tags: [ 'mdbook']
---

In April, I took on a role of collaborator on [The Rust Cookbook].  The Cookbook is a collection of examples that demonstrate some of the crate ecosystem with real world examples.  

A long-standing issue of the Cookbook is the navigation.  A year ago, the cookbook was launched and some of the sparse categories were consolidated into the Basics section.  Over the last year, a total of 66 people have come together to develop the cookbook into a reference.  Basic has ballooned to 35 recipes.  Finding a topic has turned into a chore.

Less than a month after shipping, Brian opened the first [issue] detailing the problem.

> it's not easy to organize examples into sections, to decide what the appropriate sections are, and which one section to assign any example to

It was a loss to the ecosystem when Brian left Mozilla.  It was his guidance that led me through the Lib Blitz and the Rust Cookbook.  Aaron Turon has taken on oversight of the Cookbook, which is a drop in the ocean of the Library team's responsibility.

> The goal would be to grow toward a 1:1 correspondence between categories and sections in the cookbook

At the time of the reorganization, the SUMMARY.md file looked like this:

```
# Summary

[Table of Contents](intro.md)
[About](about.md)

- [Basics](basics.md)
- [Encoding](encoding.md)
- [Concurrency](concurrency.md)
- [Networking](net.md)
- [Application development](app.md)
- [Logging](logging.md)
- [Build Time Tooling](build_tools.md)
```

The Rust Cookbook was a very flat structure, with most of the content in the files above.  There was a file that contained all the crate badges, categories, and some links.  That file, `links.md` was included at the end of each of the files above.

After a weekend of hacking, the SUMMARY had grown, the following sections prepended

```
- [Algorithms](algorithms.md)
  - [Generate Random Values](algorithms/randomness.md)
- [Command Line](cli.md)
  - [Argument Parsing](cli/arguments.md)
- [Compression](compression.md)
  - [Working with Tarballs](compression/tar.md)
- [Concurrency](concurrency.md)
  - [Threads](concurrency/threads.md)
  - [Parallel Tasks](concurrency/parallel.md)
- [Cryptography](cryptography.md)
  - [Hashing](cryptography/hashing.md)
  - [Encryption](cryptography/encryption.md)
  ```

All was well, until the table of contents was updated.  The `intro.md`  file was split into each of the top level files, `algorithms.md`, `cli.md`, such that including them into the `intro.md` file made sense.  This would simplify the addition of recipes to the given categories.

Unfortunately, the mdBook preprocessor inserted the contents of the included file without further examining the content.  The Cookbook's table of contents was separated by `include` definitions.  Tacky.

### mdBook

[mdBook] works as the backend of the Cookbook.  It takes the markdown files, and parses them into an html site, complete with navigation.  Recently, mdBook implement the include link preprocessing outlined above.  

The [`replace_all` function] could easily be modified to call itself with the content from the loaded file like this:

```
fn replace_all<P: AsRef<Path>>(s: &str, path: P) -> String {
    // When replacing one thing in a string by something with a different length,
    // the indices after that will not correspond,
    // we therefore have to store the difference to correct this
    let path = path.as_ref();
    let mut previous_end_index = 0;
    let mut replaced = String::new();

    for playpen in find_links(s) {
        replaced.push_str(&s[previous_end_index..playpen.start_index]);

        match playpen.render_with_path(&path) {
            Ok(new_content) => {
                replaced.push_str(&replace_all(&new_content));
                previous_end_index = playpen.end_index;
            }
            Err(e) => {
                error!("Error updating \"{}\", {}", playpen.link_text, e);
                // This should make sure we include the raw snippet
                // in the page content if there are any errors.
                previous_end_index = playpen.start_index;
            }
        }
    }

    replaced.push_str(&s[previous_end_index..]);
    replaced
}
```

Who knew what I was in for over that `&replace_all(`.

### Code Quality

> Hold yourself responsible for a higher standard than anybody expects of you. Never excuse yourself.
> - Henry Ward Beecher

What could go wrong with a simple 13 character PR?  Well, it is pretty easy to create stack too deep errors.  There currently is 2000 results on stackoverflow.com, a site named for stack too deep errors.  So what would we need to do to fix an exception when  infinite recursion occurs?

[Stacker] seemed like the perfect solution, but even when checking if the remaining stack was greater than 2000, the same exception occurred.  I had to implement my own max depth.

`fn replace_all<P: AsRef<Path>>(s: &str, path: P, source: &P, depth: usize) -> String {`

I need the file that called replace_all if I want to inform the user where their error came from.  The calling method sends a directory path, which provided the reference for the included file.

```
if depth < MAX_LINK_NESTED_DEPTH {
    replaced.push_str(&replace_all(&new_content, path, &source, depth + 1));
    previous_end_index = playpen.end_index;
    }
    else {
        error!("Stack depth exceeded in {}. Check for cyclic includes",
              source.display());
    }
}
```

Now we can increment the depth and make sure we don't reach a reasonable amount before triggering an error in the console, with a great place to look.  

What else could we need?

### Tests!

mdBook tests involve processing an example book, so let's add a chapter to it and verify the existing tests pass.

They don't!  Adding a chapter required modifying 4 tests.  Once the tests passed, I could write a simple test making sure my recursive chapter actually builds, and repeats itself:

```
#[test]
fn recursive_includes_are_capped() {
    let temp = DummyBook::new().build().unwrap();
    let md = MDBook::load(temp.path()).unwrap();
    md.build().unwrap();

    let recursive = temp.path().join("book/first/recursive.html");
    let content = &["Around the world, around the world
Around the world, around the world
Around the world, around the world"];
    assert_contains_strings(&recursive, content);
}
```
Credit to [Daft Punk] for the excellent real world example of recursion.  

### Relative Paths

This code change worked for exactly 1 commit.  With this in hand, I was ready to deepen the implementation, and provide a subsection in the latest chapter.  This series would be summarized in a mini-contents, and that mini-contents included in the chapter, then included in the Table of Contents.

Up until now, all included content had been in the same directory.  By included a file within a different directory, the preprocessor no longer could find that file's includes.

```
replaced.push_str(&replace_all(&new_content, path, &source, depth + 1));
```

By passing the path onto the method call, the base path of the included file remains the original file, not the second nested file.

```
impl<'a> LinkType<'a> {
    fn relative_path<P: AsRef<Path>>(self, base: P) -> Option<PathBuf> {
        let base = base.as_ref();
        match self {
            LinkType::Escaped => None,
            LinkType::IncludeRange(p, _) => Some(return_relative_path(base, &p)),
            LinkType::IncludeRangeFrom(p, _) => Some(return_relative_path(base, &p)),
            LinkType::IncludeRangeTo(p, _) => Some(return_relative_path(base, &p)),
            LinkType::IncludeRangeFull(p, _) => Some(return_relative_path(base, &p)),
            LinkType::Playpen(p,_) => Some(return_relative_path(base, &p))
        }
    }
}
fn return_relative_path<P: AsRef<Path>>(base: P, relative: P) -> PathBuf {
    base.as_ref()
        .join(relative)
        .parent()
        .expect("Included file should not be /")
        .to_path_buf()
}
```

In this enum method, we return the parent, or directory containing, the file by joining the original path, with the path of the included file.

```
if let Some(rel_path) = playpen.link.relative_path(path) {
      replaced.push_str(&replace_all(&new_content, rel_path, &source.to_path_buf(), depth + 1));
}
```

Now we can safely retrieve the relative path, and pass that to the replace_all function.

### Next Steps

The Rust Cookbook will be split into shorter sections and to get there it will require a new version of mdBook to look correct.  Check it out here:

[www.yetanother.site/rust-cookbook]

[The Rust Cookbook]: https://github.com/rust-lang-nursery/rust-cookbook
[issue]: https://github.com/rust-lang-nursery/rust-cookbook/issues/167
[mdBook]: https://github.com/rust-lang-nursery/mdBook
[`replace_all` function]: https://github.com/rust-lang-nursery/mdBook/blob/master/src/preprocess/links.rs#L48-L75
[Stacker]: https://github.com/alexcrichton/stacker/issues/2
[Daft Punk]: https://genius.com/Daft-punk-around-the-world-lyrics
[www.yetanother.site/rust-cookbook]: http://www.yetanother.site/rust-cookbook
