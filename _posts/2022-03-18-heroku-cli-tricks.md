---
layout: post
section-type: post
title: Bonsai! scripting with heroku-cli
category: ElasticSearch
tags: [ '' ]
---

While upgrading to Elastic Search 7 we needed to upgrade our heroku environments.  We manage
multiple heroku environments for each of our teams, and manually updating each environment
is prone to errors and can be tedious.  We deploy and set environment variables is this scripting
exercise.

Uses `awk`, `grep`, `ruby` and compares some of the string manipulation of each

```
heroku addons --all | awk ' /bonsai:standard-sm/ {print $1}' | while read line
heroku addons:create bonsai:standard-sm --app=$line --version=7.10
```

Wherever we were paying for Elastic create an addon of the modern version.

After the addons are deployed, they report as environment variables to the app.
All of our `BONSAI_URL` values were set to Elastic version 6.8 and our app is currently
dual writing on 6 and 7.  We need all the BONSAI_CREEPY_COLOR_CHOICES values to tell
our app where to start duplicate writing.


During this process I created some scripts mixing shell scripting and interweaving
ruby using `-e`

```
heroku config --app=my-app |
 ruby -e "puts ARGF.map { |line| @app=(match = line.match(/([a-z0-9-]+) Config Vars/)) ? match[1] : @app; line.match(/BONSAI_([^U]+)_URL/) ? \"#{@app} #{line.match(/https:.*/)[0]}\" : nil}.reject(&:nil?).sort.uniq" |
 awk {'printf "heroku config:set ELASTICSEARCH_URL7=%s --app=%s", $2, $1'} | sh
```

I need to set an ENV for each one, so I'm extracting the new Bonsai environments I created
and setting an app environment variable.  The nice thing about heroku is you can set your
variable to the value of another variable

```
ARGF.map do |line|
  @app=
    (match = line.match(/([a-z0-9-]+) Config Vars/))
      ? match[1]
      : @app
  line.match(/BONSAI_([^U]+)_URL/)
    ? \"#{@app} #{line.match(/https:.*/)[0]}\"
    : nil
    .reject(&:nil?)
    .sort
    .uniq
```
In this block we are going through the lines of greped output of `heroku config` scoped to a single app
The first line we parse is a comment that we pull the app name out of.  Interesting feature of ruby here
is the instance variable usage for `@app`.  Without the `@` app is scoped to the block (a single line of
the `config` output.  We set @app using these comments to `heroku config:set`.

On lines that are comments, we set @app and on lines which contain our ENV connection string we return a space
separated `app connection_string`.

```
 awk {'printf "heroku config:set ELASTICSEARCH_URL7=%s --app=%s", $2, $1'}
```

converts each of those pairs into a command that will be passed to `sh`

```
heroku config:set ELASTICSEARCH_URL7=connection_string --app=app
```

Now if we only all of the deployed instances shared a color maybe this could be easier?


