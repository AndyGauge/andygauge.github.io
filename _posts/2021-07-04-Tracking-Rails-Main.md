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

The extent of gem manipulation to get a valid bundle can
be seen in this diff:

### Gemfile Diff
```diff
-gem 'bundler', '>= 1.13.3', '<= 2.1.4'
+gem 'bundler', '>= 1.13.3'
-  gem 'rails', '5.2.3'
+  gem 'rails', '6.1.4'
-gem 'rack', '2.0.8'
+gem 'rack', '2.2.3'
-gem 'oauth2', '1.4.2', require: false
+gem 'oauth2', '>= 1.4.2', require: false
-gem 'tzinfo', '1.2.5'
+gem 'tzinfo', '~> 2.0', '>= 2.0.4'
-gem 'encrypted_cookie_store-instructure', '1.2.9', require: 'encrypted_cookie_store'
+gem 'encrypted_cookie_store-instructure', '1.2.11', require: 'encrypted_cookie_store'
-gem 'authlogic', '5.0.4'
-  gem 'scrypt', '3.0.7'
+gem 'authlogic', '~> 6.4', '>= 6.4.1'
+gem 'scrypt', '3.0.7'
-gem 'switchman', '1.14.7'
-  gem 'open4', '1.3.4', require: false
+gem 'switchman', '~> 3.0', '>= 3.0.5'
+gem 'open4', '1.3.4', require: false
-  gem 'will_paginate', '3.1.7', require: false
-
-gem 'addressable', '2.7.0', require: false
-gem "after_transaction_commit", '2.0.0'
-gem "aws-sdk-dynamodb", "1.36.0"
-gem "aws-sdk-kinesis", '1.19.0', require: false
-gem "aws-sdk-s3", '1.48.0', require: false
-gem "aws-sdk-sns", '1.19.0', require: false
-gem "aws-sdk-sqs", '1.22.0', require: false
-gem "aws-sdk-core", "3.68.1", require: false
-  gem "aws-partitions", "1.238.0", require: false # pinning transient dependency
-gem "aws-sdk-kms", "1.24.0", require: false
-gem "aws-sigv4", "1.1.0", require: false
+  gem 'will_paginate', '3.3.0', require: false
+
+gem 'addressable', '>= 2.7.0', require: false
+gem "after_transaction_commit", '>= 2.0.0'
+gem "aws-sdk-dynamodb", ">= 1.36.0"
+gem "aws-sdk-kinesis", '>= 1.19.0', require: false
+gem "aws-sdk-s3", '>= 1.48.0', require: false
+gem "aws-sdk-sns", '>= 1.19.0', require: false
+gem "aws-sdk-sqs", '>= 1.22.0', require: false
+gem "aws-sdk-core", ">= 3.68.1", require: false
+  gem "aws-partitions", ">= 1.238.0", require: false # pinning transient dependency
+gem "aws-sdk-kms", ">= 1.24.0", require: false
+gem "aws-sigv4", ">= 1.1.0", require: false
-  gem 'chunky_png', '1.3.11', require: false
+  gem 'chunky_png', '>= 1.3.11', require: false
-  gem 'adobe_connect', '1.0.8', require: false
+  gem 'adobe_connect', '>= 1.0.8', require: false
-gem 'inst-jobs', '0.15.14'
-  gem 'fugit', '1.3.3', require: false
+gem 'inst-jobs', '~> 2.3', '>= 2.3.1'
+  gem 'fugit', '>= 1.3.3', require: false
-gem 'switchman-inst-jobs', '1.3.7'
-gem 'inst-jobs-autoscaling', '1.0.5'
-  gem 'aws-sdk-autoscaling', '1.28.0', require: false
-gem 'ffi', '1.11.1', require: false
+gem 'switchman-inst-jobs', '~> 4.0'
+gem 'inst-jobs-autoscaling', '>= 1.0.5'
+  gem 'aws-sdk-autoscaling', '>= 1.28.0', require: false
+gem 'ffi', '>= 1.11.1', require: false
-gem 'httparty', '0.17.1'
-gem 'i18n', '1.0.0'
-gem 'i18nliner', '0.1.1'
+gem 'httparty', '0.18.1'
+gem 'i18n', '>= 1.6.0'
+gem 'i18nliner', '>= 0.1.1'
-  gem 'ruby_parser', '3.14.0', require: false
+#gem 'ruby_parser', '3.14.0', require: false
-gem 'ims-lti', '2.3.0', require: 'ims'
-gem 'json_schemer', '0.2.7'
+gem 'ims-lti', '>= 2.3.0', require: 'ims'
+gem 'json_schemer', '0.2.18'
-gem 'json', '2.3.0'
+gem 'json', '>= 2.3.0'
-gem 'json-jwt', '1.10.2', require: false
-gem 'twilio-ruby', '5.27.1', require: false
+gem 'json-jwt', '>= 1.10.2', require: false
+gem 'twilio-ruby', '>= 5.27.1', require: false
-  gem 'mini_mime', '1.0.2', require: false
+  gem 'mini_mime', '1.1', require: false
-gem 'mime-types', '3.3.0'
+gem 'mime-types', '>= 3.3.0'
-gem 'multi_json', '1.13.1'
-gem 'nokogiri', '1.10.4', require: false
-gem 'oauth', '0.5.4', require: false
-gem 'parallel', '1.18.0', require: false
+gem 'multi_json', '>= 1.13.1'
+gem 'nokogiri', '>= 1.11', require: false
+gem 'oauth', '>= 0.5.4', require: false
+gem 'parallel', '~> 1.20', '>= 1.20.1', require: false
-gem 'rake', '12.3.1'
-gem 'ratom-nokogiri', '0.10.8', require: false
+gem 'rake', '>= 12.3.1'
+gem 'ratom-nokogiri', '>= 0.10.10', require: false
-gem 'saml2', '3.0.8'
-  gem 'nokogiri-xmlsec-instructure', '0.9.7', require: false
+gem 'saml2', '~> 3.0', '>= 3.0.11'
+  gem 'nokogiri-xmlsec-instructure', '0.10.1', require: false
-gem 'rubyzip', '1.2.2', require: 'zip'
+#gem 'rubyzip', '1.2.2', require: 'zip'
-gem 'shackles', '1.4.2'
-
+#gem 'shackles', '1.4.2'
+gem 'guardrail',' ~> 3.0.0'
-gem 'sentry-raven', '2.11.3', require: false
-gem 'inst_statsd', '2.1.6'
+gem 'sentry-raven', '>= 2.11.3', require: false
+gem 'inst_statsd', '>= 2.1.6'
   gem 'statsd-ruby', '1.4.0', require: false
-  gem 'aroi', '0.0.7', require: false
-  gem 'dogstatsd-ruby', '4.5.0'
-gem 'inst-jobs-statsd', '1.2.3'
-gem 'gepub', '1.0.4'
+  gem 'aroi', '>= 0.0.7', require: false
+  gem 'dogstatsd-ruby', '>= 4.5.0'
+gem 'inst-jobs-statsd', '~> 2.1', '>= 2.1.1'
+gem 'gepub', '>= 1.0.4'
-gem 'academic_benchmarks', '0.0.11', require: false
+#gem 'academic_benchmarks', '1.1.1', require: false
-gem 'graphql', '1.9.17'
+gem 'graphql', '>= 1.9.17'
-gem 'redcarpet', '3.5.0', require: false
-gem 'rack-test', '0.8.3'
+gem 'redcarpet', '>= 3.5.0', require: false
+gem 'rack-test', '>= 0.8.3'
-gem 'google_drive', path: 'gems/google_drive'
+#gem 'google_drive', path: 'gems/google_drive'
-    gem 'mustache', '1.1.0', require: false
-    gem 'pygments.rb', '1.2.1', require: false
+    gem 'mustache', '>= 1.1.0', require: false
+    gem 'pygments.rb', '>= 1.2.1', require: false
-  gem 'spring', '2.1.0'
+  gem 'spring', '2.1.1'
-  gem 'pg', '1.1.4'
+  gem 'pg', '>= 1.1.4'
-  gem 'redis', '4.1.3'
-  gem 'redis-scripting', '1.0.1'
+  gem 'redis', '>= 4.1.3'
+  gem 'redis-scripting', '>= 1.0.1'
-  gem 'digest-murmurhash', '1.1.1'
+  gem 'digest-murmurhash', '>= 1.1.1'
-  gem 'sqlite3', '1.4.1'
+  #gem 'sqlite3', '1.4.1'
-  gem 'dotenv', '2.7.5', require: false
+  gem 'dotenv', '2.7.6', require: false
-  gem 'simplecov', '0.15.1', require: false
-    gem 'docile', '1.1.5', require: false
+  gem 'simplecov', '~> 0.21', require: false
+    gem 'docile', '>= 1.1.5', require: false
-  gem 'puma', '4.2.1'
+  gem 'puma', '5.3.2'
-  gem 'rspec', '3.9.0'
+  gem 'rspec', '>= 3.10.0'
-  gem 'rspec-rails', '3.9.0'
-  gem 'rspec-collection_matchers', '1.2.0'
-  gem 'rspec-support', '3.9.0'
-  gem 'rspec-expectations', '3.9.0'
-  gem 'rspec-mocks', '3.9.0'
-  gem 'shoulda-matchers', '4.1.2'
+  gem 'rspec-rails', '>= 5.0'
+  gem 'rspec-collection_matchers', '>= 1.2.0'
+  gem 'rspec-support', '>= 3.10.0'
+  gem 'rspec-expectations', '>= 3.10.0'
+  gem 'rspec-mocks', '>= 3.10.0'
+  gem 'shoulda-matchers', '>= 4.1.2'
-    gem 'rubocop', '0.52.1', require: false
+  #gem 'rubocop', '0.52.1', require: false
-  gem 'rubocop-rspec', '1.22.2', require: false
+  #gem 'rubocop-rspec', '1.22.2', require: false
-  gem 'sauce_whisk', '0.1.0'
+  gem 'sauce_whisk', '>= 0.1.0'
-  gem 'selenium-webdriver', '3.141.5926'
-    gem 'childprocess', '1.0.1', require: false
-  gem 'webdrivers', '~> 4.0', require: false
+  gem 'selenium-webdriver', '3.142.7'
+    gem 'childprocess', '>= 1.0.1', require: false
+  gem 'webdrivers', '~> 4.6', require: false
-    gem 'crack', '0.4.3', require: false
+    gem 'crack', '>= 0.4.3', require: false
-  gem 'pact', '1.24.0'
+  gem 'pact', '1.57.0'
```

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

[@eileencodes]: https://eileencodes.com/
[`ActiveRecord::MigrationContext`]: https://www.rubydoc.info/gems/activerecord/ActiveRecord/MigrationContext#initialize-instance_method
[quickstart]: https://bundler.io/guides/bundler_2_upgrade.html
[andygauge/canvas-lms]: https://github.com/AndyGauge/canvas-lms/pull/11