---
layout: post
section-type: post
title: 'Tracking Rails Main'
category: Rails
tags: [ '' ]
---

Running low on new features to implement, I took to
working on a rails upgrade for On Guard Security Training.

Not just any upgrade, but I set out to track rails main.

_What exactly is rails main, and what is required to
use it?_

Rails main is the master branch of the rails framework,
and some very large organizations are opting into
riding the bleeding edge of rails, much more so recently
than in years past.  Github found themselves on a 
custom fork of rails 3, and [@eileencodes] talks
frequently about this project.  While not as big as
Github, the custom fork of Canvas has complexity 
beyond what I'm even familiar.

## Gemfile
The process begins with a simple gemfile update.  

```
gem 'rails', '6.0.4'
```

We are going from `5.2.3` to `6` leveraging the work
already in place (thus the specific version).  Once
we get from 5.2 to 6, we will go through 6.1, then
to pre-release.

## Bundle
With the gemfile updated, running bundle update
will pick up the latest version of all the dependencies

`bundle install`

I received the following on my mac trying to update:

```bash
Could not find MIME type database in the following locations: ["/usr/local/share/mime/packages/freedesktop.org.xml",
"/opt/homebrew/share/mime/packages/freedesktop.org.xml", "/opt/local/share/mime/packages/freedesktop.org.xml", "/usr/share/mime/packages/freedesktop.org.xml"]

An error occurred while installing mimemagic (0.3.10), and Bundler cannot continue.
Make sure that `gem install mimemagic -v '0.3.10' --source 'https://rubygems.org/'` succeeds before bundling.
```

Locally, this was resolved with `brew install shared-mime-info`
and the servers took `sudo apt-get isntall shared-mime-info`

## app:upgrade
Running the new upgrade script is dangerous.  It will
attempt to overwrite some very important files.  I don't
have good advice for this, because I just said no to
the `.rb` files like `boot.rb` and `initializer.rb` rather
than losing hundreds of lines of configuration.

After booting my app, I got a stack trace that is indecipherable
so to make things worse, I decided to push towards ruby-2.7.0,
which will be required to make main work. 

```bash
rvm install 2.7
rvm use 2.7
bundle install
```

Same stack trace, good enough time to dig in.  Found this
in the stack trace right before a Runtime Error:
`.rvm/gems/ruby-2.7.0/gems/rack-2.0.8/lib/rack/session/abstract/id.rb:31:in 'to_s'`

Checked current rack version, and updated gemfile to 2.2.3. 

Finally got a page load, but is still a 500 error:
`undefined method 'delete' for "8201ea794c9d6a6e2215ec98938b1642":ActionDispatch::Session::CookieStore::SessionId`
Tried the request again in an incognito browser and
same results.  Checking further in the stacktrace,
it was clear middleware injections were causing
the crash, before the app was even loaded.  A change
to migration context ([`ActiveRecord::MigrationContext`])
takes an extra parameter.

After fixing this, another dependency was throwing
the same 1 argument given expected 2, and updating
the dependency allowed the main page to load.  The only
additional thing required to make the main page load
was replacing a `render 'html'` with `render :html`.

## Moving to 6.1

With ruby 2.7 and rails 6.0.4, the next step is to
replace rails 6.0.4 with 6.1.4 and `bundle update`

```bash
    switchman (= 1.14.7) was resolved to 1.14.7, which depends on
      shackles (~> 1.4.2) was resolved to 1.4.2, which depends on
        railties (>= 4.0, < 6.1)

    switchman (= 1.14.7) was resolved to 1.14.7, which depends on
      railties (>= 5.0, < 6.1)

    switchman-inst-jobs (= 1.3.7) was resolved to 1.3.7, which depends on
      railties (>= 4.2, < 6.1)
```

These are very concerning results, because these gems
are produced by the same company who open sourced
the learning platform being used.  `Switchman` for example
provided the database sharding that didn't exist in 
core until 6.1, and there hasn't been good effort in these
gems to move towards 6.1 compatibility.  We aren't using
sharding, so a potential solution is to remove all the
code that allows sharding.  `shackles` has been replaced with
`guardrails` which leans into the 6.1 way of doing things.  

