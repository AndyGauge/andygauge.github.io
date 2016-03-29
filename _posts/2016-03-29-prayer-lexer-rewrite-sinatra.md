---
layout: post
section-type: post
title: 'Prayer Lexer - Refactoring Lex with Sinatra'
category: praybook
tags: [ 'prayer' ]
---

Where we have been
------------------

[First](/praybook/2016/03/20/prayer-lexer.html) we created a Rails application to import information from openbible.info topical mashup.  This community driven topic to verse relation revealed a need for a Topic, Verse, and Vote model.  Topics and Verse were `has_many through: :vote` relations.

[Then](/praybook/2016/03/25/prayer-lexer-part-2.html) bayesian classification was used to represent a verse as a classification and prayers were analyzed.  We trained the classifier using the topics, and used rake tasks to update the data with ActiveRecord and CSVImport.

What we learned
---------------

CSV import of 2.5M takes a long time to process, around 20 min on my VM.  Most of the delay is around ActiveRecord, SQLLite, and other Rails bloat.  

Training the classifier was significantly quicker once the data was imported, but took in excess of one minute.  Having an HTTP request waiting for this to happen would time out.  

Using Marshal we can make a snapshot of the classifier, and load it.  The snapshot is around 800K, and takes around 2s to load from disk.

We need to keep an instance of the classifier in memory to have any reasonable response times.  It would be better(TM) to have a non-concurent server with one classifier than to load from disk for every request.

Where are headed
----------------

Ruby is not fast unless the metric is time until code executes (or crashes).  If we want this to be really quick, it should be written in a systems programming language.  The desired outcome is a performant Rust extension that can be embedded in a web application.  

There is no need for the CSV data to be persisted in a database.  The relationship through the votes isn't used to add weight to the classifier.  The documentation for `classifier` indicated the categories were needed upfront, but `classifier-reborn` API includes an auto-categorize option in the [initializer](http://www.rubydoc.info/gems/classifier-reborn/2.0.4/ClassifierReborn%2FBayes%3Ainitialize).

The next version of Lex will convert the CSV file directly into a trained classifier by parsing each line into a call to train.  Once the file is processed, the classifier will be Marshaled, saved to disk.  Most of the import functionality will be replaced, and the web interface will be Sinatra, not Rails.

Removing 99%
------------

I moved the existing work to a separate branch.

    git branch -b rails
    vi README.md
    git commit -a -m "fortune telling"

Then created a new branch for the work moving forward

    git branch -b sinatra
    rm -r *

The title of this section is removing 99% and here I effectively removed 100% since it is easier to go from 100% to 99% than the other way around.  With the clean slate, I began plucking files out of git.

    git checkout lib/importer.rb

References to Rails.root had to be removed.  Extra require statements were necessary at the top, and all the references to the classes thrown out.  Most of the file remained.  The `Importer.perform` and `Importer.train` are stiched together.

    def self.perform
      return false unless data_ok?
      progress = ProgressBar.create(title: 'Crunching', total: data.count)
      data.each do |row|
        classifier.train(row[1], row[0])
        progress.increment
      end
      classifier_snapshot = Marshal.dump classifier
      File.open(snapshot, "wb") {|file| file.write(classifier_snapshot) }
      true
    end  

Instead of `Verse.id` as the classifications, `Verse.slug` is used.  The Rake file needed some work as well because the rake system inside Rails and the rake gem as shipped are used dramatically different.

The Gemfile was stripped to include only 4 lines, resulting in 5 gems installed.  The Rakefile actually calls ruby from the command line as:

    task :default => [:import]

    task :import do
      ruby 'import.rb'
    end 

The import file, which is even simpler:

    require './lib/importer'
    Importer.perform

The result is around 120X faster performance.

Classifying Prayers
-------------------

Using irb rather than rails c is nearly identical to before:

    irb
    > require './lib/importer'
    => true
    > Importer.classifier.classify "Praise and adoration to the King."
    => "1909903"

But wait!  The slugs are hard to read.  What shall we ever do?  Our Biblical module would sure help here.  Move the file to the lib directory and remove all the `ActiveSupport:Concern`-ness.  I renamed the method biblical_books to self.books because Biblical.books is a better name.  Now in lib/importer.rb:

    require './lib/biblical.rb'

Strange enough, despite importer.rb and biblical.rb being in the same directory, the way require works, files required are not relative to themselves, but the point of entry for the ruby process.  

The same logic for slicing the slug can be used here, for now it is still in Importer, as self.lex:

    def self.lex(prayer)
      slug = classifier.classify prayer
      "#{Biblical.books[slug[0..1].to_i]} #{slug[2..4].to_i}:#{slug[5..7].to_i}"
    end

Command Line Support
--------------------

Finally, we need to make it really easy to just run from the command line.  In the root of the application, I created a file named lex.rb which contains:

    require './lib/importer'
    puts Importer.lex ARGV[0]

This passes the arguments sent from the command line, called as `ruby lex.rb "Jesus help me"` which returns 

    John 13:5

The only thing easier would be to compile a binary.  

The Unrailed version of prayer-lexer, a.k.a lex can be found on [AndyGauge/prayer-lexer/tree/sinatra](https://github.com/AndyGauge/prayer-lexer/tree/sinatra)