Eventually, the dependencies were found in a way that
would work without having to manually edit the dependency
chain (which will likely be done to get main support)
However, the entire process ended with:

__Unfortunately, an unexpected error occurred, and Bundler cannot continue.__

I've been running on `bundler` 1.17, so maybe its time to
update that.  A [quickstart] for bundler 2 is available.
tl;dr run `bundle update --bundler`.  This didn't do
anything for me, so I updated my Gemfile bundler dependency
to allow the version of the v2 gem (2.2.21) that I had installed
and for good measure wiped the `Gemfile.lock` file.

After replacing many more (especially infrastructure) dependencies
progress became stuck on 
```bash
    academic_benchmarks (= 1.1.1)

    academic_benchmark was resolved to 1.1.0, which depends on
      academic_benchmarks (~> 0.0)
```

Reading the gem README, the gem is used for consuming an
api that will never be used.  Like the sqlite gem, both
are removed from the Gemfile.  Canvas is a big program,
that can be used in many ways, and I'm taking my customizations
to a fuller extent.  `academic_benchmark` turned out to
be a local gem which could be set to allow version `1.1.1` 
of `academic_benchmarks`.  Be careful, they look similar.

Canvas also has many gems included in distribution, and
a lot of these gems use `'~>'` specifications.  To ask
for the potentially breaking semver changes, those are 
replaced with `'>='` definitions.  Sometimes embedded
gemfiles are just commented out, like `googledrive`. There
is little chance of moving from aws to google for storage.

The biggest challenge is that `Shackles` was replaced
with `GuardRail`, so a naive replace all in path was
used.  Then something challenging happened, a 
`ActionView::Template::Error (I18n::ArgumentError)`
occurred inside of a gem. The rails code calling was
`t("some text")` which was aliased in i18n initializer
to `translate()`.  Because `I18n.t("some text")` was
working, the initializer which overrode some behavior
was monkeypatched to catch the `ArgumentError` and
pass through the string sent to translation with:

```ruby
rescue I18n::ArgumentError
  return args.dig(0,:default,0)
end
```

Finally, the homepage would not load the courses 
without giving `GradingPeriod` a more specific binding
to a gem. Luckily RubyMine does a good job
of finding the class of a given method by Command-clicking
on the method.

Canvas adopted sharding early on, somewhere around 2015
by implementing their own Gem for handling writing
to multiple tables/databases to improve performance.
As rails adopted a concept of sharding in 6.1, a lot
of work needs to go into integrating the new concept
of sharding.  At present, `shard_category` is missing
from presumably enrollments, which may assume the 
correct mixin of Switchman is still missing in 
`ActiveRecord::Base`.  The depth of this fix may be
too much to push through in a weekend.  For now,
we will default to the primary shard:

```ruby
    db = if klass.respond_to? :shard_category
           Shard.current(klass.shard_category).database_server
         else
           Shard.current.database_server
         end
```
## Future main
These steps will need to be followed one final time to get
to the main branch, but with all the static dependencies
in this project, creating forks of all the gems will be 
required, which will be even more work.  Update the
`.gemspec` files and point the Gemfile to `gem 'gemname',
git: 'https://github.com/andygauge/gemname'`.

Before proceeding to the rails main branch `gem 'rails',
git: 'https://github.com/rails/rails'`, more conclusive
testing will be required.  It is important to ensure these
major update breaks are resolved before moving to the
next major version.

## More info
See the code on github, at [andygauge/canvas-lms]

## Part 2: actually tracking rails main
[Next] we move from 6.0 to main on a smaller app before undertaking
this major change.

[@eileencodes]: https://eileencodes.com/
[`ActiveRecord::MigrationContext`]: https://www.rubydoc.info/gems/activerecord/ActiveRecord/MigrationContext#initialize-instance_method
[quickstart]: https://bundler.io/guides/bundler_2_upgrade.html
[andygauge/canvas-lms]: https://github.com/AndyGauge/canvas-lms/pull/11
[Next]: https://www.yetanother.site/rails/2021/07/06/Tracking-Rails-Main-Part-2.html